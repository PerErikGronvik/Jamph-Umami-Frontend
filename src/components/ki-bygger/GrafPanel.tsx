import { useEffect, useRef, useState } from 'react';
import { Alert, Button, BodyShort, CopyButton, Heading, Label, Modal, TextField, ToggleGroup } from '@navikt/ds-react';
import { ChevronDownIcon, ChevronRightIcon, DownloadIcon, ExternalLinkIcon, PlusIcon } from '@navikt/aksel-icons';
import { format as formatSql } from 'sql-formatter';
import { estimateBigQueryQuery } from '../dashboardjson/api/bigQueryApi';
import PinnedWidget from '../dashboard/PinnedWidget';
import DownloadResultsModal from '../chartbuilder/results/DownloadResultsModal';
import ShareResultsModal from '../chartbuilder/results/ShareResultsModal';
import { SqlCodeEditor } from '../../client/shared/ui/sql';

type GrafTab = 'linechart' | 'barchart' | 'piechart' | 'table' | 'statcards';

interface DashboardEntry {
    title: string;
    data: unknown[];
    size: 'half' | 'full';
}

interface GrafPanelProps {
    previewResult: unknown[] | null;
    grafTitle: string;
    grafTab: GrafTab;
    onGrafTabChange: (tab: GrafTab) => void;
    sqlValue: string;
    onSqlChange: (v: string) => void;
    onOppdaterGraf: () => Promise<boolean>;
    oppdaterLoading?: boolean;
    dashboards: string[];
    onAddToDashboard: (dashboard: string, size: 'half' | 'full') => void;
    onCreateNewDashboard: (name: string) => void;
}

