import { Heading, Page } from "@navikt/ds-react";
import { useState, useRef, useEffect } from "react";

interface BenchmarkResult {
    model: string;
    timestamp: string;
    sqlAccuracy: number;
    dialectAccuracy: number;
    tokensPerSecond: number;
    promptTokens: number;
    responseTokens: number;
    evalDurationMs: number;
}

function TestModell() {
    const [benchmarkModel, setBenchmarkModel] = useState("qwen2.5-coder:7b");
    const [benchmarkLoading, setBenchmarkLoading] = useState(false);
    const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
    const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const debugBoxRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (debugBoxRef.current) {
            debugBoxRef.current.scrollTop = debugBoxRef.current.scrollHeight;
        }
    }, [debugLog]);

    async function handleBenchmark() {
        setBenchmarkLoading(true);
        setBenchmarkResult(null);
        setBenchmarkError(null);
        setDebugLog([]);

        try {
            const ragApiBase = import.meta.env.VITE_RAG_API_URL ?? "";
            const res = await fetch(`${ragApiBase}/api/benchmark/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: benchmarkModel }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error ?? res.statusText);
            }

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No response stream");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop() ?? "";

                for (const part of parts) {
                    const line = part.trim();
                    if (!line.startsWith("data: ")) continue;
                    const json = line.slice(6);
                    try {
                        const event = JSON.parse(json);
                        if (event.type === "debug") {
                            setDebugLog((prev) => [...prev, event.message]);
                        } else if (event.type === "result") {
                            setBenchmarkResult(event.result);
                        } else if (event.type === "error") {
                            setBenchmarkError(event.message);
                        } else if (event.type === "done") {
                            setDebugLog((prev) => [...prev, `--- ${event.message} ---`]);
                        }
                    } catch {
                        // skip malformed events
                    }
                }
            }
        } catch (e: unknown) {
            setBenchmarkError(e instanceof Error ? e.message : "Ukjent feil");
        } finally {
            setBenchmarkLoading(false);
        }
    }

    return (
        <Page.Block width="xl" gutters>
            <div style={{ marginTop: '48px', marginBottom: '48px' }}>
                <Heading spacing as="h2" size="large">
                    Test LLM-modell
                </Heading>
                <p style={{ margin: '0 0 32px', color: '#444', fontSize: '16px' }}>
                    Kjør en benchmark mot en Ollama-modell for å måle SQL-nøyaktighet og tokenhastighet.
                </p>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={benchmarkModel}
                        onChange={(e) => setBenchmarkModel(e.target.value)}
                        placeholder="LLM-modell (f.eks. qwen2.5-coder:7b)"
                        style={{
                            padding: '10px 14px',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                            fontSize: '15px',
                            minWidth: '280px',
                        }}
                    />
                    <button
                        onClick={handleBenchmark}
                        disabled={benchmarkLoading || !benchmarkModel.trim()}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: benchmarkLoading ? '#9ca3af' : '#0067C5',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '15px',
                            cursor: benchmarkLoading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {benchmarkLoading ? 'Kjører benchmark…' : 'Test modell'}
                    </button>
                </div>

                {benchmarkError && (
                    <p style={{ marginTop: '16px', color: '#b91c1c', fontSize: '15px' }}>
                        Feil: {benchmarkError}
                    </p>
                )}

                {debugLog.length > 0 && (
                    <pre
                        ref={debugBoxRef}
                        style={{
                            marginTop: '20px',
                            padding: '16px',
                            backgroundColor: '#1e1e1e',
                            color: '#d4d4d4',
                            borderRadius: '8px',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                        }}
                    >
                        {debugLog.join('\n')}
                    </pre>
                )}

                {benchmarkResult && (
                    <div style={{
                        marginTop: '24px',
                        padding: '20px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '15px',
                        lineHeight: '1.8',
                    }}>
                        <strong>Modell:</strong> {benchmarkResult.model}<br />
                        <strong>SQL-nøyaktighet:</strong> {(benchmarkResult.sqlAccuracy * 100).toFixed(0)}%<br />
                        <strong>Dialekt-nøyaktighet:</strong> {(benchmarkResult.dialectAccuracy * 100).toFixed(0)}%<br />
                        <strong>Tokens/sek:</strong> {benchmarkResult.tokensPerSecond.toFixed(1)}<br />
                        <strong>Prompt-tokens:</strong> {benchmarkResult.promptTokens}<br />
                        <strong>Respons-tokens:</strong> {benchmarkResult.responseTokens}<br />
                        <strong>Tid:</strong> {benchmarkResult.evalDurationMs} ms<br />
                        <strong>Kjørt:</strong> {new Date(benchmarkResult.timestamp).toLocaleString('no-NO')}
                    </div>
                )}
            </div>
        </Page.Block>
    );
}

export default TestModell;
