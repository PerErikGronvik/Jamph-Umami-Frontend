import { useRef, useState } from 'react';
import { BodyShort, Button, Tabs, Textarea } from '@navikt/ds-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import PinnedWidget from '../../components/dashboard/PinnedWidget';
import { SqlCodeEditor } from '../../client/shared/ui/sql';
import UrlSearchFormPrototype from '../../components/dashboard/UrlSearchFormPrototype';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CHART_DATA = [
    { date: '2025-01-01', sidevisninger: 1240 },
    { date: '2025-01-02', sidevisninger: 980 },
    { date: '2025-01-03', sidevisninger: 1560 },
    { date: '2025-01-04', sidevisninger: 1320 },
    { date: '2025-01-05', sidevisninger: 1890 },
    { date: '2025-01-06', sidevisninger: 2100 },
    { date: '2025-01-07', sidevisninger: 1750 },
];

const MOCK_SQL = `SELECT
  DATE(created_at) AS dato,
  COUNT(*) AS sidevisninger
FROM pageview
WHERE website_id = 'example-website-id'
  AND created_at >= '2025-01-01'
  AND created_at < '2025-02-01'
GROUP BY DATE(created_at)
ORDER BY dato ASC;`;

const KI_SUGGESTION = 'Ditt spørsmål er veldig spennende! Hva med å legge til «i måneden»?';
const KI_SUGGESTION_ADDITION = ' i måneden';

const ANDRE_ANALYSER_OPTIONS = [
    'Markedsanalyse',
    'Egendefinerte hendelser',
    'Sideflyt',
    'Hendelsesflyt',
    'Traktanalyse',
    'Brukerprofiler',
    'Brukersammensetning',
    'Tilpasset analyse',
    'Diagnoseverktøy',
    'Personvernssjekk',
];

const ANDRE_ANALYSER_DESCRIPTIONS: Record<string, string> = {
    Markedsanalyse: 'Analyser trafikkkilder og kampanjeeffekter for å forbedre din markedsstrategi.',
    'Egendefinerte hendelser': 'Spor spesifikke hendelser du selv har definert på nettstedet ditt.',
    Sideflyt: 'Visualiser brukerens navigasjonsvei gjennom nettstedet og finn populære destinasjoner.',
    Hendelsesflyt: 'Spor og analyser sekvenser av hendelser for å forstå brukerintensjonene.',
    Traktanalyse: 'Kartlegg brukerreisen gjennom en konverteringsfunnel og finn frafallspunkter.',
    Brukerprofiler: 'Opprett detaljerte profiler av brukersegmenter basert på atferd og demografi.',
    Brukersammensetning: 'Analyser demografiske og tekniske egenskaper hos brukerne dine.',
    'Tilpasset analyse': 'Lag egendefinerte analyser basert på dine spesifikke behov og KPIer.',
    Diagnoseverktøy: 'Diagnostiser problemer og ineffektiviteter i brukeropplevelsen.',
    Personvernssjekk: 'Sikre at nettstedet oppfyller GDPR og personvernkrav.',
};

const ALL_ANALYSIS_OPTIONS = [
    'Trafikkanalyse',
    'Brukerlojalitet',
    ...ANDRE_ANALYSER_OPTIONS,
];

type ChartType = 'linechart' | 'barchart' | 'piechart' | 'table';

// ─── Component ────────────────────────────────────────────────────────────────