export default function GrafPanel({
    previewResult,
    grafTitle,
    grafTab,
    onGrafTabChange,
    sqlValue,
    onSqlChange,
    onOppdaterGraf,
    oppdaterLoading = false,
    dashboards,
    onAddToDashboard,
    onCreateNewDashboard,
}: GrafPanelProps) {
    const [sqlOpen, setSqlOpen] = useState(false);
    const [lastNedOpen, setLastNedOpen] = useState(false);
    const [delOpen, setDelOpen] = useState(false);
    const [delSqlOpen, setDelSqlOpen] = useState(false);
    const [addDashboardOpen, setAddDashboardOpen] = useState(false);
    const [pendingDashboard, setPendingDashboard] = useState<string | null>(null);
    const [newDashboardName, setNewDashboardName] = useState('');
    const newDashboardInputRef = useRef<HTMLInputElement>(null);
    const [sqlFeedback, setSqlFeedback] = useState<{ variant: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [estimating, setEstimating] = useState(false);
    const [infoPanelMode, setInfoPanelMode] = useState<'ki-forklaring' | 'nokkeltall'>('ki-forklaring');
    const [kiForklaring, setKiForklaring] = useState<string | null>(null);
    const [nokkeltall, setNokkeltall] = useState<string | null>(null);
    const [kiLoadingFor, setKiLoadingFor] = useState<'ki-forklaring' | 'nokkeltall' | null>(null);

    const fetchKiResponse = async (mode: 'ki-forklaring' | 'nokkeltall', data: unknown[]) => {
        const prompt = mode === 'ki-forklaring'
            ? 'Du er en hjelpsom assistent. Forklar disse dataene og hva det betyr. Bruk kun muntlig språk. Unngå tegn og kode.'
            : 'Du er en hjelpsom assistent. Hent ut de viktigste tallene og presenter dem. Bruk kun muntlig språk. Unngå tegn og kode.';
        const ragApiBase = (import.meta.env.VITE_RAG_API_URL ?? '').replace(/\/$/, '');
        setKiLoadingFor(mode);
        try {
            const response = await fetch(`${ragApiBase}/api/passthrough/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    data,
                }),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error ?? `KI-tjenesten svarte med feil (${response.status})`);
            }
            const result = await response.json();
            const text = result?.response ?? 'Ingen respons fra KI.';
            if (mode === 'ki-forklaring') setKiForklaring(text);
            else setNokkeltall(text);
        } catch (err: any) {
            const fallback = err?.message?.includes('Failed to fetch')
                ? 'Kunne ikke koble til KI-tjenesten. Sjekk at RAG-APIet kjører.'
                : `KI-feil: ${err?.message ?? 'Ukjent feil'}`;
            if (mode === 'ki-forklaring') setKiForklaring(fallback);
            else setNokkeltall(fallback);
        } finally {
            setKiLoadingFor(null);
        }
    };

    useEffect(() => {
        if (previewResult && previewResult.length > 0) {
            setKiForklaring(null);
            setNokkeltall(null);
            setInfoPanelMode('ki-forklaring');
            fetchKiResponse('ki-forklaring', previewResult);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewResult]);

    const handleFormater = () => {
        try {
            const formatted = formatSql(sqlValue);
            onSqlChange(formatted);
            setSqlFeedback({ variant: 'success', message: 'SQL er formatert.' });
        } catch {
            setSqlFeedback({ variant: 'error', message: 'Kunne ikke formatere SQL. Sjekk at den er gyldig.' });
        }
        setTimeout(() => setSqlFeedback(null), 3000);
    };

    const handleValider = () => {
        if (!sqlValue.trim()) {
            setSqlFeedback({ variant: 'error', message: 'SQL kan ikke være tom.' });
            return;
        }
        const valid = /\b(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|DROP|ALTER|SHOW|DESCRIBE)\b/i.test(sqlValue);
        if (!valid) {
            setSqlFeedback({ variant: 'error', message: 'SQL må inneholde en gyldig kommando (f.eks. SELECT, INSERT, ...).' });
            return;
        }
        try {
            formatSql(sqlValue);
            setSqlFeedback({ variant: 'success', message: 'SQL er gyldig!' });
        } catch (e: unknown) {
            setSqlFeedback({ variant: 'error', message: 'Ugyldig SQL: ' + (e instanceof Error ? e.message : 'Syntaksfeil') });
        }
    };

    const handleKostnad = async () => {
        setEstimating(true);
        setSqlFeedback(null);
        try {
            const stats = await estimateBigQueryQuery(sqlValue, 'Endelig KI');
            setSqlFeedback({ variant: 'info', message: `Estimert kostnad: $${stats?.estimatedCostUSD} USD · ${stats?.totalBytesProcessedGB} GB behandlet` });
        } catch (err: unknown) {
            setSqlFeedback({ variant: 'error', message: err instanceof Error ? err.message : 'Kunne ikke estimere kostnad.' });
        } finally {
            setEstimating(false);
        }
    };

    const handleOppdater = async () => {
        setSqlFeedback(null);
        const ok = await onOppdaterGraf();
        if (ok) {
            setSqlFeedback({ variant: 'success', message: 'Graf oppdatert med ny SQL.' });
        }
    };

    const shareUrl = `${window.location.origin}/grafdeling?sql=${encodeURIComponent(sqlValue)}`;
    const metabaseEmbed = `-- Metabase embed\n${sqlValue}`;

    const handleAddSize = (size: 'half' | 'full') => {
        if (!pendingDashboard) return;
        onAddToDashboard(pendingDashboard, size);
        setPendingDashboard(null);
        setAddDashboardOpen(false);
    };

    const handleCreateDashboard = () => {
        if (!newDashboardName.trim()) return;
        onCreateNewDashboard(newDashboardName.trim());
        setNewDashboardName('');
    };

    const prepareLineChartData = (includeAverage = true) => {
        if (!previewResult?.length) return null;
        const keys = Object.keys(previewResult[0] as object);
        if (keys.length < 2) return null;
        const xKey = keys[0], yKey = keys[1];
        const chartPoints = previewResult.map((row: any, i: number) => {
            const xValue = row[xKey];
            const yValue = typeof row[yKey] === 'number' ? row[yKey] : parseFloat(row[yKey]) || 0;
            let x: number | Date;
            if (typeof xValue === 'string' && xValue.match(/^\d{4}-\d{2}-\d{2}/)) x = new Date(xValue);
            else if (typeof xValue === 'number') x = xValue;
            else x = i;
            return { x, y: yValue, xAxisCalloutData: String(xValue), yAxisCalloutData: String(yValue) };
        });
        const lineChartData: any[] = [{ legend: yKey, data: chartPoints, color: '#0067C5', lineOptions: { lineBorderWidth: '2' } }];
        if (includeAverage && chartPoints.length > 0) {
            const avgY = chartPoints.reduce((s: number, p: any) => s + p.y, 0) / chartPoints.length;
            lineChartData.push({ legend: 'Gjennomsnitt', data: chartPoints.map((p: any) => ({ ...p, y: avgY, yAxisCalloutData: avgY.toFixed(2) })), color: '#262626', lineOptions: { lineBorderWidth: '2', strokeDasharray: '5 5' } });
        }
        return { data: { lineChartData }, enabledLegendsWrapLines: true };
    };

    const prepareBarChartData = () => {
        if (!previewResult?.length || previewResult.length > 12) return null;
        const keys = Object.keys(previewResult[0] as object);
        if (keys.length < 2) return null;
        const labelKey = keys[0], valueKey = keys[1];
        const total = previewResult.reduce((s: number, row: any) => s + (typeof row[valueKey] === 'number' ? row[valueKey] : parseFloat(row[valueKey]) || 0), 0);
        const data = previewResult.map((row: any) => {
            const value = typeof row[valueKey] === 'number' ? row[valueKey] : parseFloat(row[valueKey]) || 0;
            const label = String(row[labelKey] ?? 'Ukjent');
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return { x: label, y: value, xAxisCalloutData: label, yAxisCalloutData: `${value} (${pct}%)`, color: '#0067C5', legend: label };
        });
        return { data, barWidth: 'auto', yAxisTickCount: 5 };
    };

    const preparePieChartData = () => {
        if (!previewResult?.length || previewResult.length > 12) return null;
        const keys = Object.keys(previewResult[0] as object);
        if (keys.length < 2) return null;
        const labelKey = keys[0], valueKey = keys[1];
        const data = previewResult.map((row: any) => ({
            y: typeof row[valueKey] === 'number' ? row[valueKey] : parseFloat(row[valueKey]) || 0,
            x: String(row[labelKey] ?? 'Ukjent'),
        }));
        const total = data.reduce((s: number, d: any) => s + d.y, 0);
        return { data, total };
    };

    return (
        <>
            {/* ─── Grafvindu ─── */}
            <div className="border border-gray-200 rounded-lg bg-white p-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                    <Heading level="2" size="small">Grafvindu</Heading>
                </div>

                {/* Diagramtype-velger */}
                <div className="mb-4 border-b border-gray-200">
                    <ToggleGroup
                        value={grafTab}
                        onChange={(v) => onGrafTabChange(v as GrafTab)}
                        size="small"
                    >
                        <ToggleGroup.Item value="linechart">Linje</ToggleGroup.Item>
                        <ToggleGroup.Item value="barchart">Stolpe</ToggleGroup.Item>
                        <ToggleGroup.Item value="piechart">Kake</ToggleGroup.Item>
                        <ToggleGroup.Item value="table">Tabell</ToggleGroup.Item>
                        <ToggleGroup.Item value="statcards">Kort</ToggleGroup.Item>
                    </ToggleGroup>
                </div>

                {/* KI-forklaring / Nøkkeltall — click to toggle */}
                <div
                    className={`rounded-lg p-4 mb-4 cursor-pointer select-none ${infoPanelMode === 'ki-forklaring' ? 'bg-blue-50' : 'bg-gray-50'}`}
                    onClick={() => {
                        const next = infoPanelMode === 'ki-forklaring' ? 'nokkeltall' : 'ki-forklaring';
                        setInfoPanelMode(next);
                        if (next === 'nokkeltall' && nokkeltall === null && kiLoadingFor === null && previewResult && previewResult.length > 0) {
                            fetchKiResponse('nokkeltall', previewResult);
                        }
                    }}
                    title={infoPanelMode === 'ki-forklaring' ? 'Klikk for å se Nøkkeltall' : 'Klikk for å se KI-forklaring'}
                >
                    {infoPanelMode === 'ki-forklaring' ? (
                        <>
                            <BodyShort size="small" weight="semibold" className="mb-1 text-blue-600">KI-forklaring</BodyShort>
                            <BodyShort size="small">
                                {!previewResult
                                    ? 'Hent graf for å se KI-forklaring.'
                                    : kiLoadingFor === 'ki-forklaring'
                                    ? 'Venter på KI...'
                                    : (kiForklaring ?? 'Venter på KI...')}
                            </BodyShort>
                        </>
                    ) : (
                        <>
                            <BodyShort size="small" weight="semibold" className="mb-1 text-blue-600">Nøkkeltall</BodyShort>
                            <BodyShort size="small">
                                {!previewResult
                                    ? 'Hent graf for å se nøkkeltall.'
                                    : kiLoadingFor === 'nokkeltall'
                                    ? 'Venter på KI...'
                                    : (nokkeltall ?? 'Venter på KI...')}
                            </BodyShort>
                        </>
                    )}
                </div>

                {/* Grafvisning */}
                <div
                    className="border border-gray-100 rounded-lg p-2 bg-white mb-4"
                    style={{ height: '320px', position: 'relative' }}
                >
                    {previewResult ? (
                        <PinnedWidget
                            result={{ data: previewResult }}
                            chartType={grafTab}
                            title={grafTitle}
                            colSpan={grafTab === 'piechart' || grafTab === 'statcards' ? 2 : 1}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                            Grafen vises her etter at du trykker «Hent graf»
                        </div>
                    )}
                </div>

                {/* Handlinger under grafen */}
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        icon={<DownloadIcon aria-hidden />}
                        onClick={() => setLastNedOpen(true)}
                    >
                        Last ned
                    </Button>
                    <Button
                        variant="primary"
                        icon={<PlusIcon aria-hidden />}
                        disabled={!previewResult}
                        onClick={() => setAddDashboardOpen(true)}
                    >
                        Legg til Dashboard
                    </Button>
                    <Button
                        variant="secondary"
                        icon={<ExternalLinkIcon aria-hidden />}
                        onClick={() => setDelOpen(true)}
                    >
                        Del datafremstilling
                    </Button>
                </div>
            </div>

            {/* ─── SQL-panel ─── */}
            <div className="border border-gray-200 rounded-lg bg-white mt-4">
                <div className="flex items-center justify-between p-4">
                    <button
                        type="button"
                        className="flex items-center gap-2 bg-transparent border-0 cursor-pointer"
                        onClick={() => setSqlOpen(!sqlOpen)}
                        aria-expanded={sqlOpen}
                    >
                        {sqlOpen
                            ? <ChevronDownIcon aria-hidden />
                            : <ChevronRightIcon aria-hidden />}
                        <Label as="span">SQL</Label>
                    </button>
                    <Button variant="secondary" size="small" onClick={() => setDelSqlOpen(true)}>Del</Button>
                </div>

                {sqlOpen && (
                    <div className="px-4 pb-4">
                        {previewResult ? (
                            <>
                                <SqlCodeEditor value={sqlValue} onChange={onSqlChange} />
                                <div className="flex items-center mt-3 flex-wrap gap-2">
                                    <div className="flex gap-2">
                                        <CopyButton copyText={sqlValue} text="Kopier" activeText="Kopiert!" size="small" />
                                        <Button variant="secondary" size="small" onClick={handleFormater}>Formater</Button>
                                        <Button variant="secondary" size="small" onClick={handleValider}>Valider</Button>
                                        <Button variant="secondary" size="small" loading={estimating} onClick={handleKostnad}>Kostnad</Button>
                                        <Button variant="secondary" size="small" loading={oppdaterLoading} onClick={handleOppdater}>Oppdater</Button>
                                    </div>
                                </div>
                                {sqlFeedback && (
                                    <Alert variant={sqlFeedback.variant} size="small" className="mt-3">{sqlFeedback.message}</Alert>
                                )}
                            </>
                        ) : (
                            <BodyShort size="small" className="text-gray-400">
                                SQL vises her etter at du henter en graf.
                            </BodyShort>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Modaler ─── */}
            <DownloadResultsModal
                result={{ data: previewResult }}
                open={lastNedOpen}
                onClose={() => setLastNedOpen(false)}
                chartType={grafTab}
                title={grafTitle}
                pngSizes={[
                    { cols: 1, rows: 1, name: '1×1' },
                    { cols: 2, rows: 1, name: '2×1' },
                ]}
                prepareLineChartData={prepareLineChartData}
                prepareBarChartData={prepareBarChartData}
                preparePieChartData={preparePieChartData}
            />

            <ShareResultsModal
                sql={sqlValue}
                open={delOpen}
                onClose={() => setDelOpen(false)}
            />

            {/* Del SQL-modal */}
            <Modal open={delSqlOpen} onClose={() => setDelSqlOpen(false)} header={{ heading: 'Del SQL' }}>
                <Modal.Body>
                    <div className="flex flex-col gap-4">
                        <div>
                            <BodyShort weight="semibold" className="mb-2">Last ned som fil:</BodyShort>
                            <Button
                                variant="secondary"
                                icon={<DownloadIcon aria-hidden />}
                                onClick={() => {
                                    const blob = new Blob([sqlValue], { type: 'application/json' });
                                    const a = document.createElement('a');
                                    a.href = URL.createObjectURL(blob);
                                    a.download = 'sql.json';
                                    a.click();
                                    URL.revokeObjectURL(a.href);
                                }}
                            >
                                JSON
                            </Button>
                        </div>
                        <div>
                            <BodyShort weight="semibold" className="mb-2">Eller kopier innholdet:</BodyShort>
                            <div className="flex gap-2 flex-wrap">
                                <CopyButton copyText={sqlValue} text="JSON" activeText="Kopiert!" size="small" />
                                <CopyButton copyText={shareUrl} text="Kopier delbar lenke" activeText="Kopiert!" size="small" />
                                <CopyButton copyText={metabaseEmbed} text="Kopier til Metabase" activeText="Kopiert!" size="small" />
                            </div>
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setDelSqlOpen(false)}>Lukk</Button>
                </Modal.Footer>
            </Modal>

            {/* Legg til Dashboard-modal */}
            <Modal
                open={addDashboardOpen}
                onClose={() => { setAddDashboardOpen(false); setPendingDashboard(null); setNewDashboardName(''); }}
                header={{ heading: 'Legg til Dashboard' }}
            >
                <Modal.Body>
                    {pendingDashboard ? (
                        <div>
                            <BodyShort weight="semibold" className="mb-3">
                                Velg størrelse for «{pendingDashboard}»
                            </BodyShort>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => handleAddSize('half')}>1×1 (halvbredde)</Button>
                                <Button variant="secondary" onClick={() => handleAddSize('full')}>2×1 (fullbredde)</Button>
                            </div>
                            <Button
                                variant="tertiary"
                                size="small"
                                className="mt-3"
                                onClick={() => setPendingDashboard(null)}
                            >
                                ← Tilbake
                            </Button>
                        </div>
                    ) : (
                        <div>
                            <BodyShort className="mb-3">Velg dashboard å legge grafen til:</BodyShort>
                            <div className="flex flex-col gap-2 mb-4">
                                {dashboards.map((db) => (
                                    <Button
                                        key={db}
                                        variant="secondary"
                                        onClick={() => setPendingDashboard(db)}
                                    >
                                        {db}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex gap-2 items-end">
                                <TextField
                                    label="Opprett nytt Dashboard"
                                    placeholder="Navn på dashboard..."
                                    value={newDashboardName}
                                    onChange={(e) => setNewDashboardName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateDashboard(); }}
                                    ref={newDashboardInputRef}
                                />
                                <Button
                                    variant="primary"
                                    onClick={handleCreateDashboard}
                                    disabled={!newDashboardName.trim()}
                                    style={{ flexShrink: 0 }}
                                >
                                    Opprett
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => { setAddDashboardOpen(false); setPendingDashboard(null); setNewDashboardName(''); }}>
                        Avbryt
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}
