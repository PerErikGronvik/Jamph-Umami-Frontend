// AI Bygger — the green-box panel. Used natively inside Prototype3 and also
// as a standalone page (AiBygger.tsx wraps this with URL-param context).
import { useState, useEffect, useRef } from 'react';
import PinnedWidget from '../dashboard/PinnedWidget';
import ShareWidgetModal from './ShareWidgetModal';
import DownloadResultsModal from '../chartbuilder/results/DownloadResultsModal';
import { Button, Modal, Alert } from '@navikt/ds-react';
import Editor from '@monaco-editor/react';
import * as sqlFormatter from 'sql-formatter';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useChartDataPrep } from '../../lib/useChartDataPrep';
import DashboardStatCards from '../dashboard/DashboardStatCards';
import DashboardKIForklaring from '../dashboard/DashboardKIForklaring';
import { WIDGET_SIZES } from '../../lib/widgetSizes';
import mockupExampleResults from '../../data/dashboard/mockupExampleResults.json';

const defaultQuery = `SELECT
  website_id,
  name
FROM
  \`fagtorsdag-prod-81a6.umami_student.public_website\`
LIMIT
  100;`;

type Step = 1 | 2 | 3;

const boxClass = 'bg-green-50 p-4 border border-green-100 w-full h-full flex flex-col';

/** Picks the most likely chart type from a natural-language prompt. */
function guessChartType(prompt: string): string {
    const p = prompt.toLowerCase();
    if (/regresjon|korrelasjon|lineær|trend.*linje|stigningstall|r2|r²|rmse|prediksjon/.test(p)) return 'regresjon';
    if (/daglig|m.ned|ukentlig|tidslinje|over tid|trend|utvikling|per dag|per m.ned/.test(p)) return 'linechart';
    if (/andel|prosent|fordeling|kake/.test(p)) return 'piechart';
    if (/topp|mest|flest|rangering|sammenlign|stolpe/.test(p)) return 'barchart';
    return 'table';
}

const allTabs = [
    { value: 'table', label: 'Tabell' },
    { value: 'linechart', label: 'Linje' },
    { value: 'areachart', label: 'Område' },
    { value: 'barchart', label: 'Stolpe' },
    { value: 'piechart', label: 'Kake' },
    { value: 'statcards', label: 'Nøkkeltall' },
    { value: 'kiforklaring', label: 'KI forklaring' },
];



interface Props {
    readonly websiteId: string;
    readonly domain?: string;
    readonly path: string;
    readonly pathOperator: string;
    readonly startDate?: Date;
    readonly endDate?: Date;
    readonly onAddWidget?: (sql: string, chartType: string, result: any, size: { cols: number; rows: number }, title: string, aiPrompt: string) => void;
    readonly editWidget?: { sql: string; chartType: string; title: string; aiPrompt?: string; result?: any } | null;
}

