import { useState } from 'react';
import { Alert, BodyShort, Button, Label, Textarea, TextField, Dialog, BodyLong } from '@navikt/ds-react';
import { RobotSmileIcon, QuestionmarkCircleIcon } from '@navikt/aksel-icons';

const KiIcon = () => (
    <span
        aria-hidden
        className="shrink-0 mt-0.5 inline-flex items-center justify-center rounded-full text-white font-bold"
        style={{ width: 20, height: 20, fontSize: 9, lineHeight: 1, backgroundColor: '#0067C5' }}
    >
        KI
    </span>
);

const ALLOWED_HOSTNAME = 'aksel.nav.no';

function validateNavUrl(value: string): string | null {
    if (!value.trim()) return null;
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
        const { hostname } = new URL(normalized);
        if (hostname !== ALLOWED_HOSTNAME) return 'URL må være aksel.nav.no (f.eks. aksel.nav.no/komponenter)';
    } catch {
        return 'Ugyldig URL. Eksempel: aksel.nav.no/komponenter';
    }
    return null;
}

interface InputPanelProps {
    url: string;
    onUrlChange: (v: string) => void;
    kiPrompt: string;
    onKiPromptChange: (v: string) => void;
    kiSuggestion: string | null;
    onHentGraf: () => void;
    loading?: boolean;
    error?: string | null;
}

export default function InputPanel({
    url,
    onUrlChange,
    kiPrompt,
    onKiPromptChange,
    kiSuggestion,
    onHentGraf,
    loading = false,
    error = null,
}: InputPanelProps) {
    const [urlTouched, setUrlTouched] = useState(false);
    const urlError = urlTouched ? validateNavUrl(url) : null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '1.5rem' }}>
            {/* Boks 1 – URL */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
                <TextField
                    label="Lim inn URL for å se webstatistikk"
                    placeholder="https://aksel.nav.no/..."
                    value={url}
                    onChange={(e) => { onUrlChange(e.target.value); setUrlTouched(true); }}
                    onBlur={() => setUrlTouched(true)}
                    type="url"
                    error={urlError ?? undefined}
                />
            </div>

            {/* Boks 2 – KI-Analyseassistent */}
            <div className="border border-gray-200 rounded-lg bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                    <RobotSmileIcon title="KI-Analyseassistent" fontSize="1.25rem" />
                    <Label>KI-Analyseassistent</Label>
                    {/* https://aksel.nav.no/komponenter/core/dialog */}
                    <Dialog>
                        <Dialog.Trigger aria-label="Hva kan jeg spørre om?" style={{ padding: 0, minWidth: 0, marginLeft: 4, display: 'flex', alignItems: 'center' }}>
                            <QuestionmarkCircleIcon title="Hva kan jeg spørre om?" fontSize="1.5rem" />
                        </Dialog.Trigger>
                        <Dialog.Popup>
                            <Dialog.Header>
                                <Dialog.Title>Hva kan jeg spørre om?</Dialog.Title>
                                <Dialog.Description>Eksempler på spørsmål KI-modellen forstår best:</Dialog.Description>
                            </Dialog.Header>
                            <Dialog.Body>
                                <BodyLong>
                                    <p>Skriv inn spørsmål du lurer på. Akkurat nå er modellen flinkest på hvor mange av noe det er i 2025 gruppert etter dag/måned.</p>
                                    <p>Rangeringer av ulike ting, som operativsystem eller hvilke undersider som er populære.</p>
                                    <p>Hvor mange fullfører en søknad som begynner på <code>/start</code> og slutter på <code>/slutt</code>.</p>
                                </BodyLong>
                            </Dialog.Body>
                            <Dialog.Footer>
                                <Dialog.CloseTrigger>
                                    <Button variant="secondary">Lukk</Button>
                                </Dialog.CloseTrigger>
                            </Dialog.Footer>
                        </Dialog.Popup>
                    </Dialog>
                </div>

                <div className="flex gap-2 items-end">
                    <Textarea
                        label="KI-spørsmål"
                        hideLabel
                        placeholder="Eksempel: Vis daglige sidevisninger for aksel.nav.no i 2025"
                        value={kiPrompt}
                        onChange={(e) => onKiPromptChange(e.target.value)}
                        minRows={2}
                        className="flex-1"
                    />
                    <Button
                        variant="primary"
                        size="small"
                        onClick={onHentGraf}
                        loading={loading}
                        disabled={!url.trim() || !kiPrompt.trim() || !!validateNavUrl(url)}
                        style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                        Hent graf
                    </Button>
                </div>

                {error && (
                    <Alert variant="error" size="small" className="mt-3">
                        {error}
                    </Alert>
                )}

                {kiSuggestion !== null && (
                    <div className="mt-3 flex items-start gap-2 rounded-md px-3 py-2" style={{ border: '1px solid var(--a-border-info)', backgroundColor: 'var(--a-surface-info-subtle)' }}>
                        <KiIcon />
                        <BodyShort size="small">{kiSuggestion}</BodyShort>
                    </div>
                )}
            </div>
        </div>
    );
}
