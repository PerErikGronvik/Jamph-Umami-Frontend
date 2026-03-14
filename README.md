Innblikk
================

For å måle brukeradferd effektivt, trenger du verktøy som gir innsikt uten å gå på bekostning av brukervennlighet, datasikkerhet eller personvern..

Derfor tilbyr Team ResearchOps Umami – en løsning som kombinerer ferdigbygde dashboards, med mulighet for dypere produktanalyser i verktøy som Innblikk, Metabase, Grafana og Knast.

---
# Installasjon

```
git clone https://github.com/PerErikGronvik/Jamph-Umami-Frontend
```

Legg filen `fagtorsdag-prod-81a6-52ac69097f46.json` i prosjektets rotmappe. Hold filen hemmelig — del den ikke med andre og ikke commit den til git.

### GitHub-token (NODE_AUTH_TOKEN)
Prosjektet bruker `@navikt`-pakker fra GitHub Packages, som krever autentisering. Opprett et [Personal Access Token (classic)](https://github.com/settings/tokens) med kun `read:packages`-tilgang, og sett det som en permanent miljøvariabel:

**Windows:**
```powershell
[System.Environment]::SetEnvironmentVariable("NODE_AUTH_TOKEN", "ghp_dittTokenHer", "User")
```
Lukk og åpne terminalen på nytt etterpå.

**macOS / Linux** — legg til i `~/.zshrc` (macOS) eller `~/.bashrc` (Linux):
```bash
export NODE_AUTH_TOKEN=ghp_dittTokenHer
```
Kjør så `source ~/.zshrc` (eller `source ~/.bashrc`) for at det skal gjelde med én gang.

### macOS / Linux
```bash
# Hvis pnpm ikke er på PATH, bruk Corepack
corepack prepare pnpm@9.12.2 --activate
pnpm install        # første gang
pnpm run dev
```


### Windows
> **OBS:** `corepack enable` krever admin-rettigheter på Windows og feiler uten det. Installer pnpm via npm i stedet — det fungerer uten admin.
```powershell
npm install -g pnpm   # én gang, krever ikke admin
pnpm install          # første gang
pnpm run dev
```

Klikk lenken i terminalen for å åpne appen. For å stoppe serveren, trykk `Ctrl+C`.


# Utvikling
Legg filen `fagtorsdag-prod-81a6-52ac69097f46.json` i prosjektets rotmappe. Hold filen hemmelig — del den ikke med andre og ikke commit den til git.

Opprett en `.env`-fil i prosjektets rotmappe med følgende innhold, og erstatt `<value>` med de faktiske verdiene for ditt miljø:
```
BACKEND_BASE_URL=<value>
SITEIMPROVE_BASE_URL=<value>
UMAMI_BASE_URL=<value>
GCP_PROJECT_ID=<value>

# Alternativt kan du bruke VITE_-prefiksene (støttes av både server og Vite):
VITE_BACKEND_BASE_URL=<value>
VITE_SITEIMPROVE_BASE_URL=<value>
VITE_UMAMI_BASE_URL=<value>
VITE_GCP_PROJECT_ID=<value>
```
Kjør så:
```
pnpm i
pnpm run dev
```

# Env
- `BACKEND_BASE_URL`: Base URL for the innblikk backend, injected via NAIS (see `.nais/dev/nais-dev.yaml` and `.nais/prod/nais-prod.yaml`) to avoid hardcoded endpoints.
- `BACKEND_TOKEN_URL`: Optional token endpoint for service-to-service token exchange. In local development, defaults to `http://localhost:8080/issueissue/token`.
- `BACKEND_TOKEN_CLIENT_ID`, `BACKEND_TOKEN_CLIENT_SECRET`, `BACKEND_TOKEN_AUDIENCE`: Optional token request params. In local development against `issueissue`, defaults are `start-umami`, `unused`, `start-umami`.
- `BACKEND_TOKEN`: Optional static fallback token used by `/api/backend` only if no incoming auth token exists and dynamic service token fetch is unavailable.
- `SITEIMPROVE_BASE_URL`: Base URL for the Siteimprove proxy, injected via NAIS (see `.nais/dev/nais-dev.yaml` and `.nais/prod/nais-prod.yaml`) to avoid hardcoded endpoints.
- `UMAMI_BASE_URL`: Base URL for the Umami tracking server, injected via NAIS (see `.nais/dev/nais-dev.yaml` and `.nais/prod/nais-prod.yaml`). This is used in tracking code snippets. **Required** - the application will fail to start if not set.
- `GCP_PROJECT_ID`: GCP Project ID for BigQuery queries, injected via NAIS (see `.nais/dev/nais-dev.yaml` and `.nais/prod/nais-prod.yaml`). Used in SQL Editor and other BigQuery integrations. **Required** - the application will fail to start if not set.


# Bruk a KI

Innblikk er utviklet med hjelp av KI.

# Henvendelser og veiledning

Spørsmål knyttet til koden eller arbeidet kan stilles
som issues her på Github. Henvendelser kan sendes via Slack i
kanalen [#researchops](https://nav-it.slack.com/archives/C02UGFS2J4B).