export function AiByggerPanel({ websiteId, domain, path, pathOperator, startDate: propStartDate, endDate: propEndDate, onAddWidget, editWidget }: Props) {
    const pathConditionSQL = pathOperator === 'starts-with'
        ? (path === '/' ? '' : `AND url_path LIKE '${path}%'`)
        : `AND url_path = '${path}'`;
    const pathLabel = pathOperator === 'starts-with'
        ? (path === '/' ? 'hele nettstedet' : `stier under ${path}`)
        : `siden ${path}`;

    const [step, setStep] = useState<Step>(1);
    const [query, setQuery] = useState(defaultQuery);
    const [aiPrompt, setAiPrompt] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shareWidgetOpen, setShareWidgetOpen] = useState(false);
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [pendingAdd, setPendingAdd] = useState<{ sql: string; chartType: string; result: any; title: string } | null>(null);
    const [tidligereOpen, setTidligereOpen] = useState(false);
    const [selectedTidligere, setSelectedTidligere] = useState<number | null>(null);
    const [p2Tab, setP2Tab] = useState('table');
    const [showMoreTabs, setShowMoreTabs] = useState(false);
    const [formatSuccess, setFormatSuccess] = useState(false);
    const [metabaseCopySuccess, setMetabaseCopySuccess] = useState(false);
    const [validateError, setValidateError] = useState<string | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    const [estimate, setEstimate] = useState<any>(null);
    const [estimating, setEstimating] = useState(false);
    const [showEstimate, setShowEstimate] = useState(false);
    const [lagEgenSqlOpen, setLagEgenSqlOpen] = useState(false);
    const [lagEgenSqlTitle, setLagEgenSqlTitle] = useState('');
    const shouldAutoExecuteRef = useRef(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [ragLoading, setRagLoading] = useState(false);
    const [ragCounter, setRagCounter] = useState(0);

    // Load a widget from the dashboard for editing
    useEffect(() => {
        if (!editWidget) return;
        setQuery(editWidget.sql);
        setP2Tab(editWidget.chartType);
        setAiPrompt(editWidget.aiPrompt || editWidget.title);
        if (editWidget.result) {
            setResult(editWidget.result);
        } else {
            // No cached result — auto-execute when step 2 mounts
            shouldAutoExecuteRef.current = true;
        }
        setStep(2);
    }, [editWidget]);

    const [tabOrder, setTabOrder] = useState<string[]>([]);
    const [currentExplanation, setCurrentExplanation] = useState<string | null>(null);

    // Counter for RAG loading state
    useEffect(() => {
        if (!ragLoading) {
            setRagCounter(0);
            return;
        }
        const interval = setInterval(() => {
            setRagCounter(c => c + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [ragLoading]);

    const sortedTabs = tabOrder.length > 0
        ? [...allTabs].sort((a, b) => {
            const ai = tabOrder.indexOf(a.value);
            const bi = tabOrder.indexOf(b.value);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        })
        : allTabs;

    const MAX_VISIBLE_TABS = 8;
    const visibleTabs = sortedTabs.slice(0, MAX_VISIBLE_TABS);
    const overflowTabs = sortedTabs.slice(MAX_VISIBLE_TABS);
    const activeIsOverflow = overflowTabs.some(t => t.value === p2Tab);

    // All SQL is now generated via RAG - no hardcoded SQL functions
    // Examples will be loaded from external source

    const examplesAiBuilder = [
        { title: `Daglige sidevisninger for siden i 2025` },
        { title: `Topp 12 undersider under siden i 2025` },
        { title: `Sidevisninger per måned for siden i 2025` },
        { title: `Topp 15 trafikkilder for siden i november 2025` },
        { title: `Hvilke nettsider sender besøkende til siden? Topp inngående trafikkilder, unike besøkende per kilde i 2025` },
        { title: `Nøkkeltall for siden i 2025` },
        { title: `Hvilke handlinger utfører brukerne på siden i 2025? Vis første handling per sesjon, topp 20` },
        { title: `Hvilket operativsystem bruker de besøkende på siden i 2025?` },
        { title: `Hvor navigerer brukere etter å ha søkt på siden i 2025?` },
    ];

    const extractWebsiteId = (sql: string) => {
        const match = /website_id\s*=\s*['"]([0-9a-f-]{36})['"]/i.exec(sql);
        return match?.[1];
    };
    const sqlWebsiteId = extractWebsiteId(query);

    useEffect(() => {
        if (shouldAutoExecuteRef.current && step === 2) {
            shouldAutoExecuteRef.current = false;
            executeQuery();
        }
    }, [step, query]);

    const generateSqlFromAi = async () => {
        const basePrompt = aiPrompt.trim() || `Vis meg daglige sidevisninger for ${pathLabel} i 2025`;
        const fullUrl = `https://${domain || 'aksel.nav.no'}${path}`;

        setError(null);
        setRagLoading(true);
        let sqlOk = false;
        try {
            const ragApiBase = import.meta.env.VITE_RAG_API_URL ?? '';
            const response = await fetch(`${ragApiBase}/api/sql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: basePrompt, url: fullUrl }),
            });
            if (!response.ok) {
                // RAG already provides error messages (Ollama down, bad request, etc.)
                const errData = await response.json().catch(() => null);
                throw new Error(errData?.error || `RAG API feilet (${response.status})`);
            }
            const data = await response.json();
            const rawSql = typeof data?.sql === 'string' ? data.sql : data?.sql?.response;
            if (!rawSql) throw new Error('RAG returnerte ingen SQL');

            const cleanSql = rawSql.replace(/```sql\n?|```\n?|```/g, '').trim();
            const prefix = data.debugInfo?.queryType ? `-- Query Type: ${data.debugInfo.queryType}\n\n` : '';
            setQuery(prefix + cleanSql);
            sqlOk = true;
        } catch (err: any) {
            const msg = err.message === 'Failed to fetch'
                ? 'Kunne ikke koble til RAG-tjenesten'
                : err.message;
            setError(msg);
        } finally {
            setRagLoading(false);
            setP2Tab(guessChartType(basePrompt));
            shouldAutoExecuteRef.current = sqlOk;
            setStep(2);
        }
    };

    const executeQuery = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await fetch('/api/bigquery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, analysisType: 'KI bygger' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Query failed');
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const validateSQL = () => {
        if (!query.trim()) {
            setValidateError('SQL kan ikke være tom.');
            setShowValidation(true);
            return;
        }
        const valid = /\b(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|DROP|ALTER)\b/i.test(query);
        if (!valid) {
            setValidateError('SQL må inneholde en gyldig kommando (f.eks. SELECT, WITH, ...).');
            setShowValidation(true);
            return;
        }
        try {
            sqlFormatter.format(query, { language: 'bigquery' });
            setValidateError('SQL er gyldig!');
        } catch (e: any) {
            setValidateError('Ugyldig SQL: ' + (e.message || 'Syntaksfeil'));
        }
        setShowValidation(true);
    };

    const estimateCost = async () => {
        setEstimating(true);
        setEstimate(null);
        setShowEstimate(false);
        try {
            const response = await fetch('/api/bigquery/estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, analysisType: 'Prototype3' }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Estimation failed');
            setEstimate(data);
            setShowEstimate(true);
        } catch (err: any) {
            setEstimate({ error: err.message || 'Kunne ikke estimere kostnad' });
            setShowEstimate(true);
        } finally {
            setEstimating(false);
        }
    };

    const formatSQL = () => {
        try {
            setQuery(sqlFormatter.format(query, { language: 'bigquery', tabWidth: 2, keywordCase: 'upper' }));
            setFormatSuccess(true);
            setTimeout(() => setFormatSuccess(false), 2000);
        } catch { /* ignore */ }
    };

    // All chart types now use the same RAG-based SQL generation flow
    // No special handling for any chart type

    useEffect(() => {
        if (step !== 2) return;
        // Auto-execute query if shouldAutoExecuteRef is true (set after RAG generation)
        if (shouldAutoExecuteRef.current && !loading && query.trim()) {
            shouldAutoExecuteRef.current = false;
            fetch('/api/bigquery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, analysisType: 'KI bygger' }),
            })
                .then(r => r.json().then(d => { if (!r.ok) throw new Error(d.error || 'Query failed'); setResult(d); }))
                .catch((err: any) => setError(err.message || 'An error occurred'))
                .finally(() => setLoading(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, query]);

    const { prepareLineChartData, prepareBarChartData, preparePieChartData } = useChartDataPrep(result);

    return (
        <div className="w-full h-full overflow-hidden">
            {/* ── STEP 1 ── */}
            {step === 1 && (
                <div className={boxClass}>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center' }}>
                        <h2 className="text-lg font-semibold text-gray-800">KI bygger — hvilken graf?</h2>
                    </div>
                    <div style={{ height: '80%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', width: '100%' }}>
                        <p style={{ fontSize: '1rem', color: '#1a1a1a', lineHeight: '1.5', margin: 0, marginBottom: '16px' }}>
                            Skriv det du ønsker å se i chat-boksen under. Du kan ekskludere ting. Foreløpig sendes alt du skriver i denne prototypen og resultatet du får inn til lagring i Nettskjema for å samle brukerinformasjon. Nettskjema er sikker lagring med tofaktor som følger GDPR, men vennligst unngå å skrive personopplysninger om deg selv eller andre. Chatten bruker innstillingene fra filteret på toppen. Får du ikke grafen du ønsker deg, trykk tilbake og rediger teksten. Du kan også trykke videre på Avansert og redigere koden. Send oss gjerne JSON-filer med dashboard dere har laget og tilbakemeldinger.
                        </p>
                        <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder={`Eksempel: Daglige sidevisninger for ${pathLabel} i 2025`}
                            rows={5}
                            className="navds-textarea__input w-full"
                            data-tour="prompt-input"
                            style={{ width: '100%', resize: 'none', padding: '8px 12px', borderRadius: '4px', border: '1px solid #6a6a6a', fontSize: '1rem', fontFamily: 'inherit', lineHeight: '1.5', backgroundColor: '#fff', outline: 'none', boxShadow: 'none' }}
                            onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px #0067C5'}
                            onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                        />

                    </div>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Button variant="secondary" size="small" onClick={() => { setSelectedTidligere(null); setTidligereOpen(true); }}>
                            Eksempler
                        </Button>
                        <Button variant="secondary" size="small" iconPosition="right" icon={<ChevronRight size={16} />}
                            data-tour="lag-graf"
                            loading={ragLoading}
                            onClick={() => { shouldAutoExecuteRef.current = true; generateSqlFromAi(); }}>
                            {ragLoading ? `Genererer... ${ragCounter}s` : 'Til resultater'}
                        </Button>
                    </div>
                </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
                <div className="w-full h-full">
                    <div className={boxClass}>
                        <div style={{ height: '10%', display: 'flex', alignItems: 'center', position: 'relative' }}>
                            {visibleTabs.map((tab) => (
                                <button
                                    key={tab.value} type="button" onClick={() => setP2Tab(tab.value)}
                                    className={`px-4 py-1 text-sm font-medium border-b-2 mr-1 shrink-0 ${p2Tab === tab.value ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                                    {tab.label}
                                </button>
                            ))}
                            {overflowTabs.length > 0 && (
                                <div className="relative ml-1">
                                    <button type="button" onClick={() => setShowMoreTabs(v => !v)}
                                        className={`px-3 py-1 text-sm font-medium border-b-2 shrink-0 ${activeIsOverflow ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                                        {activeIsOverflow ? allTabs.find(t => t.value === p2Tab)?.label + ' ▾' : 'Mer ▾'}
                                    </button>
                                    {showMoreTabs && (
                                        <div className="absolute top-full left-0 z-10 bg-white border border-gray-200 rounded shadow-md min-w-[120px]">
                                            {overflowTabs.map(tab => (
                                                <button key={tab.value} type="button"
                                                    onClick={() => { setP2Tab(tab.value); setShowMoreTabs(false); }}
                                                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${p2Tab === tab.value ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div
                            style={{ height: '80%', overflow: 'hidden', cursor: onAddWidget ? 'grab' : undefined, position: 'relative' }}
                            draggable={!!onAddWidget}
                            onDragStart={onAddWidget ? (e) => {
                                const widgetResult = p2Tab === 'kiforklaring' ? { text: currentExplanation ?? '' } : result;
                                const sizes = WIDGET_SIZES[p2Tab] ?? [{ cols: 1, rows: 1, name: 'Standard' }];
                                const defaultSize = sizes.find(s => s.cols === 2 && s.rows === 1) ?? sizes[0];
                                e.dataTransfer.setData('application/aibygger', JSON.stringify({ chartType: p2Tab, sql: query, result: widgetResult, title: aiPrompt, aiPrompt, size: defaultSize }));
                                e.dataTransfer.effectAllowed = 'copy';
                            } : undefined}
                        >
                            {editingTitle ? (
                                <input
                                    autoFocus
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onBlur={() => setEditingTitle(false)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') { e.currentTarget.blur(); } }}
                                    style={{ position: 'absolute', top: 10, left: 'calc(5% + 12px)', width: 'calc(90% - 24px)', height: 22, fontSize: 13, fontWeight: 600, padding: 0, border: 'none', outline: 'none', boxShadow: 'none', background: '#f9fafb', color: '#111827', zIndex: 10, cursor: 'text' }}
                                />
                            ) : (
                                <div
                                    onDoubleClick={() => setEditingTitle(true)}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 35, zIndex: 10, cursor: 'text' }}
                                />
                            )}
                            <div style={{ width: '90%', height: '100%', overflow: 'auto', margin: '0 auto' }}>
                                {p2Tab === 'statcards' ? (
                                    result
                                        ? <DashboardStatCards result={result} title={aiPrompt} />
                                        : <div className="flex items-center justify-center h-full text-gray-500 text-sm">Kjør spørringen for å se nøkkeltall</div>
                                ) : p2Tab === 'kiforklaring' ? (
                                    <DashboardKIForklaring result={{ text: currentExplanation ?? '' }} title={aiPrompt} />
                                ) : loading ? (
                                    <div className="flex items-center justify-center h-full text-gray-500">Laster...</div>
                                ) : error ? (
                                    <div className="flex items-center justify-center h-full text-red-500 text-sm">{error}</div>
                                ) : result ? (
                                    <PinnedWidget result={result} chartType={p2Tab} title={aiPrompt} colSpan={p2Tab === 'piechart' ? 2 : 1} />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-500 text-sm">Kjør spørringen for å se resultater</div>
                                )}
                            </div>
                        </div>
                        <div style={{ height: '10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Button variant="secondary" size="small" icon={<ChevronLeft size={16} />} onClick={() => { setError(null); setStep(1); }}>Til KI bygger</Button>
                            <Button variant="secondary" size="small" onClick={() => setDownloadModalOpen(true)}>Last ned</Button>
                            {onAddWidget && (
                                <Button
                                    variant="primary" size="small"
                                    data-tour="legg-til"
                                    disabled={p2Tab === 'kiforklaring' ? !currentExplanation : !result?.data?.length}
                                    onClick={() => {
                                        const sizes = WIDGET_SIZES[p2Tab] ?? [{ cols: 1, rows: 1, name: 'Standard' }];
                                        const widgetResult = p2Tab === 'kiforklaring' ? { text: currentExplanation ?? '' } : result;
                                        if (sizes.length === 1) {
                                            onAddWidget(query, p2Tab, widgetResult, sizes[0], aiPrompt, aiPrompt);
                                        } else {
                                            setPendingAdd({ sql: query, chartType: p2Tab, result: widgetResult, title: aiPrompt });
                                        }
                                    }}
                                >
                                    + Legg til på dashboard
                                </Button>
                            )}
                            <Button variant="secondary" size="small" onClick={() => setShareWidgetOpen(true)}>Del</Button>
                            <Button variant="secondary" size="small" iconPosition="right" icon={<ChevronRight size={16} />} onClick={() => { setError(null); setStep(3); }}>SQL</Button>
                        </div>
                    </div>
                    {shareWidgetOpen && <ShareWidgetModal
                        open={shareWidgetOpen}
                        onClose={() => setShareWidgetOpen(false)}
                        sql={query}
                        chartType={p2Tab}
                        defaultTitle={aiPrompt}
                        sizes={WIDGET_SIZES[p2Tab] ?? [{ cols: 1, rows: 1, name: 'Standard' }]}
                        result={p2Tab === 'kiforklaring' ? { text: currentExplanation ?? '' } : result}
                    />}
                    <DownloadResultsModal
                        result={result}
                        open={downloadModalOpen}
                        onClose={() => setDownloadModalOpen(false)}
                        chartType={p2Tab}
                        title={aiPrompt}
                        pngSizes={['linechart', 'areachart', 'barchart', 'piechart'].includes(p2Tab) ? (WIDGET_SIZES[p2Tab] ?? [{ cols: 1, rows: 1, name: 'Standard' }]) : undefined}
                        prepareLineChartData={prepareLineChartData}
                        prepareBarChartData={prepareBarChartData}
                        preparePieChartData={preparePieChartData}
                    />
                    {pendingAdd && onAddWidget && (
                        <Modal open onClose={() => setPendingAdd(null)} header={{ heading: 'Velg storrelse' }}>
                            <Modal.Body>
                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    {(WIDGET_SIZES[pendingAdd.chartType] ?? [{ cols: 1, rows: 1, name: 'Standard' }]).map(size => (
                                        <Button
                                            key={size.name}
                                            variant="secondary"
                                            {...(size.cols === 2 && size.rows === 1 ? { 'data-tour': 'size-2x1' } : {})}
                                            onClick={() => {
                                                onAddWidget(pendingAdd.sql, pendingAdd.chartType, pendingAdd.result, size, pendingAdd.title, pendingAdd.title);
                                                setPendingAdd(null);
                                            }}
                                        >
                                            {size.name}
                                        </Button>
                                    ))}
                                </div>
                            </Modal.Body>
                        </Modal>
                    )}
                </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
                <div className={boxClass}>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center' }}>
                        <h2 className="text-lg font-semibold text-gray-800">Avansert spørring</h2>
                    </div>
                    <div style={{ height: '80%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <div className="border rounded overflow-hidden" style={{ flex: 1, minHeight: 0 }}>
                                <Editor
                                    height="100%" defaultLanguage="sql"
                                    value={query}
                                    onChange={(v) => { setQuery(v || ''); setFormatSuccess(false); }}
                                    theme="vs-dark"
                                    options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: 'on', fixedOverflowWidgets: true, stickyScroll: { enabled: false }, lineNumbersMinChars: 4, glyphMargin: false }}
                                />
                            </div>
                        {showValidation && validateError && (
                            <div className={`relative rounded px-3 py-2 mt-1 text-sm flex-shrink-0 ${validateError === 'SQL er gyldig!' ? 'bg-green-100 border border-green-400 text-green-800' : 'bg-red-100 border border-red-400 text-red-800'}`}>
                                <span>{validateError}</span>
                                <button type="button" aria-label="Lukk" onClick={() => setShowValidation(false)} className="absolute right-2 top-2 font-bold cursor-pointer">&times;</button>
                            </div>
                        )}
                        {showEstimate && estimate && (
                            <div className="flex-shrink-0 mt-1">
                                {estimate.error ? (
                                    <Alert variant="error" size="small">{estimate.error}</Alert>
                                ) : (
                                    <Alert variant={Number.parseFloat(estimate.totalBytesProcessedGB) >= 100 ? 'warning' : 'info'} size="small" className="relative">
                                        <button type="button" aria-label="Lukk" onClick={() => setShowEstimate(false)} className="absolute right-2 top-2 font-bold cursor-pointer">&times;</button>
                                        <div className="text-sm space-y-1">
                                            <div><strong>Data:</strong> {estimate.totalBytesProcessedGB} GB</div>
                                            {Number.parseFloat(estimate.estimatedCostUSD) > 0 && <div><strong>Kostnad:</strong> ${estimate.estimatedCostUSD} USD</div>}
                                            {estimate.cacheHit && <div className="text-green-700">✓ Cached (no cost)</div>}
                                        </div>
                                    </Alert>
                                )}
                            </div>
                        )}
                    </div>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Button variant="secondary" size="small" icon={<ChevronLeft size={16} />} onClick={() => { setError(null); shouldAutoExecuteRef.current = true; setStep(2); }}>Til resultater</Button>
                        <Button size="small" variant="secondary" onClick={formatSQL}>{formatSuccess ? '✓ Formatert' : 'Formater'}</Button>
                        <Button size="small" variant="secondary" onClick={validateSQL}>Valider</Button>
                        <Button size="small" variant="secondary" loading={estimating} onClick={estimateCost}>Kostnad</Button>
                        <Button size="small" variant="secondary">Forklar</Button>
                        <Button
                            size="small"
                            variant="secondary"
                            icon={metabaseCopySuccess ? <Check size={16} /> : undefined}
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(query);
                                    setMetabaseCopySuccess(true);
                                    setTimeout(() => setMetabaseCopySuccess(false), 2000);
                                } catch { /* ignore */ }
                            }}
                        >
                            {metabaseCopySuccess ? 'Kopiert!' : 'Kopier for Metabase'}
                        </Button>
                    </div>
                </div>
            )}

            <Modal open={lagEgenSqlOpen} onClose={() => setLagEgenSqlOpen(false)} header={{ heading: 'Lag egen SQL' }}>
                <Modal.Body>
                    <div className="flex flex-col gap-2">
                        <label className="aksel-label aksel-label--small" htmlFor="lag-sql-title">Tittel</label>
                        <input
                            id="lag-sql-title"
                            type="text"
                            value={lagEgenSqlTitle}
                            onChange={(e) => setLagEgenSqlTitle(e.target.value)}
                            placeholder="Eks: Mine egne sidevisninger"
                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #6a6a6a', fontSize: '1rem', fontFamily: 'inherit', width: '100%' }}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && lagEgenSqlTitle.trim()) {
                                    setAiPrompt(lagEgenSqlTitle.trim());
                                    setQuery(`SELECT\n  website_id,\n  name\nFROM\n  \`fagtorsdag-prod-81a6.umami_student.public_website\`\nLIMIT\n  100;`);
                                    setResult(null);
                                    setLagEgenSqlOpen(false);
                                    setStep(3);
                                }
                            }}
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" disabled={!lagEgenSqlTitle.trim()} onClick={() => {
                        setAiPrompt(lagEgenSqlTitle.trim());
                        setQuery(`SELECT\n  website_id,\n  name\nFROM\n  \`fagtorsdag-prod-81a6.umami_student.public_website\`\nLIMIT\n  100;`);
                        setResult(null);
                        setLagEgenSqlOpen(false);
                        setStep(3);
                    }}>Gå til SQL</Button>
                    <Button variant="tertiary" onClick={() => setLagEgenSqlOpen(false)}>Avbryt</Button>
                </Modal.Footer>
            </Modal>

            <Modal open={tidligereOpen} onClose={() => setTidligereOpen(false)} header={{ heading: 'Eksempelspørringer' }}>
                <Modal.Body>
                    <div className="flex flex-col gap-2" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {examplesAiBuilder.map((item) => (
                            <button
                                key={item.title} type="button"
                                className={`text-left border rounded-md px-4 py-3 cursor-pointer w-full ${selectedTidligere === examplesAiBuilder.indexOf(item) ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                onClick={() => setSelectedTidligere(examplesAiBuilder.indexOf(item))}>
                                {item.title}
                            </button>
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" disabled={selectedTidligere === null} onClick={() => {
                        if (selectedTidligere !== null) {
                            const item = examplesAiBuilder[selectedTidligere];
                            setAiPrompt(item.title);
                            // All examples now trigger RAG generation instead of using hardcoded SQL
                            setTidligereOpen(false);
                            // Auto-trigger RAG SQL generation
                            shouldAutoExecuteRef.current = true;
                            generateSqlFromAi();
                        }
                    }}>Kjør</Button>
                    <Button variant="tertiary" onClick={() => setTidligereOpen(false)}>Avbryt</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
