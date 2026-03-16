#target herververk, All will be merged into herverk. Then a secrity copy of main is made to main_backup. Then main is reset to herverk, and herverk is deleted.

.nais/                  #origin main .nais (Eilif: NAIS dev+prod configs) #Main versjonnen er riktig.
.github/                #origin main .github (Eilif: deploy.yaml, auto-merge-trusted.yaml, digestabot.yaml, dependabot.yml) #Main versjonnen er riktig.
Dockerfile              #origin main (Eilif: container build) #Main versjonen er riktig og førende, men det er ting fra herverk som er nytt.
.npmrc                  #origin main (Eilif: pnpm config)
auth.js                 #origin main (Eilif: auth logic) → merge into server/middleware/authUtils.js
package.json            #origin main (Eilif: updated deps, aksel-icons added)
pnpm-lock.yaml          #origin main
vite.config.ts          #origin main
index.html              #origin main


```text
src
├───client
│   ├───features
│   │   ├───analysis
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   │   ├───analyticsNavigation.ts      #origin main src/components/analysis/AnalyticsNavigation.tsx
│   │   │   │   └───developerToolsNavigation.ts #origin main src/components/analysis/DeveloperToolsNavigation.tsx
│   │   │   ├───storage
│   │   │   ├───ui
│   │   │   │   ├───AnalysisActionModal.tsx     #origin main src/components/analysis/AnalysisActionModal.tsx
│   │   │   │   ├───ChartLayout.tsx             #origin main src/components/analysis/ChartLayout.tsx
│   │   │   │   ├───Diagnosis.tsx               #origin main src/pages/analysis/Diagnosis.tsx
│   │   │   │   ├───PeriodPicker.tsx            #origin main src/components/analysis/PeriodPicker.tsx
│   │   │   │   ├───PrivacyCheck.tsx            #origin main src/pages/analysis/PrivacyCheck.tsx
│   │   │   │   ├───UserComposition.tsx         #origin main src/pages/analysis/UserComposition.tsx
│   │   │   │   ├───WebsitePicker.tsx           #origin main src/components/analysis/WebsitePicker.tsx
│   │   │   │   ├───funnel
│   │   │   │   │   ├───FunnelChart.tsx             #origin main src/components/analysis/funnel/FunnelChart.tsx
│   │   │   │   │   ├───FunnelStats.tsx             #origin main src/components/analysis/funnel/FunnelStats.tsx
│   │   │   │   │   └───HorizontalFunnelChart.tsx   #origin main src/components/analysis/funnel/HorizontalFunnelChart.tsx
│   │   │   │   ├───journey
│   │   │   │   │   └───UmamiJourneyView.tsx    #origin main src/components/analysis/journey/UmamiJourneyView.tsx
│   │   │   │   └───traffic
│   │   │   │       ├───TrafficStats.tsx        #origin main src/components/analysis/traffic/TrafficStats.tsx
│   │   │   │       └───UmamiTrafficView.tsx    #origin main src/components/analysis/traffic/UmamiTrafficView.tsx
│   │   │   └───utils
│   │   ├───aichartbuilder
│   │   │   ├───api
│   │   │   │   ├───aiSqlApi.ts #origin prototype prototype3 src/pages/analysis/AiChartBuilderNew.tsx | #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx | #origin main src/pages/analysis/AiChartBuilder.tsx (Eilif modified)
│   │   │   │   ├───ragClient.external.ts
│   │   │   │   └───jsonFileApi.ts #origin prototype prototype3 src/pages/analysis/Prototype3.tsx
│   │   │   ├───hooks
│   │   │   │   ├───useAiChartBuilder.ts #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx
│   │   │   │   ├───useAiSuggestions.ts
│   │   │   │   └───useAiPromptState.ts
│   │   │   ├───model
│   │   │   │   ├───types.ts
│   │   │   │   ├───constants.ts
│   │   │   │   ├───schemas.ts
│   │   │   │   └───tabOrder.ts
│   │   │   ├───queryTemplates
│   │   │   │   ├───examples
│   │   │   │   │   ├───daily-pageviews.example.json
│   │   │   │   │   ├───top-pages.example.json
│   │   │   │   │   └───traffic-sources.example.json
│   │   │   │   └───templateRegistry.ts
│   │   │   ├───ui
│   │   │   │   ├───AiChartBuilder.tsx #origin prototype prototype3 src/pages/analysis/AiByggerPanel.tsx
│   │   │   │   ├───builder
│   │   │   │   │   ├───PromptEditor.tsx #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx
│   │   │   │   │   ├───SuggestionPanel.tsx #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx
│   │   │   │   │   └───GenerationControls.tsx #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx
│   │   │   │   └───results
│   │   │   │       ├───AiResultsPanel.tsx #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx | #origin prototype prototype3 src/pages/analysis/Prototype3.tsx
│   │   │   │       ├───AiSqlPreview.tsx #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx
│   │   │   │       └───AiChartPreview.tsx #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx
│   │   │   ├───utils
│   │   │   │   ├───aiRequestPayload.ts #frontend sender kun rå prompt + filtre; kontekst bygges i kotlin
│   │   │   │   ├───sqlResponseParser.ts
│   │   │   │   └───widgetMapper.ts #mappe SQL-resultat til internt widget-format (chartType, title, data, size) | #origin prototype prototype3 src/lib/useChartDataPrep.ts
│   │   │   └───index.ts #feature-entry: re-eksporterer public API for aichartbuilder (ui/hooks/model)
│   │   ├───chartbuilder
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   │   ├───grafbygger
│   │   │   │   └───results
│   │   │   └───utils
│   │   ├───content
│   │   │   └───ui
│   │   │       ├───articles
│   │   │       └───topics
│   │   ├───dashboard
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   │   └───useDashboardWidgetResolver.ts
│   │   │   ├───migration
│   │   │   │   ├───legacyChartbuilderToJson.ts
│   │   │   │   └───legacySiteimproveToJson.ts
│   │   │   ├───model
│   │   │   │   ├───dashboardJsonSchema.ts
│   │   │   │   ├───widgetType.ts
│   │   │   │   └───widgetTypeGuards.ts
│   │   │   ├───dashboards
│   │   │   │   ├───default.dashboard.json
│   │   │   │   └───student.dashboard.json
│   │   │   ├───ExportImportJson
│   │   │   │   ├───jsonImport.ts
│   │   │   │   ├───jsonExport.ts
│   │   │   │   └───inMemorySession.ts
│   │   │   ├───Storage
│   │   │   │   ├───fromPostgres.ts
│   │   │   │   └───toPostgress.ts
│   │   │   ├───ui
│   │   │   │   └───widget
│   │   │   │       ├───widgetRendererRegistry.ts
│   │   │   │       └───UnsupportedWidget.tsx
│   │   │   └───utils
│   │   │       └───resolveWidgetByType.ts
│   │   ├───eventexplorer
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   └───utils
│   │   ├───eventjourney
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───storage
│   │   │   ├───ui
│   │   │   │   └───journey
│   │   │   └───utils
│   │   ├───funnel
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   └───utils
│   │   ├───oversikt
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   │   └───dialogs
│   │   │   └───utils
│   │   ├───projectmanager
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   └───ui
│   │   ├───retention
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   └───utils
│   │   ├───settings
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   └───utils
│   │   ├───siteimprove*
│   │   │   └───frontend*
│   │   │       ├───api*
│   │   │       │   └───siteimprove.ts* #finnes og flyttes kanskje
│   │   │       ├───hooks*
│   │   │       │   └───useSiteimproveSupport.ts* #finnes og flyttes kanskje
│   │   │       ├───utils*
│   │   │       │   └───siteimprove.ts* #finnes og flyttes kanskje
│   │   │       └───ui*
│   │   │           └───widget*
│   │   │               ├───DashboardWidgetSiteimprove.tsx* #finnes og flyttes kanskje
│   │   │               ├───SiteScores.jsx* #finnes og flyttes kanskje
│   │   │               └───SiteGroupScores.jsx* #finnes og flyttes kanskje
│   │   ├───sql
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   └───utils
│   │   ├───traffic
│   │   │   ├───api
│   │   │   ├───hooks
│   │   │   ├───model
│   │   │   ├───ui
│   │   │   └───utils
│   │   └───user
│   │       ├───api
│   │       ├───hooks
│   │       ├───model
│   │       ├───storage
│   │       ├───ui
│   │       │   └───components
│   │       └───utils
│   └───shared
│       ├───api
│       ├───hooks
│       ├───lib
│       │   └───widgetSizes.ts #origin prototype prototype3 src/lib/widgetSizes.ts
│       ├───types
│       │   └───widgetSize.ts #origin prototype prototype3 src/lib/widgetSizes.ts
│       └───ui
│           ├───sql
│           │   └───SqlEditor.tsx #origin prototype prototype3 src/components/analysis/AiByggerPanel.tsx | #origin prototype prototype3 src/pages/analysis/SqlEditor.tsx
│           ├───tables
│           │   ├───components
│           │   │   ├───AreaChart.tsx #origin prototype prototype3 src/components/dashboard/DashboardAreaChart.tsx
│           │   │   ├───BarChart.tsx #origin prototype prototype3 src/components/dashboard/DashboardBarChart.tsx
│           │   │   ├───Journey.tsx #origin prototype prototype3 src/components/dashboard/DashboardJourney.tsx
│           │   │   ├───KIForklaring.tsx #origin prototype prototype3 src/components/dashboard/DashboardKIForklaring.tsx
│           │   │   ├───LineChart.tsx #origin prototype prototype3 src/components/dashboard/DashboardLineChart.tsx
│           │   │   ├───PieChart.tsx #origin prototype prototype3 src/components/dashboard/DashboardPieChart.tsx
│           │   │   ├───StatCards.tsx #origin prototype prototype3 src/components/dashboard/DashboardStatCards.tsx
│           │   │   └───Table.tsx #origin prototype prototype3 src/components/dashboard/DashboardTable.tsx
│           │   ├───layout
│           │   │   ├───FilterBar.tsx #origin prototype prototype3 src/components/dashboard/FilterBar.tsx
│           │   │   ├───PinnedGrid.tsx #origin prototype prototype3 src/components/dashboard/PinnedGrid.tsx
│           │   │   ├───PinnedWidget.tsx #origin prototype prototype3 src/components/dashboard/PinnedWidget.tsx
│           │   │   └───UrlSearchFormPrototype.tsx #origin prototype prototype3 src/components/dashboard/UrlSearchFormPrototype.tsx
│           │   └───viewTypes
│           │       ├───baseViewType.ts #origin prototype prototype3 src/components/dashboard/PinnedWidget.tsx
│           │       ├───lineChartViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardLineChart.tsx
│           │       ├───barChartViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardBarChart.tsx
│           │       ├───areaChartViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardAreaChart.tsx
│           │       ├───pieChartViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardPieChart.tsx
│           │       ├───tableViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardTable.tsx
│           │       ├───statCardsViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardStatCards.tsx
│           │       ├───journeyStepsViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardJourney.tsx
│           │       ├───aiExplanationViewType.ts #origin prototype prototype3 src/components/dashboard/DashboardKIForklaring.tsx
│           │       └───viewTypeRegistry.ts #origin prototype prototype3 src/components/dashboard/PinnedWidget.tsx
│           └───theme
│               ├───CopyButton
│               ├───Footer
│               ├───Header
│               ├───Kontakt
│               ├───Kontaktboks
│               ├───PageHeader
│               ├───ScrollToTop
│               └───ThemeButton
├───data
│   └───dashboard
└───server
	├───bigquery
	├───config
	├───frontend
	├───middleware
	└───routes
		├───backend
		├───bigquery
		├───siteimprove
		└───user
```
