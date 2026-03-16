# Mergeplan

## Nåværende plan: prototype → main (umiddelbart)
Prototype merges inn i main for videre prototyping. Main beholder sin infrastruktur (NAIS, deploy, pnpm).
Herverk-merge (target structure) tas etterpå når prototyping er ferdig.

### Forberedelse
- [ ] Lag `main_backup` branch: `git branch main_backup main` + `git push origin main_backup`

### Merge-steg
- [ ] `git checkout main`
- [ ] `git merge prototype` — vil lage konflikter i 4-5 filer
- [ ] Ta main sin versjon av infrastruktur (se liste nedenfor)
- [ ] Manuell merge av `package.json`, `App.tsx`, `routes.tsx`, `AiChartBuilder.tsx`
- [ ] `pnpm install` (prototype brukte npm — vi kjører pnpm)
- [ ] Test lokalt: `pnpm start`
- [ ] Push og deploy

### Filer der main alltid vinner (kjør dette etter merge)
```
git checkout main -- .nais/nais-dev.yaml
git checkout main -- .nais/nais-prod.yaml
git checkout main -- .github/workflows/deploy.yaml
git checkout main -- .github/workflows/auto-merge-trusted.yaml
git checkout main -- Dockerfile
git checkout main -- .npmrc
git checkout main -- pnpm-lock.yaml
git checkout main -- src/app/layout.tsx
git checkout main -- src/app/page.tsx
```

### Filer som trenger manuell merge
- `package.json` — behold main (pnpm), legg til `html-to-image` fra prototype
- `src/App.tsx` — main som base, legg til prototypes routes/imports
- `src/routes.tsx` — main som base, legg til prototypes nye ruter
- `src/pages/analysis/AiChartBuilder.tsx` — vurder hvilken versjon som er nyest

---

## Neste plan: herverk → main (om ~3 mnd, før upstream-merge)
Når prototyping er ferdig flyttes koden til target structure (herverk-arkitekturen).

### Forberedelse (én gang)
- [ ] Lag ny working branch `merge/herverk-to-main` fra herverk
- [ ] Bekreft at upstream/main er synkronisert (er det nå)

---

## Steg 1 — Verifiser at herverk bygger og kjører
**Mål:** Bekreft at herverk er et fungerende utgangspunkt før noe kopieres inn.

- [ ] `git checkout herverk` → `pnpm install` → `pnpm start`
- [ ] Sjekk at appen laster i nettleser
- [ ] Sjekk at eksisterende sider virker: Dashboard, Grafbygger, SQL, Trafikkanalyse, Brukerreiser
- [ ] Sjekk at BigQuery-kall fungerer (krever `.env` med service account)
- [ ] Fiks eventuelle build-feil før du går videre

**Testkriterium:** Alle eksisterende sider i herverk laster uten konsoll-feil.

---

## Steg 2 — Kopier infrastruktur og deployment fra main
**Mål:** Herverk skal deploye og kjøre i NAIS akkurat som main gjør i dag.

Filer som kopieres/merges fra main → herverk:
- [ ] `.nais/nais-dev.yaml` og `nais-prod.yaml` (Eilifs versjon er riktig og førende)
- [ ] `.github/` (deploy.yaml, auto-merge-trusted.yaml, digestabot, dependabot)
- [ ] `Dockerfile` (main er førende, men sjekk om herverk har noe nytt)
- [ ] `.npmrc`, `package.json` (Eilifs deps, aksel-icons)
- [ ] `pnpm-lock.yaml`, `vite.config.ts`, `index.html`
- [ ] `auth.js` → flett logikken inn i `src/server/middleware/authUtils.js`

- [ ] `pnpm install` → bygg → deploy til dev-miljø
- [ ] Bekreft at appen er tilgjengelig på dev-URL
- [ ] Bekreft at SSO/auth oppfører seg som ønsket (fjern `azure.sidecar.autoLogin` hvis studentversjon ikke skal ha SSO)

**Testkriterium:** Appen deployer og er tilgjengelig. Steg 1-testene er fortsatt grønne.

---

## Steg 3 — Kopier inn Prototype 3: AI-bygger og dashboard-widgets
**Mål:** Prototype 3s kjernefunksjonalitet (AI-bygger + pinnable dashboard) lever i herverk.

- [ ] Kopier `AiByggerPanel.tsx` (1110 linjer) inn i `src/client/features/aichartbuilder/ui/`
- [ ] Kopier `AiChartBuilderNew.tsx` og `Prototype3.tsx` (referanse for logikk)
- [ ] Kopier dashboard-widget-komponenter (`DashboardAreaChart`, `DashboardBarChart`, `PinnedGrid`, `PinnedWidget`, `FilterBar`, etc.) inn i `src/client/shared/ui/tables/`
- [ ] Legg til rute for AI-bygger i `src/client/routes.tsx`
- [ ] Koble opp siden og sjekk at den laster
- [ ] Sjekk at SQL-editor i AI-byggeren fungerer
- [ ] Sjekk at grafer vises riktig
- [ ] Se hva som brekker — noter det, ikke fiks alt med én gang

**Testkriterium:** AI-bygger-siden laster og SQL-editor er synlig. Dashboard med widgets vises.

---

## Steg 4 — Del opp filer i riktig mappestruktur
**Mål:** Koden fra prototype 3 følger `client/features/aichartbuilder/` strukturen i target structure.md.

Dette gjøres gradvis, én fil om gangen:
- [ ] 4a. Trekk ut API-logikk → `aichartbuilder/api/aiSqlApi.ts`
- [ ] 4b. Trekk ut hooks → `aichartbuilder/hooks/useAiChartBuilder.ts`
- [ ] 4c. Del opp UI → `builder/` (PromptEditor, SuggestionPanel, GenerationControls)
- [ ] 4d. Del opp resultater → `results/` (AiResultsPanel, AiSqlPreview, AiChartPreview)
- [ ] 4e. Flytt delte chart-widgets til `shared/ui/tables/components/`
- [ ] 4f. Oppdater import-stier etter hvert som filer flyttes

Etter hvert delsteg: kjør appen og bekreft at alt fortsatt virker.

**Testkriterium:** Ingen store monolitt-filer gjenstår. Alle imports peker til riktige steder.

---

## Steg 4.1 — Samarbeid: kodekvalitet og arkitektur
**Mål:** Koden er ren, konsistent og klar for upstream-merge.

- [ ] Gå gjennom kode med Claude: «hvor hører dette hjemme?»
- [ ] Definer felles kodestandarder (navngiving, filstørrelse, hooks vs utils)
- [ ] Fjern duplikatkode mellom prototype og herverk
- [ ] Skriv `index.ts` eksporter for hver feature
- [ ] Oppdater `target structure.md` med endringer underveis

---

## Sluttmål
- [ ] `main_backup` arkivert
- [ ] `main` resettet til merged branch
- [ ] `herverk` slettet
- [ ] Klar for upstream-merge

---

#target-branch: herverk → merge/herverk-to-main → main
#All will be merged into herverk. Then a security copy of main is made to main_backup. Then main is reset to herverk, and herverk is deleted.



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
