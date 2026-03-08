import { Table, Pagination, Switch } from '@navikt/ds-react';
import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { DashboardRow } from '../../utils/widgetUtils.ts';
import { formatTableValue, isClickablePath } from '../../utils/widgetUtils.ts';
import { translateValue } from '../../../../shared/lib/translations.ts';

interface DashboardWidgetTableProps {
    data: DashboardRow[];
    page: number;
    onPageChange: (page: number) => void;
    showTotal?: boolean;
    onSelectUrl: (url: string) => void;
}

const DashboardWidgetTable = ({ data, page, onPageChange, showTotal, onSelectUrl }: DashboardWidgetTableProps) => {
    const [metricColumnsFirst, setMetricColumnsFirst] = useState(false);
    let tableData = data;

    if (showTotal) {
        tableData = data.filter((row) => !Object.values(row).includes('__TOTAL__'));
    }

    const rowsPerPage = 10;
    const totalRows = tableData.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const currentData = tableData.slice(start, end);
    const baseKeys = Object.keys(tableData[0] || data[0] || {});

    const orderedKeys = useMemo(() => {
        if (!metricColumnsFirst || baseKeys.length <= 1) {
            return baseKeys;
        }

        // Put columns with numeric values first when enabled.
        const numericKeys = baseKeys.filter((key) =>
            tableData.some((row) => typeof (row as Record<string, unknown>)[key] === 'number')
        );
        const otherKeys = baseKeys.filter((key) => !numericKeys.includes(key));

        return [...numericKeys, ...otherKeys];
    }, [baseKeys, metricColumnsFirst, tableData]);

    return (
        <div className="flex flex-col">
            <div className="px-4 pb-2">
                <Switch
                    size="small"
                    checked={metricColumnsFirst}
                    onChange={(e) => setMetricColumnsFirst(e.target.checked)}
                >
                    Visningsvalg: måltall først
                </Switch>
            </div>
            <div className="overflow-x-auto px-4">
                <Table size="small">
                    <Table.Header>
                        <Table.Row>
                            {orderedKeys.map(key => (
                                <Table.HeaderCell key={key}>{key}</Table.HeaderCell>
                            ))}
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {currentData.map((row, i) => {
                            return (
                                <Table.Row key={i}>
                                    {orderedKeys.map((key, j) => {
                                        const val = (row as Record<string, unknown>)[key];
                                        const rawString = formatTableValue(val);
                                        const translatedVal = String(translateValue(key, rawString));
                                        const displayVal = typeof val === 'number'
                                            ? val.toLocaleString('nb-NO')
                                            : translatedVal;
                                        const clickable = isClickablePath(val);
                                        return (
                                            <Table.DataCell
                                                key={j}
                                                className={`whitespace-nowrap ${clickable ? 'cursor-pointer' : ''}`}
                                                title={rawString}
                                                onClick={clickable ? () => onSelectUrl(val) : undefined}
                                            >
                                                {clickable ? (
                                                    <span className="text-blue-600 hover:underline flex items-center gap-1">
                                                        {displayVal} <ExternalLink className="h-3 w-3" />
                                                    </span>
                                                ) : (
                                                    displayVal
                                                )}
                                            </Table.DataCell>
                                        );
                                    })}
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table>
            </div>
            {totalRows > rowsPerPage ? (
                <div className="flex justify-center px-4 pb-4 pt-2">
                    <Pagination
                        page={page}
                        onPageChange={onPageChange}
                        count={totalPages}
                        size="small"
                    />
                </div>
            ) : (
                <div className="px-4 pb-4" aria-hidden="true" />
            )}
        </div>
    );
};

export default DashboardWidgetTable;
