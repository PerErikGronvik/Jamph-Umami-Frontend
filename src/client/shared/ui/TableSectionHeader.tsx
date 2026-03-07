import type { ReactNode } from 'react';
import { BodyShort, Heading } from '@navikt/ds-react';

type HeadingLevel = '1' | '2' | '3' | '4' | '5';
type HeadingSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

type TableSectionHeaderProps = {
    title: ReactNode;
    description?: ReactNode;
    meta?: ReactNode;
    actions?: ReactNode;
    controls?: ReactNode;
    headingLevel?: HeadingLevel;
    headingSize?: HeadingSize;
};

const TableSectionHeader = ({
    title,
    description,
    meta,
    actions,
    controls,
    headingLevel = '3',
    headingSize = 'small',
}: TableSectionHeaderProps) => (
    <div className="space-y-2">
        <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
                <Heading level={headingLevel} size={headingSize}>
                    {title}
                </Heading>
                {meta}
                {description && (
                    <BodyShort className="mt-2 text-[var(--ax-text-subtle)] max-w-[72ch]">
                        {description}
                    </BodyShort>
                )}
            </div>
            {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
        {controls}
    </div>
);

export default TableSectionHeader;
