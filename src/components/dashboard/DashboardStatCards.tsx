/**
 * DashboardStatCards — maks 4 nøkkeltallskort.
 * Første rad fra data = totalkort (hvit/nøytral, viser bare tall).
 * Rad 2–4 = fargede kort (blå/grønn/rød), viser % av første + råtall.
 */
import '../../styles/charts.css';

interface Props {
    result: any;
    title?: string;
}

const CARD_COLORS = [
    // pos 0: nøytral (første kort – total)
    {
        bg: '#ffffff',
        border: '#d1d5db',
        label: '#6b7280',
        value: '#111827',
        sub: '#6b7280',
    },
    // pos 1: blå
    {
        bg: '#eff6ff',
        border: '#bfdbfe',
        label: '#1d4ed8',
        value: '#1d4ed8',
        sub: '#3b82f6',
    },
    // pos 2: grønn
    {
        bg: '#f0fdf4',
        border: '#bbf7d0',
        label: '#15803d',
        value: '#15803d',
        sub: '#22c55e',
    },
    // pos 3: rød
    {
        bg: '#fff1f2',
        border: '#fecdd3',
        label: '#991b1b',
        value: '#991b1b',
        sub: '#ef4444',
    },
];

export default function DashboardStatCards({ result, title }: Props) {
    const rows: any[] = (result?.data ?? []).slice(0, 4);

    if (!rows.length) {
        return (
            <div className="widget-card">
                {title && <div className="widget-header"><span className="widget-title">{title}</span></div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9ca3af', fontSize: 13 }}>
                    Ingen data
                </div>
            </div>
        );
    }

    const keys = Object.keys(rows[0]);
    const labelKey = keys[0];
    const valueKey = keys[1] ?? keys[0];
    const subLabel = valueKey; // bruker kolonnenavnet som undertekst (f.eks. "sesjoner")

    const totalValue = Number(rows[0][valueKey]) || 1;

    return (
        <div className="widget-card">
            {title && <div className="widget-header"><span className="widget-title">{title}</span></div>}
            <div style={{ display: 'flex', flex: 1, gap: 12, padding: 12, overflow: 'hidden' }}>
                {rows.map((row, i) => {
                    const color = CARD_COLORS[i] ?? CARD_COLORS[3];
                    const rawValue = Number(row[valueKey]) || 0;
                    const pct = i === 0 ? null : ((rawValue / totalValue) * 100).toFixed(1) + '%';

                    return (
                        <div
                            key={String(row[labelKey])}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                padding: '16px 8px',
                                background: color.bg,
                                border: `1.5px solid ${color.border}`,
                                borderRadius: 12,
                                minWidth: 0,
                                textAlign: 'center',
                            }}
                        >
                            <span style={{ fontSize: 12, fontWeight: 600, color: color.label, lineHeight: 1.3 }}>
                                {String(row[labelKey])}
                            </span>
                            <span style={{ fontSize: pct ? 26 : 32, fontWeight: 700, color: color.value, lineHeight: 1.1 }}>
                                {pct ?? rawValue.toLocaleString('nb-NO')}
                            </span>
                            {pct && (
                                <span style={{ fontSize: 12, color: color.sub }}>
                                    {rawValue.toLocaleString('nb-NO')} {subLabel}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