export default function KiBygger() {
    const [activeTab, setActiveTab] = useState('grafbygger');

    // Left panel state
    const [url, setUrl] = useState('');
    const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null);
    const [shortcuts, setShortcuts] = useState(['Trafikkanalyse', 'Brukerlojalitet']);
    const [selectedAndre, setSelectedAndre] = useState<string | null>(null);
    const [showAndreDropdown, setShowAndreDropdown] = useState(false);
    const [hoveredAndre, setHoveredAndre] = useState<string | null>(null);
    const [hoveredAndreInfo, setHoveredAndreInfo] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [typePeriode, setTypePeriode] = useState('desember-2025');
    const [visning, setVisning] = useState('besokende');

    // Right panel state
    const [kiOpen, setKiOpen] = useState(true);
    const [sqlOpen, setSqlOpen] = useState(false);
    const [kiPrompt, setKiPrompt] = useState('');
    const [kiSuggestionShown, setKiSuggestionShown] = useState(false);
    const [hoveredKiInfo, setHoveredKiInfo] = useState(false);
    const [chartType, setChartType] = useState<ChartType>('linechart');
    const [previewResult, setPreviewResult] = useState<unknown[] | null>(null);
    const [sqlValue, setSqlValue] = useState(MOCK_SQL);
    const [showAddDashboardMenu, setShowAddDashboardMenu] = useState(false);
    const [newDashboardName, setNewDashboardName] = useState('');
    const [dashboards, setDashboards] = useState(['Mitt Dashboard', 'Prosjekt A']);
    const [selectedDashboard, setSelectedDashboard] = useState('Mitt Dashboard');
    const [showNewDashboardModal, setShowNewDashboardModal] = useState(false);
    const [newDashboardInputName, setNewDashboardInputName] = useState('');
    const [showNewDashboardInput, setShowNewDashboardInput] = useState(false);

    const dashboardMenuRef = useRef<HTMLDivElement>(null);
    const andreDropdownRef = useRef<HTMLDivElement>(null);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleHentGraf = () => {
        setPreviewResult(MOCK_CHART_DATA);
        setSqlValue(MOCK_SQL);
        setKiSuggestionShown(false);
    };

    const handleKiHentGraf = () => {
        if (!kiPrompt.trim()) return;
        setPreviewResult(MOCK_CHART_DATA);
        setSqlValue(MOCK_SQL);
        setKiSuggestionShown(true);
    };

    const handleApplySuggestion = () => {
        setKiPrompt((prev) => prev + KI_SUGGESTION_ADDITION);
    };

    const handleNullstill = () => {
        setSelectedShortcut(null);
        setSelectedAndre(null);
        setTypePeriode('desember-2025');
        setVisning('besokende');
    };

    const handleCreateNewDashboard = () => {
        if (!newDashboardName.trim()) return;
        setDashboards((prev) => [...prev, newDashboardName.trim()]);
        setNewDashboardName('');
        setShowNewDashboardInput(false);
    };

    // ── Quick filter config per analysis type ─────────────────────────────────

    const activeAnalysis = selectedAndre ?? selectedShortcut;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <DashboardLayout title="KI-bygger" hideHeader>
            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="grafbygger" label="Grafbygger" />
                    <Tabs.Tab value="dashboard" label="Dashboard" />
                </Tabs.List>

                {/* ═══════════════════════════════ GRAFBYGGER ═══════════════════════════════ */}
                <Tabs.Panel value="grafbygger" className="pt-4 w-full">
                    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'flex-start' }}>

                        {/* ── Left panel ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                            {/* Box 1: URL */}
                            <div style={boxStyle}>
                                <BodyShort weight="semibold" style={boxTitleStyle}>1. Lim inn URL for å se webstatistikk</BodyShort>
                                <input
                                    type="url"
                                    placeholder="https://www.nav.no/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Box 2: Velg analysetype */}
                            <div style={boxStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <BodyShort weight="semibold" style={boxTitleStyle}>2. Velg analysetype</BodyShort>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            onClick={handleNullstill}
                                            title="Nullstill valg"
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#0067C5',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: 500,
                                                textDecoration: 'underline',
                                            }}
                                        >
                                            Nullstill valg
                                        </button>
                                        <button
                                            onClick={() => setShowSettings(!showSettings)}
                                            title="Innstillinger"
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#0067C5',
                                                fontSize: '1.2rem',
                                                cursor: 'pointer',
                                                padding: '2px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            ⚙
                                        </button>
                                    </div>
                                </div>

                                {/* Shortcut buttons */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    {shortcuts.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => { setSelectedShortcut(s); setSelectedAndre(null); }}
                                            style={{
                                                border: selectedShortcut === s ? 'none' : '1px solid #a0a0a0',
                                                borderRadius: '6px',
                                                padding: '6px 4px',
                                                background: selectedShortcut === s ? '#0067C5' : '#ffffff',
                                                color: selectedShortcut === s ? '#ffffff' : '#0067C5',
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                {/* Andre analyser dropdown */}
                                <div ref={andreDropdownRef} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowAndreDropdown(!showAndreDropdown)}
                                        style={{
                                            width: '100%',
                                            padding: '7px 10px',
                                            borderRadius: '6px',
                                            border: selectedAndre ? 'none' : '1px solid #a0a0a0',
                                            fontSize: '0.875rem',
                                            backgroundColor: selectedAndre ? '#0067C5' : '#ffffff',
                                            color: selectedAndre ? '#ffffff' : '#444',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <span>{selectedAndre ?? 'Andre analyser'}</span>
                                        {selectedAndre ? (
                                            <span
                                                onClick={(e) => { e.stopPropagation(); setSelectedAndre(null); }}
                                                style={{ fontSize: '1.1rem', lineHeight: 1, cursor: 'pointer' }}
                                            >×</span>
                                        ) : (
                                            <span style={{ fontSize: '0.65rem' }}>▼</span>
                                        )}
                                    </button>
                                    {showAndreDropdown && (
                                        <div style={dropdownContainerStyle}>
                                            {ANDRE_ANALYSER_OPTIONS.map((opt, idx) => (
                                                <div
                                                    key={opt}
                                                    onMouseEnter={() => setHoveredAndre(opt)}
                                                    onMouseLeave={() => setHoveredAndre(null)}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.6rem 0.75rem',
                                                        borderBottom: idx < ANDRE_ANALYSER_OPTIONS.length - 1 ? '1px solid #e0e0e0' : 'none',
                                                        backgroundColor: hoveredAndre === opt ? '#f0f4ff' : '#ffffff',
                                                        cursor: 'pointer',
                                                        transition: 'background-color 0.15s',
                                                    }}
                                                >
                                                    <span
                                                        onClick={() => { setSelectedAndre(opt); setSelectedShortcut(null); setShowAndreDropdown(false); }}
                                                        style={{ flex: 1, fontSize: '0.875rem', color: '#0067C5', fontWeight: 500 }}
                                                    >
                                                        {opt}
                                                    </span>
                                                    <div
                                                        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                                                        onMouseEnter={() => setHoveredAndreInfo(opt)}
                                                        onMouseLeave={() => setHoveredAndreInfo(null)}
                                                    >
                                                        <span style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            width: '18px', height: '18px', borderRadius: '50%',
                                                            backgroundColor: hoveredAndreInfo === opt ? '#0067C5' : '#e0e0e0',
                                                            color: hoveredAndreInfo === opt ? '#fff' : '#666',
                                                            fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer',
                                                            marginLeft: '0.5rem', transition: 'all 0.15s',
                                                        }}>ℹ</span>
                                                        {hoveredAndreInfo === opt && (
                                                            <div style={tooltipStyle}>
                                                                {ANDRE_ANALYSER_DESCRIPTIONS[opt]}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Settings panel */}
                            {showSettings && (
                                <div style={{ ...boxStyle, backgroundColor: '#f0f4ff', border: '2px solid #0067C5' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <BodyShort weight="semibold">Velg snarveier</BodyShort>
                                        <button onClick={() => setShowSettings(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
                                    </div>
                                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#666' }}>Velg analysetyper som vises som snarvei:</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {ALL_ANALYSIS_OPTIONS.map((opt) => (
                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={shortcuts.includes(opt)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setShortcuts((prev) => [...prev, opt]);
                                                        else setShortcuts((prev) => prev.filter((s) => s !== opt));
                                                    }}
                                                />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Box 3: Hurtigfiltre */}
                            <div style={{ ...boxStyle, backgroundColor: '#f9fbff' }}>
                                <BodyShort weight="semibold" style={boxTitleStyle}>3. Hurtigfiltre</BodyShort>
                                <QuickFilters
                                    analysisType={activeAnalysis}
                                    typePeriode={typePeriode}
                                    setTypePeriode={setTypePeriode}
                                    visning={visning}
                                    setVisning={setVisning}
                                />
                            </div>

                            {/* Hent graf button */}
                            <button
                                onClick={handleHentGraf}
                                style={primaryButtonStyle}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#0050a0'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#0067C5'; }}
                            >
                                Hent graf
                            </button>
                        </div>

                        {/* ── Right panel ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                            {/* KI-Assistent box */}
                            <div style={boxStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: kiOpen ? '0.75rem' : 0 }}>
                                    <button
                                        onClick={() => setKiOpen(!kiOpen)}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: '#444', padding: '2px 4px' }}
                                        title={kiOpen ? 'Skjul' : 'Vis'}
                                    >
                                        {kiOpen ? '▼' : '▶'}
                                    </button>
                                    <BodyShort weight="semibold">✨ KI-Assistent</BodyShort>
                                    <div
                                        style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                                        onMouseEnter={() => setHoveredKiInfo(true)}
                                        onMouseLeave={() => setHoveredKiInfo(false)}
                                    >
                                        <span style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: '18px', height: '18px', borderRadius: '50%',
                                            backgroundColor: hoveredKiInfo ? '#0067C5' : '#e0e0e0',
                                            color: hoveredKiInfo ? '#fff' : '#666',
                                            fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.15s',
                                        }}>ℹ</span>
                                        {hoveredKiInfo && (
                                            <div style={{ ...tooltipStyle, right: '25px', top: '-10px', maxWidth: '420px', width: 'max-content' }}>
                                                Lim inn URL først. Bruk så KI-byggeren som et alternativ til, eller i tillegg til, valgene på venstre panel, eller til å stille spørsmål.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {kiOpen && (
                                    <>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <Textarea
                                                    label="KI-spørsmål"
                                                    hideLabel
                                                    placeholder="Eksempel: Vis daglige sidevisninger for hele nettstedet i 2025"
                                                    value={kiPrompt}
                                                    onChange={(e) => setKiPrompt(e.target.value)}
                                                    minRows={2}
                                                    style={{ width: '100%', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                            <Button size="small" variant="primary" onClick={handleKiHentGraf} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                Hent graf
                                            </Button>
                                        </div>

                                        {kiSuggestionShown && (
                                            <div
                                                onClick={handleApplySuggestion}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                                                    backgroundColor: '#f0f4ff', border: '1px solid #c8d9f5',
                                                    borderRadius: '8px', padding: '0.75rem',
                                                    cursor: 'pointer', transition: 'background-color 0.15s',
                                                    marginTop: '0.5rem',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e0ecff'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0f4ff'; }}
                                                title="Klikk for å legge til forslaget i inputfeltet"
                                            >
                                                <span style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    width: '22px', height: '22px', borderRadius: '50%',
                                                    backgroundColor: '#0067C5', color: '#fff',
                                                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                                                }}>KI</span>
                                                <p style={{ margin: 0, fontSize: '0.875rem', color: '#333', lineHeight: '1.5' }}>
                                                    {KI_SUGGESTION}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Grafvindu box */}
                            <div style={boxStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <BodyShort weight="semibold">Grafvindu</BodyShort>
                                    <button
                                        title="Del grafvindu"
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0067C5', fontSize: '1.1rem' }}
                                    >
                                        ↗
                                    </button>
                                </div>

                                {/* Chart type switcher */}
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                    {(['linechart', 'piechart', 'barchart', 'table'] as ChartType[]).map((ct) => {
                                        const labels: Record<ChartType, string> = { linechart: 'Linje', piechart: 'Kake', barchart: 'Stolpe', table: 'Tabell' };
                                        return (
                                            <span
                                                key={ct}
                                                onClick={() => setChartType(ct)}
                                                style={{
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    fontWeight: chartType === ct ? 600 : 400,
                                                    color: chartType === ct ? '#0067C5' : '#666',
                                                    textDecoration: chartType === ct ? 'underline' : 'none',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                {labels[ct]}
                                            </span>
                                        );
                                    })}
                                </div>

                                {/* Nøkkeltall + KI-forklaring */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                    <div style={{ ...boxStyle, backgroundColor: '#f9fbff', padding: '0.75rem' }}>
                                        <BodyShort size="small" weight="semibold" style={{ marginBottom: '0.25rem', color: '#0067C5' }}>Nøkkeltall</BodyShort>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#333' }}>
                                            {previewResult ? '10 840 sidevisninger totalt · Snitt 1 548 / dag' : '—'}
                                        </p>
                                    </div>
                                    <div style={{ ...boxStyle, backgroundColor: '#f9fbff', padding: '0.75rem' }}>
                                        <BodyShort size="small" weight="semibold" style={{ marginBottom: '0.25rem', color: '#0067C5' }}>KI-forklaring</BodyShort>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#333' }}>
                                            {previewResult ? 'Trafikken økte 45 % fra start til slutt av perioden med to tydelige topper.' : '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Chart area */}
                                <div style={{ minHeight: '320px', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '0.5rem', backgroundColor: '#fff', marginBottom: '1rem' }}>
                                    {previewResult && chartType === 'linechart' ? (
                                        <PinnedWidget
                                            result={{ data: previewResult }}
                                            chartType="linechart"
                                            title="Sidevisninger per dag"
                                        />
                                    ) : (
                                        <div style={{ height: '100%', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem' }}>
                                            {previewResult
                                                ? `${chartType === 'piechart' ? 'Kakediagram' : chartType === 'barchart' ? 'Stolpediagram' : 'Tabell'} ikke tilgjengelig i prototype`
                                                : 'Grafen vises her etter at du trykker «Hent graf»'}
                                        </div>
                                    )}
                                </div>

                                {/* Actions under chart */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => {
                                            if (!previewResult) return;
                                            const json = JSON.stringify(previewResult, null, 2);
                                            const blob = new Blob([json], { type: 'application/json' });
                                            const a = document.createElement('a');
                                            a.href = URL.createObjectURL(blob);
                                            a.download = 'graf.json';
                                            a.click();
                                            URL.revokeObjectURL(a.href);
                                        }}
                                        style={{ border: '1px solid #d0d0d0', background: '#fff', cursor: 'pointer', borderRadius: '6px', padding: '6px 14px', fontSize: '0.85rem', color: '#444' }}
                                    >
                                        ↓ Last ned
                                    </button>

                                    {/* Add to dashboard */}
                                    <div ref={dashboardMenuRef} style={{ position: 'relative' }}>
                                        <Button size="small" variant="primary" onClick={() => setShowAddDashboardMenu(!showAddDashboardMenu)}>
                                            + Legg til Dashboard
                                        </Button>
                                        {showAddDashboardMenu && (
                                            <div style={{
                                                position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                                                backgroundColor: '#fff', border: '1px solid #a0a0a0', borderRadius: '6px',
                                                boxShadow: '0 2px 12px rgba(0,0,0,0.15)', zIndex: 20, minWidth: '220px', padding: '0.5rem 0',
                                            }}>
                                                {dashboards.map((db) => (
                                                    <div
                                                        key={db}
                                                        onClick={() => { setSelectedDashboard(db); setShowAddDashboardMenu(false); setActiveTab('dashboard'); }}
                                                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', color: '#0067C5', fontWeight: 500, fontSize: '0.875rem', borderBottom: '1px solid #f0f0f0' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                    >
                                                        {db}
                                                    </div>
                                                ))}
                                                {showNewDashboardInput ? (
                                                    <div style={{ padding: '0.5rem 1rem' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Navn på dashboard..."
                                                            value={newDashboardName}
                                                            onChange={(e) => setNewDashboardName(e.target.value)}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNewDashboard(); }}
                                                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: '0.4rem' }}
                                                            autoFocus
                                                        />
                                                        <Button size="small" variant="primary" style={{ width: '100%' }} onClick={handleCreateNewDashboard}>Opprett</Button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => setShowNewDashboardInput(true)}
                                                        style={{ padding: '0.5rem 1rem', cursor: 'pointer', color: '#0067C5', fontWeight: 500, fontSize: '0.875rem' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f5f5f5'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                    >
                                                        + Opprett nytt Dashboard
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        title="Del grafvindu"
                                        style={{ border: '1px solid #d0d0d0', background: '#fff', cursor: 'pointer', borderRadius: '6px', padding: '6px 14px', fontSize: '0.85rem', color: '#444' }}
                                    >
                                        Del ↗
                                    </button>
                                </div>
                            </div>

                            {/* SQL box */}
                            <div style={boxStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: sqlOpen ? '0.75rem' : 0, justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => setSqlOpen(!sqlOpen)}
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', color: '#444', padding: '2px 4px' }}
                                            title={sqlOpen ? 'Skjul SQL' : 'Vis SQL'}
                                        >
                                            {sqlOpen ? '▼' : '▶'}
                                        </button>
                                        <BodyShort weight="semibold">SQL</BodyShort>
                                    </div>
                                    <button
                                        title="Del SQL"
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0067C5', fontSize: '1.1rem' }}
                                    >
                                        ↗
                                    </button>
                                </div>
                                {sqlOpen && (
                                    <>
                                        <SqlCodeEditor
                                            value={sqlValue}
                                            onChange={setSqlValue}
                                            height={280}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <button style={secondaryButtonStyle}>Kostnad</button>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(sqlValue)}
                                                    style={secondaryButtonStyle}
                                                >
                                                    Kopier
                                                </button>
                                                <button style={secondaryButtonStyle}>Formater</button>
                                                <button style={secondaryButtonStyle}>Valider</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </Tabs.Panel>

                {/* ═══════════════════════════════ DASHBOARD ═══════════════════════════════ */}
                <Tabs.Panel value="dashboard" className="pt-4">
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <BodyShort weight="semibold" style={{ fontSize: '1rem' }}>Dashboard-mapper</BodyShort>
                            <button
                                onClick={() => setShowNewDashboardModal(true)}
                                title="Opprett ny mappe"
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#0067C5', padding: 0, display: 'flex', alignItems: 'center' }}
                            >
                                +
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1.2rem' }}>
                            {dashboards.map((db) => (
                                <div
                                    key={db}
                                    onClick={() => setSelectedDashboard(db)}
                                    style={{
                                        padding: '1.5rem 1rem', border: selectedDashboard === db ? '2px solid #0067C5' : '1px solid #e0e0e0',
                                        borderRadius: '12px', backgroundColor: selectedDashboard === db ? '#f0f4ff' : '#ffffff',
                                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                        boxShadow: selectedDashboard === db ? '0 4px 12px rgba(0,103,197,0.15)' : '0 2px 6px rgba(0,0,0,0.07)',
                                    }}
                                    onMouseOver={(e) => { if (selectedDashboard !== db) { e.currentTarget.style.borderColor = '#c0d4ff'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                                    onMouseOut={(e) => { if (selectedDashboard !== db) { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                                >
                                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#333', wordBreak: 'break-word' }}>{db}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedDashboard && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                                <BodyShort weight="semibold" style={{ fontSize: '1.15rem' }}>{selectedDashboard}</BodyShort>
                                <button style={secondaryButtonStyle}>Importer</button>
                                <button style={secondaryButtonStyle}>Eksporter</button>
                            </div>
                            <div style={{ color: '#999', fontSize: '0.9rem', textAlign: 'center', paddingTop: '3rem' }}>
                                Ingen grafer lagt til i «{selectedDashboard}» ennå. Gå til Grafbygger-fanen og trykk «+ Legg til Dashboard».
                            </div>
                        </div>
                    )}

                    {showNewDashboardModal && (
                        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '2rem', minWidth: '380px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                                <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: '#333' }}>Opprett nytt Dashboard</h2>
                                <input
                                    type="text"
                                    placeholder="Navn på dashboard"
                                    value={newDashboardInputName}
                                    onChange={(e) => setNewDashboardInputName(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' }}
                                    autoFocus
                                />
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                    <button onClick={() => { setShowNewDashboardModal(false); setNewDashboardInputName(''); }} style={cancelButtonStyle}>Avbryt</button>
                                    <button
                                        onClick={() => {
                                            if (newDashboardInputName.trim()) {
                                                setDashboards((prev) => [...prev, newDashboardInputName.trim()]);
                                                setSelectedDashboard(newDashboardInputName.trim());
                                                setNewDashboardInputName('');
                                                setShowNewDashboardModal(false);
                                            }
                                        }}
                                        style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#0067C5', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}
                                    >
                                        Opprett
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </Tabs.Panel>
            </Tabs>
        </DashboardLayout>
    );
}

// ─── Quick filters sub-component ─────────────────────────────────────────────

function QuickFilters({
    analysisType,
    typePeriode,
    setTypePeriode,
    visning,
    setVisning,
}: {
    analysisType: string | null;
    typePeriode: string;
    setTypePeriode: (v: string) => void;
    visning: string;
    setVisning: (v: string) => void;
}) {
    if (!analysisType) {
        return <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>Velg en analysetype først for å se relevante filtre.</p>;
    }

    const isTrafikkanalyse = analysisType === 'Trafikkanalyse';

    return (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
                <label style={filterLabelStyle}>Type periode</label>
                <select value={typePeriode} onChange={(e) => setTypePeriode(e.target.value)} style={selectStyle}>
                    <option value="desember-2025">Desember 2025</option>
                    <option value="november-2025">November 2025</option>
                    <option value="egendefinert">Egendefinert</option>
                </select>
                {typePeriode === 'egendefinert' && (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem' }}>
                        <input type="date" style={{ ...selectStyle, flex: 1 }} />
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>til</span>
                        <input type="date" style={{ ...selectStyle, flex: 1 }} />
                    </div>
                )}
            </div>
            {isTrafikkanalyse && (
                <div>
                    <label style={filterLabelStyle}>Visning</label>
                    <select value={visning} onChange={(e) => setVisning(e.target.value)} style={selectStyle}>
                        <option value="besokende">Besøkende</option>
                        <option value="sidevisninger">Sidevisninger</option>
                        <option value="andel">Andel (av besøkende)</option>
                    </select>
                </div>
            )}
            {analysisType === 'Brukerlojalitet' && (
                <div>
                    <label style={filterLabelStyle}>Kohortlengde</label>
                    <select style={selectStyle}>
                        <option value="uke">Ukentlig</option>
                        <option value="maned">Månedlig</option>
                    </select>
                </div>
            )}
            {!isTrafikkanalyse && analysisType !== 'Brukerlojalitet' && (
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>Filtre for «{analysisType}» er ikke konfigurert i denne prototypen.</p>
            )}
        </div>
    );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const boxStyle: React.CSSProperties = {
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    padding: '1rem',
    backgroundColor: '#f9f9f9',
};

const boxTitleStyle: React.CSSProperties = {
    marginBottom: '0.75rem',
    display: 'block',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #a0a0a0',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
};

const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #a0a0a0',
    fontSize: '0.85rem',
    backgroundColor: '#fff',
    color: '#333',
    boxSizing: 'border-box',
};

const filterLabelStyle: React.CSSProperties = {
    fontWeight: 500,
    marginBottom: '4px',
    fontSize: '0.8rem',
    color: '#0067C5',
    display: 'block',
};

const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.7rem 1rem',
    backgroundColor: '#0067C5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
};

const secondaryButtonStyle: React.CSSProperties = {
    border: '1px solid #d0d0d0',
    background: '#fff',
    cursor: 'pointer',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '0.85rem',
    color: '#444',
};

const cancelButtonStyle: React.CSSProperties = {
    padding: '0.5rem 1.5rem',
    borderRadius: '6px',
    border: '1px solid #d0d0d0',
    backgroundColor: '#fff',
    color: '#333',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 500,
};

const dropdownContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    border: '1px solid #0067C5',
    borderRadius: '6px',
    marginTop: '4px',
    zIndex: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
};

const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    right: '28px',
    top: '-5px',
    backgroundColor: '#333',
    color: '#fff',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    whiteSpace: 'normal',
    maxWidth: '220px',
    wordWrap: 'break-word',
    zIndex: 30,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    pointerEvents: 'none',
    lineHeight: '1.4',
};
