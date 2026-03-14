import type { DashboardConfig } from './types';
import { getGcpProjectId } from '../../client/shared/lib/runtimeConfig';

const projectId = getGcpProjectId();

// SQL uses "umami_views" as canonical dataset name.
// index.ts rewrites these to the configured BQ_VIEWS_DATASET/BQ_EVENT_TABLE at runtime.
const e = `\`${projectId}.umami_views.event\``;

export const team1Dashboard: DashboardConfig = {
  title: "Team 1: Trafikk og innhold",
  description: "Dashbord for trafikk- og innholdsanalyse. Se hvilke sider som besøkes mest, og hvor besøkende kommer fra.",
  charts: [
    {
      title: "Besøk over tid",
      type: "line",
      width: '60',
      sql: `SELECT
  DATE(created_at, 'Europe/Oslo') AS dato,
  COUNT(DISTINCT session_id) AS Unike_besokende
FROM ${e}
WHERE website_id = '{{website_id}}'
AND event_type = 1
AND url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY dato
ORDER BY dato ASC
LIMIT 1000`
    },
    {
      title: "Topp sider besøkt",
      type: "table",
      width: '40',
      showTotal: true,
      sql: `SELECT
  COUNT(DISTINCT session_id) AS Unike_besokende,
  url_path
FROM ${e}
WHERE website_id = '{{website_id}}'
AND event_type = 1
AND url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY url_path

UNION ALL

SELECT
  COUNT(DISTINCT session_id) AS Unike_besokende,
  '__TOTAL__' AS url_path
FROM ${e}
WHERE website_id = '{{website_id}}'
AND event_type = 1
AND url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]

ORDER BY 1 DESC
LIMIT 1001`
    },
    {
      title: "Trafikkkilder",
      type: "title",
      width: '100'
    },
    {
      title: "Eksterne trafikkkilder",
      type: "table",
      width: '50',
      sql: `SELECT
  COUNT(DISTINCT session_id) AS Unike_besokende,
  referrer_domain
FROM ${e}
WHERE website_id = '{{website_id}}'
AND event_type = 1
AND url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY referrer_domain
ORDER BY 1 DESC
LIMIT 50`
    },
    {
      title: "Interne trafikkkilder",
      type: "table",
      width: '50',
      sql: `SELECT
  COUNT(DISTINCT session_id) AS Unike_besokende,
  referrer_path
FROM ${e}
WHERE website_id = '{{website_id}}'
AND event_type = 1
AND url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY referrer_path
ORDER BY 1 DESC
LIMIT 50`
    },
    {
      title: "Navigasjon",
      type: "title",
      width: '100'
    },
    {
      title: "Neste side besøkende går til",
      type: "table",
      width: '100',
      sql: `WITH base_query AS (
  SELECT
    session_id,
    url_path,
    created_at,
    LEAD(url_path) OVER (
      PARTITION BY session_id
      ORDER BY created_at
    ) AS next_page
  FROM ${e}
  WHERE website_id = '{{website_id}}'
  AND event_type = 1
  [[AND {{created_at}} ]]
)

SELECT
  COALESCE(next_page, '(Forlot siden)') AS Neste_side,
  COUNT(DISTINCT session_id) AS Unike_besokende
FROM base_query
WHERE url_path = [[ {{url_sti}} --]] '/'
GROUP BY next_page
ORDER BY Unike_besokende DESC
LIMIT 1000`
    }
  ]
};
