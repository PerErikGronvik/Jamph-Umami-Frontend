// Shared hook for preparing chart data from a BigQuery result object.
// Used by ResultsPanel consumers — replaces copy-pasted prepare* functions in each page.
import { translateValue } from './translations';

export function useChartDataPrep(result: any) {
    const prepareLineChartData = (includeAverage = false) => {
        if (!result?.data?.length) return null;
        const data = result.data;
        const keys = Object.keys(data[0]);
        if (keys.length < 2) return null;

        if (keys.length === 3) {
            const [xKey, seriesKey, yKey] = keys;
            const seriesMap = new Map<string, any[]>();
            data.forEach((row: any) => {
                const seriesValue = String(translateValue(seriesKey, row[seriesKey]) || 'Ukjent');
                if (!seriesMap.has(seriesValue)) seriesMap.set(seriesValue, []);
                const xValue = row[xKey];
                const yValue = typeof row[yKey] === 'number' ? row[yKey] : Number.parseFloat(row[yKey]) || 0;
                const x = typeof xValue === 'string' && /^\d{4}-\d{2}-\d{2}/.exec(xValue)
                    ? new Date(xValue)
                    : typeof xValue === 'number' ? xValue : new Date(xValue).getTime() || 0;
                seriesMap.get(seriesValue)!.push({ x, y: yValue, xAxisCalloutData: xValue, yAxisCalloutData: String(yValue) });
            });
            return {
                data: { lineChartData: Array.from(seriesMap.entries()).map(([legend, pts]) => ({ legend, data: pts, color: '#0067C5' })) },
                enabledLegendsWrapLines: true,
            };
        }

        const [xKey, yKey] = keys;
        const chartPoints = data.map((row: any) => {
            const xValue = row[xKey];
            const yValue = typeof row[yKey] === 'number' ? row[yKey] : Number.parseFloat(row[yKey]) || 0;
            const x = typeof xValue === 'string' && /^\d{4}-\d{2}-\d{2}/.exec(xValue)
                ? new Date(xValue)
                : typeof xValue === 'number' ? xValue : new Date(xValue).getTime() || 0;
            return { x, y: yValue, xAxisCalloutData: xValue, yAxisCalloutData: String(yValue) };
        });
        const lineChartData: any[] = [{ legend: yKey, data: chartPoints, color: '#0067C5' }];
        if (includeAverage && chartPoints.length > 0) {
            const avgY = chartPoints.reduce((s: number, p: any) => s + p.y, 0) / chartPoints.length;
            lineChartData.push({
                legend: 'Gjennomsnitt',
                data: chartPoints.map((p: any) => ({ ...p, y: avgY, yAxisCalloutData: avgY.toFixed(2) })),
                color: '#262626',
                lineOptions: { lineBorderWidth: '2', strokeDasharray: '5 5' },
            });
        }
        return { data: { lineChartData }, enabledLegendsWrapLines: true };
    };

    const prepareBarChartData = () => {
        if (!result?.data?.length || result.data.length > 12) return null;
        const data = result.data;
        const keys = Object.keys(data[0]);
        if (keys.length < 2) return null;
        const [labelKey, valueKey] = keys;
        const total = data.reduce((s: number, r: any) => s + (typeof r[valueKey] === 'number' ? r[valueKey] : Number.parseFloat(r[valueKey]) || 0), 0);
        return {
            data: data.map((row: any) => {
                const value = typeof row[valueKey] === 'number' ? row[valueKey] : Number.parseFloat(row[valueKey]) || 0;
                const label = String(translateValue(labelKey, row[labelKey]) || 'Ukjent');
                return { x: label, y: value, xAxisCalloutData: label, yAxisCalloutData: `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`, color: '#0067C5', legend: label };
            }),
            barWidth: 'auto' as const,
            yAxisTickCount: 5,
            enableReflow: true,
        };
    };

    const preparePieChartData = () => {
        if (!result?.data?.length || result.data.length > 12) return null;
        const data = result.data;
        const keys = Object.keys(data[0]);
        if (keys.length < 2) return null;
        const [labelKey, valueKey] = keys;
        const total = data.reduce((s: number, r: any) => s + (typeof r[valueKey] === 'number' ? r[valueKey] : Number.parseFloat(r[valueKey]) || 0), 0);
        return {
            data: data.map((row: any) => ({
                y: typeof row[valueKey] === 'number' ? row[valueKey] : Number.parseFloat(row[valueKey]) || 0,
                x: String(translateValue(labelKey, row[labelKey]) || 'Ukjent'),
            })),
            total,
        };
    };

    return { prepareLineChartData, prepareBarChartData, preparePieChartData };
}
