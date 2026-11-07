import { useState, useEffect } from "react";
import { computeSimilarity } from "../api/client";
import MapWindow from "./MapWindow";

const SKIP_KEYS = new Set(["x", "y", "z", "score", "match_text"]);

// Detect media URLs — either by file extension or known image CDN hostnames
const IMAGE_RE = /^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i;
const IMAGE_HOST_RE = /^https?:\/\/(lh\d+\.googleusercontent\.com|encrypted-tbn\d+\.gstatic\.com|[\w.-]+\.gstatic\.com)\//i;
const LINK_RE = /^https?:\/\/\S+$/i;

function MediaValue({ val }) {
    const str = String(val).trim();
    if (IMAGE_RE.test(str) || IMAGE_HOST_RE.test(str)) {
        return (
            <img
                src={str}
                alt=""
                style={{
                    maxWidth: "100%",
                    maxHeight: 240,
                    borderRadius: 4,
                    objectFit: "contain",
                    display: "block",
                    marginTop: 4,
                    background: "var(--bg-deep)",
                }}
                loading="lazy"
                onError={e => {
                    e.target.replaceWith(Object.assign(document.createElement("span"), {
                        textContent: str,
                        style: "font-size:13px;color:#a3a9b8;line-height:1.55;word-break:break-word",
                    }));
                }}
            />
        );
    }
    if (LINK_RE.test(str)) {
        return <a href={str} target="_blank" rel="noopener noreferrer" className="text-link" style={{ wordBreak: "break-all" }}>{str}</a>;
    }
    return <span>{str}</span>;
}

function MetaRows({ point, embedCols = [] }) {
    const embedSet = new Set(embedCols);
    // x/y/z/score are rendering artefacts — not useful to show in the details panel
    const entries = Object.entries(point).filter(([k]) => !SKIP_KEYS.has(k));
    // Bubble embedded columns to the top since they're the most semantically relevant
    entries.sort(([a], [b]) => {
        const ae = embedSet.has(a), be = embedSet.has(b);
        if (ae && !be) return -1;
        if (!ae && be) return 1;
        return 0;
    });
    return (
        <dl style={{ margin: 0 }}>
            {entries.map(([k, v]) => {
                const isEmbed = embedSet.has(k);
                return (
                    <div key={k} style={{ ...s.row, background: isEmbed ? "var(--accent-soft)" : "transparent" }}>
                        <dt style={{ ...s.key, color: isEmbed ? "var(--accent-text)" : "var(--muted)" }} title={k}>
                            {k}
                        </dt>
                        <dd style={{ ...s.val, color: isEmbed ? "var(--text)" : "var(--text-2)" }}>
                            {v == null || v === ""
                                ? <span style={{ color: "var(--muted)" }}>—</span>
                                : <MediaValue val={v} />}
                        </dd>
                    </div>
                );
            })}
        </dl>
    );
}

export default function ClickPanel({ selected, onClose, onRemove, demo, projectId, embedCols = [] }) {
    const [similarity, setSimilarity] = useState(null);

    useEffect(() => {
        // Only fetch when exactly two points are selected — single selection doesn't need it
        if (selected.length !== 2) return;
        let live = true;
        computeSimilarity(selected[0].Name, selected[1].Name, demo, projectId)
            .then(d => live && setSimilarity(d.similarity))
            .catch(() => live && setSimilarity(null));
        return () => { live = false; setSimilarity(null); };
    }, [selected, demo, projectId]);

    if (!selected || selected.length === 0) return null;

    const isCompare = selected.length === 2;

    const badge = isCompare && similarity !== null && (
        // Highlight the badge when the two items are strongly similar (>0.7 cosine)
        <span style={{
            ...s.simBadge,
            background: similarity > 0.7 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.2)",
        }}>
            similarity {similarity.toFixed(2)}
        </span>
    );

    return (
        <MapWindow
            id="details"
            title={isCompare ? "compare.exe" : `${selected[0].Name}.txt`}
            titleExtra={badge}
            onClose={onClose}
            anchor="right"
            defaultWidth={isCompare ? 760 : 420}
            defaultHeight={isCompare ? 560 : 520}
            minWidth={isCompare ? 420 : 260}
        >
            {isCompare ? (
                <div style={s.compareGrid}>
                    {[0, 1].map(i => (
                        <div key={i} style={{ ...s.compareCol, borderLeft: i ? "1px solid var(--line)" : "none" }}>
                            <div style={s.colName}>
                                <span style={s.colNameText} title={selected[i].Name}>{selected[i].Name}</span>
                                {onRemove && (
                                    <span
                                        className="xp-title-btn xp-title-btn--close xp-title-btn--sm"
                                        role="button"
                                        tabIndex={0}
                                        title={`Remove ${selected[i].Name} and keep ${selected[1 - i].Name}`}
                                        aria-label={`Remove ${selected[i].Name} from the comparison`}
                                        onClick={() => onRemove(i)}
                                        onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRemove(i))}
                                    >✕</span>
                                )}
                            </div>
                            <div className="map-window-scroll" style={{ padding: "4px 0 12px" }}>
                                <MetaRows point={selected[i]} embedCols={embedCols} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="map-window-scroll" style={{ padding: "4px 0 12px" }}>
                    <MetaRows point={selected[0]} embedCols={embedCols} />
                </div>
            )}
        </MapWindow>
    );
}

const s = {
    simBadge: {
        flexShrink: 0,
        fontFamily: "var(--mono)",
        fontSize: 11,
        color: "#fff",
        padding: "2px 8px",
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.35)",
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
    },
    compareGrid: {
        display: "flex",
        flex: 1,
        minHeight: 0,
    },
    compareCol: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
    },
    colName: {
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 8px 8px 16px",
        borderBottom: "1px solid var(--line)",
        background: "var(--raised)",
    },
    colNameText: {
        flex: 1, minWidth: 0,
        fontSize: 14, fontWeight: 500, color: "var(--text)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    },
    row: {
        display: "grid",
        gridTemplateColumns: "minmax(100px, min(32%, 200px)) minmax(0, 1fr)",
        gap: 12,
        padding: "6px 16px",
        alignItems: "start",
    },
    key: {
        fontFamily: "var(--mono)",
        fontSize: 12,
        paddingTop: 2,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        userSelect: "none",
    },
    val: {
        margin: 0,
        maxWidth: "90ch",          // keep long text readable when the window is maximized
        fontSize: 13, lineHeight: 1.55,
        wordBreak: "break-word", cursor: "text",
    },
};
