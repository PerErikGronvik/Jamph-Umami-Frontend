import { Alert } from "@navikt/ds-react";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { getDashboard } from "../../data/dashboard";
import { normalizeUrlToPath } from "../../lib/utils";
import { AiByggerPanel } from "../../components/analysis/AiByggerPanel";
import PinnedGrid, { PinnedItem } from "../../components/dashboard/PinnedGrid";
import FilterBar from "../../components/dashboard/FilterBar";

const AKSEL_WEBSITE_ID = 'fb69e1e9-1bd3-4fd9-b700-9d035cbf44e1';
const DEFAULT_URL = 'https://aksel.nav.no/';

const Prototype3 = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const websiteId = searchParams.get("websiteId");
    const domainFromUrl = searchParams.get("domain");
    const pathsFromUrl = searchParams.getAll("path");
    const initialPaths = pathsFromUrl.length > 0 ? pathsFromUrl : ['/'];
    const pathOperator = searchParams.get("pathOperator");
    const metricTypeFromUrl = (searchParams.get("metrikk") || searchParams.get("metricType")) as 'visitors' | 'pageviews' | 'proportion' | null;
    const rawDateRangeFromUrl = searchParams.get("periode");
    const dateRangeFromUrl = rawDateRangeFromUrl === 'this-month' ? 'current_month'
        : rawDateRangeFromUrl === 'last-month' ? 'last_month'
        : rawDateRangeFromUrl;

    const dashboardId = searchParams.get("visning");
    const dashboard = getDashboard(dashboardId);

    const [isResolvingDomain, setIsResolvingDomain] = useState(false);
    const [domainResolutionError, setDomainResolutionError] = useState<string | null>(null);
    const [hasAutoAppliedFilters, setHasAutoAppliedFilters] = useState(false);
    const [selectedWebsite, setSelectedWebsite] = useState<any>(null);

    const getInitialCustomFilterValues = (): Record<string, string> => {
        const values: Record<string, string> = {};
        dashboard.customFilters?.forEach(filter => {
            if (filter.urlParam) {
                const urlSlug = searchParams.get(filter.urlParam);
                if (urlSlug) {
                    const option = filter.options.find(opt => opt.slug === urlSlug || opt.value === urlSlug);
                    values[filter.id] = option?.value || urlSlug;
                }
            }
        });
        return values;
    };

    const [customFilterValues, setCustomFilterValues] = useState<Record<string, string>>(getInitialCustomFilterValues);
    const defaultPathOperator = dashboard.defaultFilterValues?.pathOperator || pathOperator || "starts-with";

    const getStudentDateState = (range: string | null) => {
        if (range === 'last_month') return { dateRange: 'custom', startDate: new Date(2025, 10, 1), endDate: new Date(2025, 10, 30) };
        if (range === 'current_month') return { dateRange: 'custom', startDate: new Date(2025, 11, 1), endDate: new Date(2025, 11, 31) };
        return { dateRange: range || 'current_month', startDate: undefined, endDate: undefined };
    };

    const initialDateState = getStudentDateState(dateRangeFromUrl || 'last_month');

    const getInitialUrlPaths = (): string[] => {
        const initialCustomValues = getInitialCustomFilterValues();
        for (const filter of dashboard.customFilters || []) {
            if (filter.appliesTo === 'urlPath' && filter.urlParam) {
                const value = initialCustomValues[filter.id];
                if (value) return [normalizeUrlToPath(value)];
            }
        }
        return initialPaths.map(p => normalizeUrlToPath(p));
    };

    const initialUrlPathsFromCustomFilter = getInitialUrlPaths();

    const [tempPathOperator, setTempPathOperator] = useState(defaultPathOperator);
    const [tempUrlPaths, setTempUrlPaths] = useState<string[]>(initialUrlPathsFromCustomFilter);
    const [tempDateRange, setTempDateRange] = useState(initialDateState.dateRange);
    const [tempMetricType, setTempMetricType] = useState<'visitors' | 'pageviews' | 'proportion'>(metricTypeFromUrl || 'visitors');
    const [customStartDate, setCustomStartDate] = useState<Date | undefined>(initialDateState.startDate);
    const [customEndDate, setCustomEndDate] = useState<Date | undefined>(initialDateState.endDate);
    const DEFAULT_WIDGETS: Array<{ id: string; sql: string; chartType: string; result: null; size: { cols: number; rows: number }; title: string }> = [
        {
            id: 'default-1',
            chartType: 'statcards',
            size: { cols: 2, rows: 1 },
            title: 'Nøkkeltall – aksel.nav.no 2025',
            result: null,
            sql: `WITH sessions AS (
  SELECT session_id, COUNT(*) AS page_count, COUNTIF(event_type = 2) AS event_count
  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE event_type IN (1, 2) AND website_id = '${AKSEL_WEBSITE_ID}'
    AND EXTRACT(YEAR FROM created_at) = 2025
  GROUP BY session_id
)
SELECT 'Unike besøkende' AS kategori, COUNT(*) AS sesjoner FROM sessions
UNION ALL SELECT 'Utførte handlinger', COUNTIF(event_count > 0) FROM sessions
UNION ALL SELECT 'Navigering uten handling', COUNTIF(event_count = 0 AND page_count > 1) FROM sessions
UNION ALL SELECT 'Forlot nettstedet', COUNTIF(page_count = 1 AND event_count = 0) FROM sessions;`,
        },
        {
            id: 'default-2',
            chartType: 'areachart',
            size: { cols: 2, rows: 1 },
            title: 'Daglige sidevisninger 2025',
            result: null,
            sql: `SELECT FORMAT_TIMESTAMP('%Y-%m-%d', created_at) AS dato, COUNT(*) AS sidevisninger
FROM \`fagtorsdag-prod-81a6.umami_student.event\`
WHERE event_type = 1 AND website_id = '${AKSEL_WEBSITE_ID}'
  AND EXTRACT(YEAR FROM created_at) = 2025
GROUP BY dato ORDER BY dato ASC;`,
        },
        {
            id: 'default-3',
            chartType: 'table',
            size: { cols: 2, rows: 1 },
            title: 'Handlinger på aksel.nav.no',
            result: null,
            sql: `WITH sessions_on_page AS (
  SELECT DISTINCT session_id
  FROM \`fagtorsdag-prod-81a6.umami_student.event\`
  WHERE event_type = 2 AND website_id = '${AKSEL_WEBSITE_ID}'
    AND EXTRACT(YEAR FROM created_at) = 2025
),
events_labeled AS (
  SELECT e.session_id, e.event_id, e.created_at,
    CASE WHEN e.event_name = 'navigere' THEN
      CONCAT(COALESCE(MAX(CASE WHEN p.data_key = 'kilde' THEN p.string_value END), '?'), ' → ',
             COALESCE(MAX(CASE WHEN p.data_key = 'url' THEN p.string_value END), '?'))
    ELSE e.event_name END AS handling
  FROM sessions_on_page s
  JOIN \`fagtorsdag-prod-81a6.umami_student.event\` e
    ON s.session_id = e.session_id AND e.website_id = '${AKSEL_WEBSITE_ID}' AND e.event_type = 2
    AND EXTRACT(YEAR FROM e.created_at) = 2025
  LEFT JOIN \`fagtorsdag-prod-81a6.umami_student.event_data\` d
    ON e.event_id = d.website_event_id AND e.website_id = d.website_id AND e.created_at = d.created_at
  LEFT JOIN UNNEST(d.event_parameters) AS p
  GROUP BY e.session_id, e.event_id, e.event_name, e.created_at
),
events_numbered AS (
  SELECT session_id, handling,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) AS steg_num
  FROM events_labeled
),
total AS (SELECT COUNT(*) AS n FROM sessions_on_page),
pivoted AS (
  SELECT session_id,
    MAX(CASE WHEN steg_num = 1 THEN handling END) AS steg_1,
    MAX(CASE WHEN steg_num = 2 THEN handling END) AS steg_2,
    MAX(CASE WHEN steg_num = 3 THEN handling END) AS steg_3,
    MAX(CASE WHEN steg_num = 4 THEN handling END) AS steg_4,
    MAX(CASE WHEN steg_num = 5 THEN handling END) AS steg_5
  FROM events_numbered GROUP BY session_id
)
SELECT COUNT(*) AS antall,
  CONCAT(ROUND(COUNT(*) * 100.0 / MAX(total.n), 1), '%') AS andel,
  COALESCE(steg_1, '(ingen hendelser)') AS steg_1,
  COALESCE(steg_2, '-') AS steg_2, COALESCE(steg_3, '-') AS steg_3,
  COALESCE(steg_4, '-') AS steg_4, COALESCE(steg_5, '-') AS steg_5
FROM pivoted, total
GROUP BY steg_1, steg_2, steg_3, steg_4, steg_5
ORDER BY antall DESC LIMIT 20;`,
        },
        {
            id: 'default-4',
            chartType: 'barchart',
            size: { cols: 2, rows: 1 },
            title: 'Sidevisninger per måned 2025',
            result: null,
            sql: `SELECT EXTRACT(MONTH FROM created_at) AS maaned, COUNT(*) AS sidevisninger
FROM \`fagtorsdag-prod-81a6.umami_student.event\`
WHERE event_type = 1 AND website_id = '${AKSEL_WEBSITE_ID}'
  AND EXTRACT(YEAR FROM created_at) = 2025
GROUP BY maaned ORDER BY maaned ASC;`,
        },
        {
            id: 'default-5',
            chartType: 'table',
            size: { cols: 1, rows: 1 },
            title: 'Topp 12 undersider 2025',
            result: null,
            sql: `SELECT url_path AS side, COUNT(*) AS sidevisninger
FROM \`fagtorsdag-prod-81a6.umami_student.event\`
WHERE event_type = 1 AND website_id = '${AKSEL_WEBSITE_ID}'
  AND EXTRACT(YEAR FROM created_at) = 2025
GROUP BY side ORDER BY sidevisninger DESC LIMIT 12;`,
        },
        {
            id: 'default-7',
            chartType: 'piechart',
            size: { cols: 1, rows: 2 },
            title: 'Trafikkilder 2025',
            result: null,
            sql: `SELECT COALESCE(NULLIF(referrer_domain, ''), '(direkte)') AS kilde,
  COUNT(*) AS sidevisninger
FROM \`fagtorsdag-prod-81a6.umami_student.event\`
WHERE event_type = 1 AND website_id = '${AKSEL_WEBSITE_ID}'
  AND EXTRACT(YEAR FROM created_at) = 2025
GROUP BY kilde ORDER BY sidevisninger DESC LIMIT 10;`,
        },
        {
            id: 'default-6',
            chartType: 'barchart',
            size: { cols: 1, rows: 1 },
            title: 'Operativsystem 2025',
            result: null,
            sql: `SELECT COALESCE(NULLIF(s.os, ''), '(ukjent)') AS operativsystem,
  COUNT(DISTINCT e.session_id) AS unike_besokende
FROM \`fagtorsdag-prod-81a6.umami_student.event\` e
LEFT JOIN \`fagtorsdag-prod-81a6.umami_student.session\` s ON e.session_id = s.session_id
WHERE e.event_type = 1 AND e.website_id = '${AKSEL_WEBSITE_ID}'
  AND EXTRACT(YEAR FROM e.created_at) = 2025
GROUP BY operativsystem ORDER BY unike_besokende DESC LIMIT 8;`,
        },
    ];

    const [customWidgets, setCustomWidgets] = useState<Array<{ id: string; sql: string; chartType: string; result: any; size: { cols: number; rows: number }; title: string }>>(DEFAULT_WIDGETS);
    const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_WIDGETS.map(w => w.id));

    const [activeFilters, setActiveFilters] = useState({
        pathOperator: defaultPathOperator,
        urlFilters: initialUrlPathsFromCustomFilter,
        dateRange: initialDateState.dateRange,
        customStartDate: initialDateState.startDate,
        customEndDate: initialDateState.endDate,
        metricType: (metricTypeFromUrl || 'visitors') as 'visitors' | 'pageviews' | 'proportion',
    });

    const effectiveWebsiteId = websiteId || AKSEL_WEBSITE_ID;

    const getVisualDateRange = () => {
        if (tempDateRange === 'custom' && customStartDate && customEndDate) {
            const isDec2025 = customStartDate.getFullYear() === 2025 && customStartDate.getMonth() === 11 && customStartDate.getDate() === 1
                && customEndDate.getFullYear() === 2025 && customEndDate.getMonth() === 11 && customEndDate.getDate() === 31;
            const isNov2025 = customStartDate.getFullYear() === 2025 && customStartDate.getMonth() === 10 && customStartDate.getDate() === 1
                && customEndDate.getFullYear() === 2025 && customEndDate.getMonth() === 10 && customEndDate.getDate() === 30;
            if (isDec2025) return 'current_month';
            if (isNov2025) return 'last_month';
        }
        return tempDateRange;
    };

    const normalizeDomain = (domain: string) => (domain === "www.nav.no" ? domain : domain.replace(/^www\./, ""));

    useEffect(() => {
        const resolveDomainToWebsiteId = async () => {
            if (websiteId || !domainFromUrl) return;
            setIsResolvingDomain(true);
            setDomainResolutionError(null);
            try {
                const response = await fetch('/api/bigquery/websites');
                const data = await response.json();
                const websitesData = data.data || [];
                const relevantTeams = ['aa113c34-e213-4ed6-a4f0-0aea8a503e6b', 'bceb3300-a2fb-4f73-8cec-7e3673072b30'];
                const prodWebsites = websitesData.filter((w: any) => relevantTeams.includes(w.teamId));
                const filteredWebsites = prodWebsites.filter((item: any) => item.domain !== "nav.no");
                let inputDomain = domainFromUrl === "nav.no" ? "www.nav.no" : domainFromUrl;
                const normalizedInput = normalizeDomain(inputDomain);
                const matchedWebsite = filteredWebsites.find((item: any) =>
                    normalizeDomain(item.domain) === normalizedInput ||
                    normalizedInput.endsWith(`.${normalizeDomain(item.domain)} `)
                );
                if (matchedWebsite) {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('websiteId', matchedWebsite.id);
                    newParams.delete('domain');
                    setSearchParams(newParams, { replace: true });
                    setSelectedWebsite(matchedWebsite);
                } else {
                    setDomainResolutionError(`Fant ingen nettside for domenet "${domainFromUrl}"`);
                }
            } catch {
                setDomainResolutionError('Kunne ikke slå opp domenet');
            } finally {
                setIsResolvingDomain(false);
            }
        };
        resolveDomainToWebsiteId();
    }, [domainFromUrl, websiteId, searchParams, setSearchParams]);

    useEffect(() => {
        if (!hasAutoAppliedFilters && selectedWebsite && initialPaths.length > 0) {
            const autoDateState = getStudentDateState("current_month");
            setActiveFilters({
                pathOperator: pathOperator || "equals",
                urlFilters: initialPaths.map(p => normalizeUrlToPath(p)),
                dateRange: autoDateState.dateRange,
                customStartDate: autoDateState.startDate,
                customEndDate: autoDateState.endDate,
                metricType: metricTypeFromUrl || 'visitors',
            });
            setHasAutoAppliedFilters(true);
        }
    }, [selectedWebsite, initialPaths, pathOperator, hasAutoAppliedFilters, metricTypeFromUrl]);

    const handleUpdate = () => {
        const url = new URL(window.location.href);
        if (!dashboard.hiddenFilters?.website && selectedWebsite) {
            url.searchParams.set('websiteId', selectedWebsite.id);
            url.searchParams.delete('path');
            tempUrlPaths.forEach(p => { if (p) url.searchParams.append('path', p); });
            if (tempPathOperator && tempPathOperator !== "equals") url.searchParams.set('pathOperator', tempPathOperator);
            else url.searchParams.delete('pathOperator');
        }
        const visualRange = getVisualDateRange();
        if (visualRange !== 'current_month') url.searchParams.set('periode', visualRange);
        else url.searchParams.delete('periode');
        if (tempMetricType && tempMetricType !== "visitors") url.searchParams.set('metrikk', tempMetricType);
        else url.searchParams.delete('metrikk');
        setSearchParams(url.searchParams);
        setActiveFilters({
            pathOperator: tempPathOperator,
            urlFilters: tempUrlPaths,
            dateRange: tempDateRange,
            customStartDate: tempDateRange === 'custom' ? customStartDate : undefined,
            customEndDate: tempDateRange === 'custom' ? customEndDate : undefined,
            metricType: tempMetricType,
        });
    };

    const handleUrlResolved = (resolvedWebsiteId: string, domain: string, name: string, pathname: string, operator: string) => {
        setSelectedWebsite({ id: resolvedWebsiteId, domain, name });
        setTempUrlPaths([pathname]);
        setTempPathOperator(operator as 'equals' | 'starts-with');
    };

    const handleCustomFilterChange = (filterId: string, value: string) => {
        setCustomFilterValues(prev => ({ ...prev, [filterId]: value }));
        const filterDef = dashboard.customFilters?.find(f => f.id === filterId);
        if (!filterDef) return;
        if (filterDef.urlParam) {
            const url = new URL(window.location.href);
            if (value) {
                const urlValue = filterDef.options.find(opt => opt.value === value)?.slug || value;
                url.searchParams.set(filterDef.urlParam, urlValue);
            } else {
                url.searchParams.delete(filterDef.urlParam);
            }
            setSearchParams(url.searchParams);
        }
        if (filterDef.appliesTo === 'urlPath') {
            setTempUrlPaths(value ? [value] : []);
            setTempPathOperator(filterDef.pathOperator ?? defaultPathOperator);
        }
    };

    const arraysEqual = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
    const datesEqual = (a: Date | undefined, b: Date | undefined) => {
        if (!a && !b) return true;
        if (!a || !b) return false;
        return a.getTime() === b.getTime();
    };

    const hasChanges =
        tempDateRange !== activeFilters.dateRange ||
        !arraysEqual(tempUrlPaths, activeFilters.urlFilters) ||
        tempPathOperator !== activeFilters.pathOperator ||
        tempMetricType !== activeFilters.metricType ||
        (!dashboard.hiddenFilters?.website && selectedWebsite && selectedWebsite.id !== websiteId) ||
        (tempDateRange === 'custom' && (
            !datesEqual(customStartDate, activeFilters.customStartDate) ||
            !datesEqual(customEndDate, activeFilters.customEndDate)
        ));

    const requiredFiltersAreSatisfied = useMemo(() => {
        if (!dashboard.customFilters) return true;
        const required = dashboard.customFilters.filter(f => f.required);
        return required.every(f => f.appliesTo === 'urlPath' ? activeFilters.urlFilters.length > 0 : !!customFilterValues[f.id]);
    }, [dashboard.customFilters, activeFilters.urlFilters, customFilterValues]);

    // Build the ordered widget list for PinnedGrid
    const customWidgetMap = new Map(customWidgets.map(cw => [cw.id, cw]));
    const pinnedWidgets = widgetOrder
        .map(id => { const cw = customWidgetMap.get(id); return cw ? { id, customWidget: cw, colSpan: cw.size?.cols ?? 1, rowSpan: cw.size?.rows ?? 1 } : null; })
        .filter(w => w !== null) as PinnedItem[];

    const handleReorder = (fromId: string, toId: string) => {
        setWidgetOrder(prev => {
            const arr = [...prev];
            const from = arr.indexOf(fromId);
            const to = arr.indexOf(toId);
            if (from !== -1 && to !== -1) [arr[from], arr[to]] = [arr[to], arr[from]];
            return arr;
        });
    };

    const handleDeleteWidget = (id: string) => {
        setCustomWidgets(prev => prev.filter(cw => cw.id !== id));
        setWidgetOrder(prev => prev.filter(prevId => prevId !== id));
    };

    return (
        <DashboardLayout
            title={`Prototype 3 – ${dashboard.title}`}
            description={dashboard.description}
            filters={
                <FilterBar
                    dashboard={dashboard}
                    defaultUrlFormValue={domainFromUrl ? `https://${domainFromUrl}${searchParams.get('path') || '/'}` : DEFAULT_URL}
                    tempDateRange={tempDateRange}
                    setTempDateRange={setTempDateRange}
                    customStartDate={customStartDate}
                    setCustomStartDate={setCustomStartDate}
                    customEndDate={customEndDate}
                    setCustomEndDate={setCustomEndDate}
                    visualDateRange={getVisualDateRange()}
                    tempMetricType={tempMetricType}
                    setTempMetricType={setTempMetricType}
                    customFilterValues={customFilterValues}
                    onCustomFilterChange={handleCustomFilterChange}
                    hasChanges={hasChanges}
                    onUpdate={handleUpdate}
                    onUrlResolved={handleUrlResolved}
                />
            }
            hideHeader
        >
            {isResolvingDomain ? null : domainResolutionError ? (
                <div className="p-8 col-span-full">
                    <Alert variant="error" size="small">{domainResolutionError}</Alert>
                </div>
            ) : !effectiveWebsiteId ? (
                <div className="w-fit">
                    <Alert variant="info" size="small">Legg til URL-sti og trykk Oppdater for å vise statistikk.</Alert>
                </div>
            ) : !requiredFiltersAreSatisfied ? (
                <div className="w-fit">
                    <Alert variant="info" size="small">
                        {dashboard.customFilterRequiredMessage || "Velg nødvendige filtre for å vise data."}
                    </Alert>
                </div>
            ) : (
                <div>
                    <PinnedGrid
                        widgets={pinnedWidgets}
                        onReorder={handleReorder}
                        onDelete={handleDeleteWidget}
                    />
                    {/* AI-bygger – full width, below the pinned grid */}
                    <div style={{ border: '1px solid #e0e0e0', aspectRatio: '5/4', overflow: 'hidden', position: 'relative' }}>
                        <AiByggerPanel
                            websiteId={effectiveWebsiteId}
                            path={activeFilters.urlFilters[0] || '/'}
                            pathOperator={activeFilters.pathOperator || 'starts-with'}
                            startDate={activeFilters.customStartDate}
                            endDate={activeFilters.customEndDate}
                            onAddWidget={(sql, chartType, result, size, title) => {
                                const id = crypto.randomUUID();
                                setCustomWidgets(prev => [...prev, { id, sql, chartType, result, size, title: title || '' }]);
                                setWidgetOrder(prev => [...prev, id]);
                            }}
                        />
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Prototype3;
