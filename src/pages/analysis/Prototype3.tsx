// Prototype 3 — isolated copy of Dashboard.tsx
import { Alert, Select, Button, Modal, DatePicker } from "@navikt/ds-react";
import { useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { getDashboard } from "../../data/dashboard";
import { format } from "date-fns";
import { normalizeUrlToPath } from "../../lib/utils";
import UrlSearchForm from "../../components/dashboard/UrlSearchForm";
import { AiByggerPanel } from "../../components/analysis/AiByggerPanel";
import ResultsPanel from "../../components/chartbuilder/results/ResultsPanel";
import { useChartDataPrep } from "../../lib/useChartDataPrep";

const AKSEL_WEBSITE_ID = 'fb69e1e9-1bd3-4fd9-b700-9d035cbf44e1';
const DEFAULT_URL = 'https://aksel.nav.no/';

/** Renders a pinned result (snapshot from AI bygger) as a chart/table cell. */
function CustomResultWidget({ result, chartType, sql }: { result: any; chartType: string; sql: string }) {
    const { prepareLineChartData, prepareBarChartData, preparePieChartData } = useChartDataPrep(result);
    const extractWebsiteId = (s: string) => /website_id\s*=\s*['"]([0-9a-f-]{36})['"]/i.exec(s)?.[1];
    return (
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#fff' }}>
            <ResultsPanel
                result={result} loading={false} error={null}
                queryStats={result?.queryStats} lastAction={null}
                showLoadingMessage={false} executeQuery={() => {}} handleRetry={() => {}}
                prepareLineChartData={prepareLineChartData}
                prepareBarChartData={prepareBarChartData}
                preparePieChartData={preparePieChartData}
                sql={sql} websiteId={extractWebsiteId(sql)}
                containerStyle="none" hideHeading hideInternalShareButton hideInternalDownloadButton
                hideTabsList hideControls externalTab={chartType} onExternalTabChange={() => {}}
            />
        </div>
    );
}

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
                    const option = filter.options.find(opt =>
                        opt.slug === urlSlug || opt.value === urlSlug
                    );
                    values[filter.id] = option?.value || urlSlug;
                }
            }
        });
        return values;
    };

    const [customFilterValues, setCustomFilterValues] = useState<Record<string, string>>(getInitialCustomFilterValues);
    const defaultPathOperator = dashboard.defaultFilterValues?.pathOperator || pathOperator || "starts-with";

    const getStudentDateState = (range: string | null) => {
        if (range === 'last_month') {
            return { dateRange: 'custom', startDate: new Date(2025, 10, 1), endDate: new Date(2025, 10, 30) };
        }
        if (range === 'current_month') {
            return { dateRange: 'custom', startDate: new Date(2025, 11, 1), endDate: new Date(2025, 11, 31) };
        }
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
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const dateModalRef = useRef<HTMLDialogElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const [gridRowHeight, setGridRowHeight] = useState(0);
    const [customWidgets, setCustomWidgets] = useState<Array<{ id: string; sql: string; chartType: string; result: any }>>([]);
    const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
    const [dragId, setDragId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [overDelete, setOverDelete] = useState(false);

    useEffect(() => {
        const el = gridContainerRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            // row height = half container width × (4/5) to match aspect-ratio 5/4 at 50% width
            setGridRowHeight(entry.contentRect.width / 2 * (4 / 5));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const [activeFilters, setActiveFilters] = useState({
        pathOperator: defaultPathOperator,
        urlFilters: initialUrlPathsFromCustomFilter,
        dateRange: initialDateState.dateRange,
        customStartDate: initialDateState.startDate,
        customEndDate: initialDateState.endDate,
        metricType: (metricTypeFromUrl || 'visitors') as 'visitors' | 'pageviews' | 'proportion'
    });


    const effectiveWebsiteId = websiteId || AKSEL_WEBSITE_ID;

    const getVisualDateRange = () => {
        if (tempDateRange === 'custom' && customStartDate && customEndDate) {
            const isDec2025 = customStartDate.getFullYear() === 2025 && customStartDate.getMonth() === 11 && customStartDate.getDate() === 1 &&
                customEndDate.getFullYear() === 2025 && customEndDate.getMonth() === 11 && customEndDate.getDate() === 31;
            const isNov2025 = customStartDate.getFullYear() === 2025 && customStartDate.getMonth() === 10 && customStartDate.getDate() === 1 &&
                customEndDate.getFullYear() === 2025 && customEndDate.getMonth() === 10 && customEndDate.getDate() === 30;
            if (isDec2025) return 'current_month';
            if (isNov2025) return 'last_month';
        }
        return tempDateRange;
    };

    const normalizeDomain = (domain: string) => {
        if (domain === "www.nav.no") return domain;
        return domain.replace(/^www\./, "");
    };

    useEffect(() => {
        const resolveDomainToWebsiteId = async () => {
            if (websiteId || !domainFromUrl) return;
            setIsResolvingDomain(true);
            setDomainResolutionError(null);
            try {
                const response = await fetch('/api/bigquery/websites');
                const data = await response.json();
                const websitesData = data.data || [];
                const relevantTeams = [
                    'aa113c34-e213-4ed6-a4f0-0aea8a503e6b',
                    'bceb3300-a2fb-4f73-8cec-7e3673072b30'
                ];
                const prodWebsites = websitesData.filter((website: any) => relevantTeams.includes(website.teamId));
                const filteredWebsites = prodWebsites.filter((item: any) => item.domain !== "nav.no");
                let inputDomain = domainFromUrl;
                if (inputDomain === "nav.no") inputDomain = "www.nav.no";
                const normalizedInputDomain = normalizeDomain(inputDomain);
                const matchedWebsite = filteredWebsites.find((item: any) =>
                    normalizeDomain(item.domain) === normalizedInputDomain ||
                    normalizedInputDomain.endsWith(`.${normalizeDomain(item.domain)} `)
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
            } catch (error) {
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
                metricType: metricTypeFromUrl || 'visitors'
            });
            setHasAutoAppliedFilters(true);
        }
    }, [selectedWebsite, initialPaths, pathOperator, hasAutoAppliedFilters, metricTypeFromUrl]);

    const handleUpdate = (overridePathOperator?: string) => {
        const url = new URL(window.location.href);
        const effectivePathOperator = overridePathOperator || tempPathOperator;
        if (!dashboard.hiddenFilters?.website && selectedWebsite) {
            url.searchParams.set('websiteId', selectedWebsite.id);
            url.searchParams.delete('path');
            tempUrlPaths.forEach(p => { if (p) url.searchParams.append('path', p); });
            if (effectivePathOperator && effectivePathOperator !== "equals") {
                url.searchParams.set('pathOperator', effectivePathOperator);
            } else {
                url.searchParams.delete('pathOperator');
            }
        }
        const visualRange = getVisualDateRange();
        if (visualRange !== 'current_month') {
            url.searchParams.set('periode', visualRange);
        } else {
            url.searchParams.delete('periode');
        }
        if (tempMetricType && tempMetricType !== "visitors") {
            url.searchParams.set('metrikk', tempMetricType);
        } else {
            url.searchParams.delete('metrikk');
        }
        setSearchParams(url.searchParams);
        setActiveFilters({
            pathOperator: effectivePathOperator,
            urlFilters: tempUrlPaths,
            dateRange: tempDateRange,
            customStartDate: tempDateRange === 'custom' ? customStartDate : undefined,
            customEndDate: tempDateRange === 'custom' ? customEndDate : undefined,
            metricType: tempMetricType
        });
    };

    const handleCustomFilterChange = (filterId: string, value: string) => {
        setCustomFilterValues(prev => ({ ...prev, [filterId]: value }));
        const filterDef = dashboard.customFilters?.find(f => f.id === filterId);
        if (filterDef) {
            if (filterDef.urlParam) {
                const url = new URL(window.location.href);
                if (value) {
                    const option = filterDef.options.find(opt => opt.value === value);
                    const urlValue = option?.slug || value;
                    url.searchParams.set(filterDef.urlParam, urlValue);
                } else {
                    url.searchParams.delete(filterDef.urlParam);
                }
                setSearchParams(url.searchParams);
            }
            if (filterDef.appliesTo === 'urlPath') {
                if (value) {
                    setTempUrlPaths([value]);
                    setTempPathOperator(filterDef.pathOperator);
                } else {
                    setTempUrlPaths([]);
                }
            }
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
        const requiredFilters = dashboard.customFilters.filter(f => f.required);
        if (requiredFilters.length === 0) return true;
        return requiredFilters.every(filter => {
            if (filter.appliesTo === 'urlPath') return activeFilters.urlFilters.length > 0;
            return !!customFilterValues[filter.id];
        });
    }, [dashboard.customFilters, activeFilters.urlFilters, customFilterValues]);

    const filters = (
        <>
            <div className="w-full mb-2">
                <UrlSearchForm
                    targetPath="/prototype3"
                    defaultValue={domainFromUrl ? `https://${domainFromUrl}${searchParams.get('path') || '/'}` : DEFAULT_URL}
                />
            </div>

            {dashboard.customFilters?.map(filter => (
                <div key={filter.id} className="w-full sm:w-auto min-w-[200px]">
                    <Select
                        label={filter.label}
                        size="small"
                        value={customFilterValues[filter.id] || ''}
                        onChange={(e) => handleCustomFilterChange(filter.id, e.target.value)}
                    >
                        <option value="">Velg {filter.label.toLowerCase()}</option>
                        {filter.options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>
                </div>
            ))}

            {!dashboard.hiddenFilters?.dateRange && (
                <div className="w-full sm:w-auto min-w-[200px]">
                    <Select
                        label="Datoperiode"
                        size="small"
                        value={getVisualDateRange()}
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'custom') {
                                setIsDateModalOpen(true);
                            } else if (value === 'custom-edit') {
                                setCustomStartDate(undefined);
                                setCustomEndDate(undefined);
                                setIsDateModalOpen(true);
                            } else if (value === 'current_month') {
                                setTempDateRange('custom');
                                setCustomStartDate(new Date(2025, 11, 1));
                                setCustomEndDate(new Date(2025, 11, 31));
                            } else if (value === 'last_month') {
                                setTempDateRange('custom');
                                setCustomStartDate(new Date(2025, 10, 1));
                                setCustomEndDate(new Date(2025, 10, 30));
                            } else {
                                setTempDateRange(value);
                            }
                        }}
                    >
                        <option value="current_month">Desember 2025</option>
                        <option value="last_month">November 2025</option>
                        {tempDateRange === 'custom' && customStartDate && customEndDate && getVisualDateRange() === 'custom' ? (
                            <>
                                <option value="custom">{`${format(customStartDate, 'dd.MM.yy')} - ${format(customEndDate, 'dd.MM.yy')} `}</option>
                                <option value="custom-edit">Endre datoer</option>
                            </>
                        ) : (
                            <option value="custom">Egendefinert</option>
                        )}
                    </Select>
                </div>
            )}

            {!dashboard.hiddenFilters?.metricType && (
                <div className="w-full sm:w-auto min-w-[150px]">
                    <Select
                        label="Visning"
                        size="small"
                        value={tempMetricType}
                        onChange={(e) => setTempMetricType(e.target.value as 'visitors' | 'pageviews' | 'proportion')}
                    >
                        {(!dashboard.metricTypeOptions || dashboard.metricTypeOptions.includes('visitors')) && (
                            <option value="visitors">Unike besøkende</option>
                        )}
                        {(!dashboard.metricTypeOptions || dashboard.metricTypeOptions.includes('pageviews')) && (
                            <option value="pageviews">Sidevisninger</option>
                        )}
                        {(!dashboard.metricTypeOptions || dashboard.metricTypeOptions.includes('proportion')) && (
                            <option value="proportion">Andel (%)</option>
                        )}
                    </Select>
                </div>
            )}

            <div className="flex items-end pb-[2px]">
                <Button onClick={() => handleUpdate()} size="small" disabled={!hasChanges}>
                    Oppdater
                </Button>
            </div>

            <Modal
                ref={dateModalRef}
                open={isDateModalOpen}
                onClose={() => setIsDateModalOpen(false)}
                header={{ heading: "Velg datoperiode", closeButton: true }}
            >
                <Modal.Body>
                    <div className="flex flex-col gap-4">
                        <DatePicker
                            mode="range"
                            selected={{ from: customStartDate, to: customEndDate }}
                            onSelect={(range) => {
                                if (range) {
                                    setCustomStartDate(range.from);
                                    setCustomEndDate(range.to);
                                }
                            }}
                        >
                            <div className="flex flex-col gap-2">
                                <DatePicker.Input id="p3-start-date" label="Fra dato" size="small"
                                    value={customStartDate ? format(customStartDate, 'dd.MM.yyyy') : ''} />
                                <DatePicker.Input id="p3-end-date" label="Til dato" size="small"
                                    value={customEndDate ? format(customEndDate, 'dd.MM.yyyy') : ''} />
                            </div>
                        </DatePicker>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => { if (customStartDate && customEndDate) { setTempDateRange('custom'); setIsDateModalOpen(false); } }}
                        disabled={!customStartDate || !customEndDate}>
                        Bruk datoer
                    </Button>
                    <Button variant="secondary" onClick={() => setIsDateModalOpen(false)}>Avbryt</Button>
                </Modal.Footer>
            </Modal>
        </>
    );

    // Widget list — pinned AI charts only, ordered by widgetOrder
    const customWidgetMap = new Map(customWidgets.map(cw => [cw.id, cw]));
    const widgets = widgetOrder
        .map(id => { const cw = customWidgetMap.get(id); return cw ? { id, customWidget: cw, colSpan: 1, rowSpan: 1 } : null; })
        .filter((w): w is NonNullable<typeof w> => w !== null);
    const guideRows = Math.max(Math.ceil(widgets.length / 2), 1);
    const guideCells = guideRows * 2;

    const handleDrop = (targetId: string) => {
        if (!dragId || dragId === targetId) return;
        setWidgetOrder(prev => {
            const arr = [...prev];
            const from = arr.indexOf(dragId);
            const to = arr.indexOf(targetId);
            if (from !== -1 && to !== -1) [arr[from], arr[to]] = [arr[to], arr[from]];
            return arr;
        });
        setDragId(null);
        setOverId(null);
    };

    const handleDeleteDrop = () => {
        if (!dragId || dragId === '__line__') return;
        setCustomWidgets(prev => prev.filter(cw => cw.id !== dragId));
        setWidgetOrder(prev => prev.filter(id => id !== dragId));
        setDragId(null);
        setOverDelete(false);
    };

    return (
        <DashboardLayout
            title={`Prototype 3 — ${dashboard.title}`}
            description={dashboard.description}
            filters={filters}
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
                    {/* Pinned chart grid — only shown once at least one widget exists */}
                    {widgets.length > 0 && (
                        <div ref={gridContainerRef} style={{ position: 'relative' }}>
                            {/* Guide layer — invisible cells that establish row heights */}
                            <div className="grid grid-cols-2 gap-0" style={{ pointerEvents: 'none' }}>
                                {Array.from({ length: guideCells }).map((_, i) => (
                                    <div key={i} style={{ aspectRatio: '5/4' }} />
                                ))}
                            </div>
                            {/* Content layer — absolute overlay, cells sized by gridAutoRows */}
                            <div
                                className="grid grid-cols-2 gap-0"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    gridAutoRows: gridRowHeight > 0 ? `${gridRowHeight}px` : undefined,
                                }}
                            >
                            {widgets.map((w) => {
                                const cw = w.customWidget;
                                const isOver = overId === w.id && dragId !== w.id;
                                const isDragging = dragId === w.id;
                                return (
                                    <div
                                        key={w.id}
                                        draggable
                                        onDragStart={() => setDragId(w.id)}
                                        onDragEnd={() => { setDragId(null); setOverId(null); setOverDelete(false); }}
                                        onDragEnter={(e) => { e.preventDefault(); if (dragId !== w.id) setOverId(w.id); }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverId(prev => prev === w.id ? null : prev); }}
                                        onDrop={(e) => { e.preventDefault(); handleDrop(w.id); }}
                                        style={{
                                            gridColumn: `span ${w.colSpan}`,
                                            gridRow: `span ${w.rowSpan}`,
                                            position: 'relative',
                                            overflow: 'hidden',
                                            border: '1px solid #e0e0e0',
                                            background: '#fff',
                                            opacity: isDragging ? 0.35 : 1,
                                            transition: 'opacity 0.15s',
                                            cursor: 'grab',
                                        }}
                                    >
                                        {isOver && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 10, pointerEvents: 'none' }} />
                                        )}
                                        <CustomResultWidget result={cw.result} chartType={cw.chartType} sql={cw.sql} />
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    )}

                    {/* Delete zone — appears at bottom-center while dragging */}
                    {dragId && (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                padding: '16px 0 8px',
                                pointerEvents: 'none',
                            }}
                        >
                            <div
                                onDragEnter={(e) => { e.preventDefault(); setOverDelete(true); }}
                                onDragOver={(e) => e.preventDefault()}
                                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverDelete(false); }}
                                onDrop={(e) => { e.preventDefault(); handleDeleteDrop(); }}
                                style={{
                                    pointerEvents: 'all',
                                    width: 56,
                                    height: 56,
                                    borderRadius: '50%',
                                    background: overDelete ? '#c0392b' : '#e74c3c',
                                    border: `3px solid ${overDelete ? '#922b21' : '#c0392b'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'copy',
                                    transform: overDelete ? 'scale(1.18)' : 'scale(1)',
                                    transition: 'transform 0.12s, background 0.12s, border-color 0.12s',
                                    boxShadow: overDelete ? '0 4px 16px rgba(192,57,43,0.5)' : '0 2px 8px rgba(0,0,0,0.2)',
                                }}
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* AI-bygger — full width, below the grid */}
                    <div style={{ border: '1px solid #e0e0e0', aspectRatio: '5/4', overflow: 'hidden', position: 'relative' }}>
                        <AiByggerPanel
                            websiteId={effectiveWebsiteId}
                            path={activeFilters.urlFilters[0] || '/'}
                            pathOperator={activeFilters.pathOperator || 'starts-with'}
                            onAddWidget={(sql, chartType, result) => {
                                const id = crypto.randomUUID();
                                setCustomWidgets(prev => [...prev, { id, sql, chartType, result }]);
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
