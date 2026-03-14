import type { DashboardConfig } from './types';
import { getGcpProjectId } from '../../client/shared/lib/runtimeConfig';

const projectId = getGcpProjectId();

// SQL uses "umami_views" as canonical dataset name.
// index.ts rewrites these to the configured BQ_VIEWS_DATASET/BQ_EVENT_TABLE at runtime.
const e = `\`${projectId}.umami_views.event\``;
const s = `\`${projectId}.umami_views.session\``;

export const team2Dashboard: DashboardConfig = {
  title: "Team 2: Hendelser og brukere",
  description: "Dashbord for hendelses- og brukeranalyse. Se hvilke hendelser som trigges og hvem besøkende er.",
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
      title: "Hendelser",
      type: "table",
      width: '40',
      sql: `SELECT
  event_name,
  COUNT(DISTINCT session_id) AS Unike_sesjonene
FROM ${e}
WHERE website_id = '{{website_id}}'
AND event_type = 2
AND event_name IS NOT NULL
AND url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY event_name
ORDER BY 2 DESC
LIMIT 1000`
    },
    {
      title: "Geografi og teknologi",
      type: "title",
      width: '100'
    },
    {
      title: "Besøk gruppert på land",
      type: "table",
      width: '33',
      sql: `SELECT
  ${s}.country,
  COUNT(DISTINCT ${e}.session_id) AS Unike_besokende
FROM ${e}
LEFT JOIN ${s} ON ${e}.session_id = ${s}.session_id
WHERE ${e}.website_id = '{{website_id}}'
AND ${e}.event_type = 1
AND ${e}.url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY ${s}.country
ORDER BY 2 DESC
LIMIT 100`
    },
    {
      title: "Besøk gruppert på nettleser",
      type: "table",
      width: '33',
      sql: `SELECT
  ${s}.browser,
  COUNT(DISTINCT ${e}.session_id) AS Unike_besokende
FROM ${e}
LEFT JOIN ${s} ON ${e}.session_id = ${s}.session_id
WHERE ${e}.website_id = '{{website_id}}'
AND ${e}.event_type = 1
AND ${e}.url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY ${s}.browser
ORDER BY 2 DESC
LIMIT 100`
    },
    {
      title: "Besøk gruppert på enhet",
      type: "table",
      width: '33',
      sql: `SELECT
  ${s}.device,
  COUNT(DISTINCT ${e}.session_id) AS Unike_besokende
FROM ${e}
LEFT JOIN ${s} ON ${e}.session_id = ${s}.session_id
WHERE ${e}.website_id = '{{website_id}}'
AND ${e}.event_type = 1
AND ${s}.device NOT LIKE '%x%'
AND ${e}.url_path = [[ {{url_sti}} --]] '/'
[[AND {{created_at}} ]]
GROUP BY ${s}.device
ORDER BY 2 DESC
LIMIT 100`
    }
  ]
};
