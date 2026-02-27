// AI Bygger — the green-box panel. Used natively inside Prototype3 and also
// as a standalone page (AiBygger.tsx wraps this with URL-param context).
import { useState, useEffect, useRef } from 'react';
import ResultsPanel from '../chartbuilder/results/ResultsPanel';
import ShareResultsModal from '../chartbuilder/results/ShareResultsModal';
import DownloadResultsModal from '../chartbuilder/results/DownloadResultsModal';
import { Button, Alert, Textarea, Modal } from '@navikt/ds-react';
import Editor from '@monaco-editor/react';
import * as sqlFormatter from 'sql-formatter';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChartDataPrep } from '../../lib/useChartDataPrep';

const defaultQuery = `SELECT
  website_id,
  name
FROM
  \`fagtorsdag-prod-81a6.umami_student.public_website\`
LIMIT
  100;`;

type Step = 1 | 2 | 3;

const boxClass = 'bg-green-50 p-4 border border-green-100 w-full h-full flex flex-col';

const allTabs = [
    { value: 'table',     label: 'Tabell' },
    { value: 'linechart', label: 'Linje' },
    { value: 'areachart', label: 'Område' },
    { value: 'barchart',  label: 'Stolpe' },
    { value: 'piechart',  label: 'Kake' },
];

interface Props {
    readonly websiteId: string;
    readonly path: string;
    readonly pathOperator: string;
    readonly onAddWidget?: (sql: string, chartType: string, result: any) => void;
}

