// Alle støttede widgettyper i dashbordet (jf. krav K3).
export type DashboardWidgetType =
    | 'table' | 'regresjon' | 'linechart' | 'areachart' | 'barchart'
    | 'piechart' | 'statcards' | 'stegvisning' | 'kiforklaring'
    | 'pageflow' | 'metrics';

export interface DashboardWidgetSize {
    cols: number;
    rows: number;
}

// Definisjon av en widget slik den lagres i defaultWidgets.json (jf. krav K6).
export interface DashboardWidgetDefinition {
    id: string;
    title: string;
    chartType: string;          // løst typet; valideres til DashboardWidgetType ved kjøring
    sql: string;
    aiPrompt?: string;
    size: DashboardWidgetSize;
}

// Utvidet versjon med faktisk resultat (returnert av useDashboardWidgetResolver):
export interface DashboardWidgetResolved extends DashboardWidgetDefinition {
    chartType: DashboardWidgetType;
    result: { success: boolean; data: unknown[]; rowCount: number };
}
