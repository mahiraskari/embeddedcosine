import MapWindow from "./MapWindow";

// How many matches the search can return (backend caps at 250)
const K_OPTIONS = [10, 25, 50, 100, 250];

export default function ResultsPanel({ results, onClose, onFlyTo, topK = 25, onTopKChange }) {
    if (!results || results.length === 0) return null;

    return (
        <MapWindow id="results" title="results.txt" onClose={onClose} anchor="left" defaultWidth={380} defaultHeight={560} minWidth={280}>
            {/* How many to show */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0,
                padding: "8px 12px", background: "var(--raised)", borderBottom: "1px solid var(--line)",
            }}>
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                    {results.length} {results.length === 1 ? "match" : "matches"}
                </span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
                    Show
                    <select
                        value={topK}
                        onChange={e => onTopKChange?.(Number(e.target.value))}
                        onMouseDown={e => e.stopPropagation()}
                        aria-label="Number of results"
                        style={{
                            height: 28, padding: "0 6px", fontSize: 13, fontFamily: "inherit",
                            color: "var(--text)", background: "var(--bg-deep)",
                            border: "1px solid var(--line-strong)", borderRadius: 4, cursor: "pointer",
                        }}
                    >
                        {K_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </label>
            </div>

            {/* Column headers */}
            <div style={{
                display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
                padding: "6px 12px 4px",
                borderBottom: "1px solid var(--line)",
            }}>
                <span style={{ width: 24, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: "var(--muted)" }}>Match</span>
                <span style={{ fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>Similarity</span>
            </div>

            {/* Results list */}
            <div className="map-window-scroll" style={{ padding: "4px 0 16px" }}>
                {results.map((r, i) => (
                    <div
                        key={`${r.Name}-${i}`}
                        className="result-row"
                        style={{
                            display: "flex",
                            alignItems: r.match_text ? "flex-start" : "center",
                            gap: 10,
                            padding: r.match_text ? "8px 12px" : "6px 12px",
                            borderBottom: r.match_text ? "1px solid var(--line)" : "none",
                            transition: "background-color 0.1s",
                            cursor: onFlyTo ? "pointer" : "default",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--accent-soft)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        onClick={() => onFlyTo?.(r.Name)}
                        title={onFlyTo ? "Fly to this point" : undefined}
                    >
                        <span style={{
                            fontSize: 12, color: "var(--muted)", width: 24,
                            textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums",
                            paddingTop: r.match_text ? 1 : 0,
                        }}>
                            {i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                                fontSize: 14, color: "var(--text)",
                                overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                            }}>
                                {r.Name}
                            </div>
                            {r.match_text && (
                                <div
                                    title={r.match_text}
                                    style={{
                                        marginTop: 2, fontSize: 13, lineHeight: 1.45, color: "var(--muted)",
                                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                    }}
                                >
                                    {r.match_text}
                                </div>
                            )}
                        </div>
                        <span style={{
                            fontSize: 13, color: "var(--accent-text)",
                            fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                        }}>
                            {r.score.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
        </MapWindow>
    );
}
