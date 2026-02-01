# Endringslogg - Frontend

## 29. januar 2026 - KI Grafbygger MVP

### Nye filer
- `src/components/analysis/AiBuilderLayout.tsx` - Egen layout-komponent for KI byggeren (kopi av ChartLayout uten "Type analyse" dropdown og navigasjon)
- `src/pages/analysis/AiChartBuilder.tsx` - Hovedside for KI grafbygger med AI-prompt input og SQL-editor

### Endrede filer
- `src/routes.tsx` - Lagt til `/ai-builder` route
- `src/pages/Home.tsx` - Lagt til "Gå til KI byggeren" knapp ved siden av "Gå til Grafbyggeren"

### Funksjonalitet
- Tekstfelt "Hvilken graf vil du KI skal lage?" for naturlig språk input
- "Generer SQL med KI" knapp (placeholder - genererer kun eksempel-SQL)
- SQL-editor (Monaco) for manuell redigering av generert/egen SQL
- Formatering, validering og deling av SQL
- "Vis resultater" og "Estimer kostnad" knapper
- Identisk resultatvisning som SQL-spørringer (tabell, grafer, JSON)

### Teknisk
- Bruker samme ResultsPanel som SqlEditor
- Samme chart preparation functions (prepareLineChartData, prepareBarChartData, preparePieChartData)
- API-kall til `/api/bigquery` for kjøring av SQL
- Ingen AI-implementering ennå - kun visuelt grensesnitt

### Bakgrunn
Det er behov for å knytte frontend og backend og å se hvordan KI-generert SQL kan integreres i brukergrensesnittet. Denne MVP-en fokuserer på UI/UX og grunnleggende funksjonalitet, mens den faktiske KI-integrasjonen vil komme i senere iterasjoner.

#### Utvikler: PererikGronvik