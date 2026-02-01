import { DashboardConfig } from './types';
import navkontorData from '../navkontor.json';

export const fylkeskontorDashboard: DashboardConfig = {
  title: "Webstatistikk for Fylkeskontor",

  // Hide the website picker and URL-sti filter (they work behind the scenes)
  hiddenFilters: {
    website: true,
    urlPath: true
  },

  // Default to nav.no website and starts-with operator
  defaultFilterValues: {
    websiteId: '35abb2b7-3f97-42ce-931b-cf547d40d967', // nav.no
    pathOperator: 'starts-with'
  },

  // Message to show when required filter is not selected
  customFilterRequiredMessage: "Velg et kontor for å vise webstatistikk.",

  // Only show these metric types in the Visning filter (hide 'proportion'/andel)
  metricTypeOptions: ['visitors', 'pageviews'],

  // Custom Nav fylkeskontor filter
  customFilters: [
    {
      id: 'navkontor',
      label: 'Fylkeskontor',
      type: 'select',
      appliesTo: 'urlPath',
      pathOperator: 'starts-with',
      required: true,
      urlParam: 'kontor',
      options: navkontorData.map(kontor => ({
        label: kontor.region,
        value: kontor.path,
        // Extract slug from path (e.g., "/no/lokalt/oslo" -> "oslo")
        slug: kontor.path.split('/').pop(),
        // Siteimprove group ID for group-level scoring
        siteimprove_groupid: kontor.siteimprove_groupid
      }))
    }
  ],

  charts: [
    {
      title: "Siteimprove",
      type: "siteimprove",
      width: '100',
      siteimprove_id: '21766831756',
      siteimprove_portal_id: '1002489'
    },
    {
      title: "Besøk over tid",
      type: "line",
      width: '60',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  FORMAT_TIMESTAMP('%Y-%m-%d', base_query.created_at) AS dato,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
GROUP BY
  dato
ORDER BY dato ASC
LIMIT 1000`
    },
    {
      title: "Besøk gruppert på sider",
      type: "table",
      width: '40',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  COUNT(DISTINCT base_query.session_id) as Unike_besokende,
  base_query.url_path
FROM base_query
GROUP BY
  base_query.url_path
ORDER BY 1 DESC
LIMIT 1000

`
    },
    {
      title: "Trafikk til siden",
      type: "title",
      width: '100'
    },
    {
      title: "Eksterne nettsider besøkende kommer fra",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  COUNT(DISTINCT base_query.session_id) as Unike_besokende,
  base_query.referrer_domain
FROM base_query
GROUP BY
  base_query.referrer_domain
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    },
    {
      title: "Interne sider besøkende kommer fra",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  COUNT(DISTINCT base_query.session_id) as Unike_besokende,
  base_query.referrer_path
FROM base_query
GROUP BY
  base_query.referrer_path
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    },
    {
      title: "Aktiviteter",
      type: "title",
      width: '100'
    },
    {
      title: "Besøk gruppert på hendelser",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 2
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_name IS NOT NULL
)

SELECT
  base_query.event_name,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
GROUP BY
  base_query.event_name
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    },
    {
      title: "Hvor besøkende går videre",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.session_id,
    \`fagtorsdag-prod-81a6.umami_student.event\`.url_path,
    \`fagtorsdag-prod-81a6.umami_student.event\`.created_at,
    LEAD(\`fagtorsdag-prod-81a6.umami_student.event\`.url_path) OVER (
      PARTITION BY \`fagtorsdag-prod-81a6.umami_student.event\`.session_id 
      ORDER BY \`fagtorsdag-prod-81a6.umami_student.event\`.created_at
    ) AS next_page
  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  [[AND {{created_at}} ]]
)

SELECT
  COALESCE(next_page, '(Forlot siden)') AS Neste_side,
  COUNT(DISTINCT session_id) as Unike_besokende
FROM base_query
WHERE url_path = [[ {{url_sti}} --]] '/'
GROUP BY
  next_page
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    },
    {
      title: "Geografi og språk",
      type: "title",
      width: '100'
    },
    {
      title: "Besøk gruppert på land",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*,
    \`team-researchops-prod-01d6.umami.public_session\`.country  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  LEFT JOIN \`team-researchops-prod-01d6.umami.public_session\`
    ON \`fagtorsdag-prod-81a6.umami_student.event\`.session_id = \`team-researchops-prod-01d6.umami.public_session\`.session_id
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  base_query.country,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
GROUP BY
  base_query.country
ORDER BY Unike_besokende DESC
LIMIT 1000

`
    },
    {
      title: "Besøk gruppert på språk",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*,
    \`team-researchops-prod-01d6.umami.public_session\`.language  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  LEFT JOIN \`team-researchops-prod-01d6.umami.public_session\`
    ON \`fagtorsdag-prod-81a6.umami_student.event\`.session_id = \`team-researchops-prod-01d6.umami.public_session\`.session_id
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  base_query.language,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
GROUP BY
  base_query.language
ORDER BY Unike_besokende DESC
LIMIT 1000

`
    },
    {
      title: "Enhet",
      type: "title",
      width: '100'
    },
    {
      title: "Besøk gruppert på enhet",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*,
    \`team-researchops-prod-01d6.umami.public_session\`.device  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  LEFT JOIN \`team-researchops-prod-01d6.umami.public_session\`
    ON \`fagtorsdag-prod-81a6.umami_student.event\`.session_id = \`team-researchops-prod-01d6.umami.public_session\`.session_id
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  base_query.device,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
WHERE base_query.device NOT LIKE '%x%'
GROUP BY
  base_query.device
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    },
    {
      title: "Besøk gruppert på OS",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*,
    \`team-researchops-prod-01d6.umami.public_session\`.os  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  LEFT JOIN \`team-researchops-prod-01d6.umami.public_session\`
    ON \`fagtorsdag-prod-81a6.umami_student.event\`.session_id = \`team-researchops-prod-01d6.umami.public_session\`.session_id
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  base_query.os,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
GROUP BY
  base_query.os
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    },
    {
      title: "Besøk gruppert på nettleser",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*,
    \`team-researchops-prod-01d6.umami.public_session\`.browser  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  LEFT JOIN \`team-researchops-prod-01d6.umami.public_session\`
    ON \`fagtorsdag-prod-81a6.umami_student.event\`.session_id = \`team-researchops-prod-01d6.umami.public_session\`.session_id
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  base_query.browser,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
GROUP BY
  base_query.browser
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    },
    {
      title: "Besøk gruppert på skjermstørrelse",
      type: "table",
      width: '50',
      sql: `WITH base_query AS (
  SELECT
    \`fagtorsdag-prod-81a6.umami_student.event\`.*,
    \`team-researchops-prod-01d6.umami.public_session\`.screen  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  LEFT JOIN \`team-researchops-prod-01d6.umami.public_session\`
    ON \`fagtorsdag-prod-81a6.umami_student.event\`.session_id = \`team-researchops-prod-01d6.umami.public_session\`.session_id
  WHERE \`fagtorsdag-prod-81a6.umami_student.event\`.website_id = '{{website_id}}'
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.event_type = 1
  AND \`fagtorsdag-prod-81a6.umami_student.event\`.url_path = [[ {{url_sti}} --]] '/'
  [[AND {{created_at}} ]]
)

SELECT
  base_query.screen,
  COUNT(DISTINCT base_query.session_id) as Unike_besokende
FROM base_query
GROUP BY
  base_query.screen
ORDER BY Unike_besokende DESC
LIMIT 1000
`
    }
  ]
};
