Start Umami
================

For å måle brukeradferd effektivt, trenger du verktøy som gir innsikt uten å gå på bekostning av brukervennlighet, datasikkerhet eller personvern..

Derfor tilbyr Team ResearchOps Umami – en løsning som kombinerer ferdigbygde dashboards, med mulighet for dypere produktanalyser i verktøy som Metabase, Grafana og Jupyter Notebook.

---

# Bruk a KI

Start Umami er utviklet med hjelp av KI.

# Henvendelser og veiledning

Spørsmål knyttet til koden eller arbeidet kan stilles
som issues her på Github. Henvendelser kan sendes via Slack i
kanalen [#researchops](https://nav-it.slack.com/archives/C02UGFS2J4B).


# Frontend Installation Instructions

## Jamph-Umami-Frontend (Our version of Start-Umami-Student edition)
   git clone https://github.com/PerErikGronvik/Jamph-Umami-Frontend Jamph-Umami-Frontend

**Install and start**:

   > **Note:** This project uses **pnpm** as its package manager (declared in `package.json` as `"packageManager": "pnpm@9.12.2"` and tracked via `pnpm-lock.yaml`). Please use pnpm for all install and start commands to avoid creating a conflicting `package-lock.json` or dependency drift.

   ### Two ways to start the app

   | Command | What it does | Needs credentials file? |
   |---|---|---|
   | `pnpm dev` | Starts **only the Vite frontend** — view and browse the UI | **No** |
   | `pnpm start` | Starts frontend **+ Express/BigQuery server** — data is loaded from BigQuery | **Yes** — see below |

   > `pnpm install` and `pnpm dev` work without any credentials file. BigQuery is only used at runtime when you run `pnpm start`.

   ### macOS / Linux
   ```bash
   # If pnpm is not on PATH, use Corepack
   corepack prepare pnpm@9.12.2 --activate
   pnpm install        # works without credentials — no BigQuery connection needed
   pnpm dev            # frontend only — no BigQuery needed
   # or: pnpm start    # frontend + BigQuery server (requires credentials file)
   ```

   ### Windows
   > **OBS:** `corepack enable` krever admin-rettigheter på Windows og feiler uten det. Bruk heller npm til å installere pnpm-verktøyet én gang – prosjektet bruker fortsatt pnpm som pakkebehandler.
   ```powershell
   npm install -g pnpm   # installer pnpm-verktøyet én gang (krever ikke admin)
   pnpm install          # første gang – bruker pnpm-lock.yaml, krever ikke credentials
   pnpm dev              # kun frontend — BigQuery-tilkobling ikke nødvendig
   # eller: pnpm start   # frontend + BigQuery-server (krever credentials-fil)
   ```
   Click the link to continue

   Note: To restart, press `Ctrl/command+C` to stop it, then run `pnpm dev` (or `pnpm start`) again.

   ### Using BigQuery data with `pnpm start`

   To load live data, paste `fagtorsdag-prod-81a6-52ac69097f46.json` into the project root before running `pnpm start`. Keep the file secret — do not commit or share it.