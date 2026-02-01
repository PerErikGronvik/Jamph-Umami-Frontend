import { useState, useEffect } from 'react';
import { RadioGroup, Radio, DatePicker } from '@navikt/ds-react';
import { format, parse, isValid } from 'date-fns';

interface PeriodPickerProps {
    period: string;
    onPeriodChange: (period: string) => void;
    startDate: Date | undefined;
    onStartDateChange: (date: Date | undefined) => void;
    endDate: Date | undefined;
    onEndDateChange: (date: Date | undefined) => void;
    showToday?: boolean;
    lastMonthLabel?: string;
    currentMonthLabel?: string;
}

export const PeriodPicker = ({
    period,
    onPeriodChange,
    startDate,
    onStartDateChange,
    endDate,
    onEndDateChange,
    showToday = false,
    lastMonthLabel = 'November 2025',
    currentMonthLabel = 'Desember 2025'
}: PeriodPickerProps) => {
    const [fromInputValue, setFromInputValue] = useState<string>('');
    const [toInputValue, setToInputValue] = useState<string>('');

    // Force student data periods
    useEffect(() => {
        if (period === 'current_month') {
            onPeriodChange('custom');
            onStartDateChange(new Date(2025, 11, 1));
            onEndDateChange(new Date(2025, 11, 31));
        } else if (period === 'last_month') {
            onPeriodChange('custom');
            onStartDateChange(new Date(2025, 10, 1));
            onEndDateChange(new Date(2025, 10, 30));
        }
    }, [period, onPeriodChange, onStartDateChange, onEndDateChange]);

    const getVisualPeriod = () => {
        if (period === 'custom' && startDate && endDate) {
            const isDec2025 = startDate.getFullYear() === 2025 && startDate.getMonth() === 11 && startDate.getDate() === 1 &&
                endDate.getFullYear() === 2025 && endDate.getMonth() === 11 && endDate.getDate() === 31;

            const isNov2025 = startDate.getFullYear() === 2025 && startDate.getMonth() === 10 && startDate.getDate() === 1 &&
                endDate.getFullYear() === 2025 && endDate.getMonth() === 10 && endDate.getDate() === 30;

            if (isDec2025) return 'current_month';
            if (isNov2025) return 'last_month';
        }
        return period;
    };

    const handlePeriodChange = (val: string) => {
        if (val === 'current_month') {
            onPeriodChange('custom');
            onStartDateChange(new Date(2025, 11, 1));
            onEndDateChange(new Date(2025, 11, 31));
        } else if (val === 'last_month') {
            onPeriodChange('custom');
            onStartDateChange(new Date(2025, 10, 1));
            onEndDateChange(new Date(2025, 10, 30));
        } else {
            onPeriodChange(val);
            // If switching to valid 'custom' without changing date, we keep dates? 
            // Or if switching to 'today', parent might handle it? 
            // 'today' isn't handled in my effect, but handled in parents usually as standard
        }
    };

    // Sync inputs when dates change externally (e.g. from calendar click)
    useEffect(() => {
        if (startDate) {
            setFromInputValue(format(startDate, 'dd.MM.yyyy'));
        } else {
            setFromInputValue('');
        }
    }, [startDate]);

    useEffect(() => {
        if (endDate) {
            setToInputValue(format(endDate, 'dd.MM.yyyy'));
        } else {
            setToInputValue('');
        }
    }, [endDate]);

    return (
        <>
            <RadioGroup
                legend="Periode"
                value={getVisualPeriod()}
                onChange={handlePeriodChange}
                size="small"
            >
                {showToday && <Radio value="today">I dag</Radio>}
                <Radio value="current_month">{currentMonthLabel}</Radio>
                <Radio value="last_month">{lastMonthLabel}</Radio>
                <Radio value="custom">Egendefinert</Radio>
            </RadioGroup>

            {period === 'custom' && getVisualPeriod() === 'custom' && (
                <div className="mb-4 mt-2">
                    <DatePicker
                        mode="range"
                        onSelect={(range) => {
                            if (range) {
                                onStartDateChange(range.from);
                                onEndDateChange(range.to);
                            }
                        }}
                        selected={{ from: startDate, to: endDate }}
                    >
                        <div className="flex flex-col gap-2">
                            <DatePicker.Input
                                id="custom-date-from"
                                label="Fra dato"
                                value={fromInputValue}
                                onChange={(e) => {
                                    setFromInputValue(e.target.value);
                                    const date = parse(e.target.value, 'dd.MM.yyyy', new Date());
                                    if (isValid(date) && e.target.value.length === 10) {
                                        onStartDateChange(date);
                                    }
                                }}
                            />
                            <DatePicker.Input
                                id="custom-date-to"
                                label="Til dato"
                                value={toInputValue}
                                onChange={(e) => {
                                    setToInputValue(e.target.value);
                                    const date = parse(e.target.value, 'dd.MM.yyyy', new Date());
                                    if (isValid(date) && e.target.value.length === 10) {
                                        onEndDateChange(date);
                                    }
                                }}
                            />
                        </div>
                    </DatePicker>
                </div>
            )}
        </>
    );
};

export default PeriodPicker;
