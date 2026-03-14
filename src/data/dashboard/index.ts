import { standardDashboard } from './standard';
import { fylkeskontorDashboard } from './fylkeskontor';
import { hjelpemiddelsentralDashboard } from './hjelpemiddelsentral';
import { team1Dashboard } from './team1';
import { team2Dashboard } from './team2';
import type { DashboardConfig } from './types';
import { getBqViewsDataset, getBqEventTable, getBqSessionTable } from '../../client/shared/lib/runtimeConfig';

export * from './types';

// Rewrites canonical "umami_views.*" dataset references in SQL to whatever
// BQ_VIEWS_DATASET / BQ_EVENT_TABLE / BQ_SESSION_TABLE env vars are set to.
// This means dashboard SQL files can use "umami_views" as the canonical name
// and the env config (e.g. umami_student for fagtorsdag) takes effect at runtime.
const fixSql = (sql: string | undefined): string | undefined => {
    if (!sql) return sql;
    const ds = getBqViewsDataset();
    const evt = getBqEventTable();
    const ses = getBqSessionTable();
    return sql
        .replaceAll('umami_views.event_data', `${ds}.event_data`)
        .replaceAll('umami_views.event', `${ds}.${evt}`)
        .replaceAll('umami_views.session', `${ds}.${ses}`);
};

const prepare = (config: DashboardConfig): DashboardConfig => ({
    ...config,
    charts: config.charts.map((chart, index) => ({
        ...chart,
        id: chart.id || `auto-id-${index}-${chart.type}`,
        sql: fixSql(chart.sql),
    }))
});

export const dashboards: Record<string, DashboardConfig> = {
    'standard': prepare(standardDashboard),
    'fylkeskontor': prepare(fylkeskontorDashboard),
    'hjelpemiddelsentral': prepare(hjelpemiddelsentralDashboard),
    'team1': prepare(team1Dashboard),
    'team2': prepare(team2Dashboard),
};

export const getDashboard = (id?: string | null): DashboardConfig => {
    if (!id || !dashboards[id]) {
        return dashboards['standard'];
    }
    return dashboards[id];
};