export function AiByggerPanel({ websiteId, path, pathOperator, onAddWidget }: Props) {
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
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [tidligereOpen, setTidligereOpen] = useState(false);
    const [selectedTidligere, setSelectedTidligere] = useState<number | null>(null);
    const [metabaseCopySuccess, setMetabaseCopySuccess] = useState(false);
    const [p2Tab, setP2Tab] = useState('table');
    const [showMoreTabs, setShowMoreTabs] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [formatSuccess, setFormatSuccess] = useState(false);
    const shouldAutoExecuteRef = useRef(false);

    const MAX_VISIBLE_TABS = 5;
    const visibleTabs = allTabs.slice(0, MAX_VISIBLE_TABS);
    const overflowTabs = allTabs.slice(MAX_VISIBLE_TABS);
    const activeIsOverflow = overflowTabs.some(t => t.value === p2Tab);

    const tidligereSpørringer = [
        {
            prompt: `Daglige sidevisninger for ${pathLabel} i 2025`,
            sql: `SELECT\n  FORMAT_TIMESTAMP('%Y-%m-%d', created_at) AS dato,\n  COUNT(*) AS sidevisninger\nFROM \`fagtorsdag-prod-81a6.umami_student.event\`\nWHERE\n  event_type = 1\n  AND website_id = '${websiteId}'\n  ${pathConditionSQL}\n  AND EXTRACT(YEAR FROM created_at) = 2025\nGROUP BY dato\nORDER BY dato ASC;`,
        },
        {
            prompt: `Topp 10 mest besøkte undersider under ${path} i 2025`,
            sql: `SELECT\n  url_path AS side,\n  COUNT(*) AS sidevisninger\nFROM \`fagtorsdag-prod-81a6.umami_student.event\`\nWHERE\n  event_type = 1\n  AND website_id = '${websiteId}'\n  ${pathConditionSQL}\n  AND EXTRACT(YEAR FROM created_at) = 2025\nGROUP BY side\nORDER BY sidevisninger DESC\nLIMIT 10;`,
        },
        {
            prompt: `Sidevisninger per måned for ${pathLabel} i 2025`,
            sql: `SELECT\n  EXTRACT(MONTH FROM created_at) AS maaned,\n  COUNT(*) AS sidevisninger\nFROM \`fagtorsdag-prod-81a6.umami_student.event\`\nWHERE\n  event_type = 1\n  AND website_id = '${websiteId}'\n  ${pathConditionSQL}\n  AND EXTRACT(YEAR FROM created_at) = 2025\nGROUP BY maaned\nORDER BY maaned ASC;`,
        },
        {
            prompt: `Trafikkilder for ${pathLabel} i november 2025`,
            sql: `SELECT\n  COALESCE(NULLIF(referrer_domain, ''), '(direkte)') AS kilde,\n  COUNT(*) AS sidevisninger\nFROM \`fagtorsdag-prod-81a6.umami_student.event\`\nWHERE\n  event_type = 1\n  AND website_id = '${websiteId}'\n  ${pathConditionSQL}\n  AND EXTRACT(YEAR FROM created_at) = 2025\n  AND EXTRACT(MONTH FROM created_at) = 11\nGROUP BY kilde\nORDER BY sidevisninger DESC\nLIMIT 15;`,
        },
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
    }, [step]);

    const generateSqlFromAi = async () => {
        const basePrompt = aiPrompt.trim() || `Vis meg daglige sidevisninger for ${pathLabel} i 2025`;
        const pathDesc = pathOperator === 'starts-with' && path !== '/'
            ? ` (url_path LIKE '${path}%')`
            : pathOperator === 'equals' ? ` (url_path = '${path}')` : '';
        const contextPrefix = `BigQuery-tabell: \`fagtorsdag-prod-81a6.umami_student.event\`. website_id = '${websiteId}'${pathDesc}. Svar kun med SQL.\n\nSpørsmål: `;
        setError(null);
        try {
            const response = await fetch('http://localhost:8004/api/sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: contextPrefix + basePrompt, model: 'qwen2.5-coder:7b' }),
            });
            const data = await response.json();
            let sqlResponse = data?.sql
                ? (typeof data.sql === 'string' ? (() => { try { return JSON.parse(data.sql); } catch { return data; } })() : data.sql)
                : data;
            if (sqlResponse?.response) {
                let cleaned = sqlResponse.response;
                if (cleaned.includes('```')) {
                    cleaned = cleaned.replaceAll('```sql\n', '').replaceAll('```sql', '').replaceAll('```\n', '').replaceAll('```', '');
                }
                setQuery(cleaned.trim());
            } else {
                setQuery('-- Ingen SQL i svaret\n' + JSON.stringify(data, null, 2));
            }
        } catch {
            setQuery(`-- Feil: Kunne ikke koble til AI-serveren\n\n${defaultQuery}`);
        } finally {
            shouldAutoExecuteRef.current = true;
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
                body: JSON.stringify({ query, analysisType: 'AI bygger' }),
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

    const formatSQL = () => {
        try {
            setQuery(sqlFormatter.format(query, { language: 'bigquery', tabWidth: 2, keywordCase: 'upper' }));
            setFormatSuccess(true);
            setTimeout(() => setFormatSuccess(false), 2000);
        } catch { /* ignore */ }
    };

    const shareQuery = () => {
        navigator.clipboard.writeText(`${globalThis.location.origin}/ai-bygger?sql=${encodeURIComponent(query)}`);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
    };

    const copyForMetabase = async () => {
        try {
            await navigator.clipboard.writeText(query);
            setMetabaseCopySuccess(true);
            setTimeout(() => setMetabaseCopySuccess(false), 2000);
        } catch { /* ignore */ }
    };

    const { prepareLineChartData, prepareBarChartData, preparePieChartData } = useChartDataPrep(result);

    return (
        <div className="w-full h-full overflow-hidden">
            {/* ── STEP 1 ── */}
            {step === 1 && (
                <div className={boxClass}>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center' }}>
                        <h2 className="text-lg font-semibold text-gray-800">AI bygger — hvilken graf?</h2>
                    </div>
                    <div style={{ height: '80%' }}>
                        <Textarea
                            label="" hideLabel value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder={`Eksempel: Daglige sidevisninger for ${pathLabel} i 2025`}
                            style={{ width: '100%', height: '100%', resize: 'none' }}
                        />
                    </div>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Button variant="secondary" size="small" onClick={() => { setSelectedTidligere(null); setTidligereOpen(true); }}>
                            Eksempler
                        </Button>
                        <Button variant="secondary" size="small" iconPosition="right" icon={<ChevronRight size={16} />}
                            onClick={() => { shouldAutoExecuteRef.current = true; generateSqlFromAi(); }}>
                            Lag graf
                        </Button>
                    </div>
                </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
                <div className="w-full h-full">
                    {error && <Alert variant="error" className="mb-2">{error}</Alert>}
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
                        <div style={{ height: '80%', overflow: 'hidden' }}>
                            <div style={{ width: '90%', height: '100%', overflow: 'auto', margin: '0 auto' }}>
                                <ResultsPanel
                                    result={result} loading={loading} error={error}
                                    queryStats={result?.queryStats} lastAction={null}
                                    showLoadingMessage={loading} executeQuery={executeQuery} handleRetry={executeQuery}
                                    prepareLineChartData={prepareLineChartData}
                                    prepareBarChartData={prepareBarChartData}
                                    preparePieChartData={preparePieChartData}
                                    sql={query} websiteId={sqlWebsiteId}
                                    containerStyle="none" hideHeading hideInternalShareButton hideInternalDownloadButton
                                    fixedAspect hideTabsList externalTab={p2Tab} onExternalTabChange={setP2Tab}
                                />
                            </div>
                        </div>
                        <div style={{ height: '10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Button variant="secondary" size="small" icon={<ChevronLeft size={16} />} onClick={() => setStep(1)}>Tilbake</Button>
                            <Button variant="secondary" size="small" onClick={() => setDownloadModalOpen(true)}>Last ned</Button>
                            <Button variant="secondary" size="small" onClick={() => setShareModalOpen(true)}>Del</Button>
                            {onAddWidget && (
                                <Button
                                    variant="primary" size="small"
                                    disabled={!result?.data?.length}
                                    onClick={() => onAddWidget(query, p2Tab, result)}
                                >
                                    + Legg til
                                </Button>
                            )}
                            <Button variant="secondary" size="small" iconPosition="right" icon={<ChevronRight size={16} />} onClick={() => setStep(3)}>Avansert</Button>
                        </div>
                    </div>
                    {query && <ShareResultsModal sql={query} open={shareModalOpen} onClose={() => setShareModalOpen(false)} />}
                    <DownloadResultsModal result={result} open={downloadModalOpen} onClose={() => setDownloadModalOpen(false)} />
                </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
                <div className={boxClass}>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center' }}>
                        <h2 className="text-lg font-semibold text-gray-800">Avansert spørring</h2>
                    </div>
                    <div style={{ height: '80%', overflow: 'auto' }}>
                        <div className="border rounded overflow-hidden" style={{ height: '100%' }}>
                            <Editor
                                height="100%" defaultLanguage="sql" value={query}
                                onChange={(v) => { setQuery(v || ''); setFormatSuccess(false); }}
                                theme="vs-dark"
                                options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: 'on', fixedOverflowWidgets: true, stickyScroll: { enabled: false }, lineNumbersMinChars: 4, glyphMargin: false }}
                            />
                        </div>
                    </div>
                    <div style={{ height: '10%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Button variant="secondary" size="small" icon={<ChevronLeft size={16} />} onClick={() => { shouldAutoExecuteRef.current = true; setStep(2); }}>Til resultater</Button>
                        <Button size="small" variant="secondary" onClick={formatSQL}>{formatSuccess ? '✓ Formatert' : 'Formater'}</Button>
                        <Button size="small" variant="secondary" onClick={shareQuery}>{shareSuccess ? '✓ Kopiert' : 'Del kode'}</Button>
                        <Button variant="secondary" size="small" icon={metabaseCopySuccess ? <Check size={16} /> : undefined} onClick={copyForMetabase}>
                            {metabaseCopySuccess ? 'Kopiert!' : 'Kopier for Metabase'}
                        </Button>
                    </div>
                </div>
            )}

            <Modal open={tidligereOpen} onClose={() => setTidligereOpen(false)} header={{ heading: 'Eksempelspørringer' }}>
                <Modal.Body>
                    <div className="flex flex-col gap-2">
                        {tidligereSpørringer.map((item) => (
                            <button
                                key={item.prompt} type="button"
                                className={`text-left border rounded-md px-4 py-3 cursor-pointer w-full ${selectedTidligere === tidligereSpørringer.indexOf(item) ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                onClick={() => setSelectedTidligere(tidligereSpørringer.indexOf(item))}>
                                {item.prompt}
                            </button>
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" disabled={selectedTidligere === null} onClick={() => {
                        if (selectedTidligere !== null) {
                            const item = tidligereSpørringer[selectedTidligere];
                            setAiPrompt(item.prompt);
                            setQuery(item.sql);
                            shouldAutoExecuteRef.current = true;
                            setStep(2);
                            setTidligereOpen(false);
                        }
                    }}>Kjør</Button>
                    <Button variant="tertiary" onClick={() => setTidligereOpen(false)}>Avbryt</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
