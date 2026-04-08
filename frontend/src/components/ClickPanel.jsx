import { useRef, useState, useEffect } from "react";
import { computeSimilarity } from "../api/client";

const SKIP_KEYS = new Set(["x", "y", "z", "score"]);

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
        <>
            {entries.map(([k, v]) => {
                const isEmbed = embedSet.has(k);
                return (
                    <div key={k} style={{ ...s.row, background: isEmbed ? "rgba(99,102,241,0.07)" : "transparent" }}>
                        <span style={{ ...s.key, color: isEmbed ? "#818cf8" : "#3a3a5a" }}>
                            {k}
                        </span>
                        <span style={{ ...s.val, color: isEmbed ? "#c4c4f0" : "#a0a0c0" }}>
                            {v == null
                                ? <span style={{ color: "#333" }}>—</span>
                                : String(v).length > 400
                                    ? String(v).slice(0, 400) + "…"
                                    : String(v)}
                        </span>
                    </div>
                );
            })}
        </>
    );
}

export default function ClickPanel({ selected, onClose, demo, projectId, embedCols = [] }) {
    const dragState = useRef(null);
    const [pos, setPos]           = useState({ x: 320, y: 80 });
    const [similarity, setSimilarity] = useState(null);

    useEffect(() => {
        // Only fetch when exactly two points are selected — single selection doesn't need it
        if (selected.length !== 2) { setSimilarity(null); return; }
        computeSimilarity(selected[0].Name, selected[1].Name, demo, projectId)
            .then(d => setSimilarity(d.similarity))
            .catch(() => setSimilarity(null));
    }, [selected]);

    useEffect(() => {
        const onMove = (e) => {
            if (!dragState.current) return;
            setPos({
                x: Math.max(0, dragState.current.origX + e.clientX - dragState.current.startX),
                y: Math.max(0, dragState.current.origY + e.clientY - dragState.current.startY),
            });
        };
        const onUp = () => { dragState.current = null; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("mouseleave", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("mouseleave", onUp);
        };
    }, []);

    if (!selected || selected.length === 0) return null;

    const isCompare = selected.length === 2;

    return (
        <div data-panel style={{ ...s.panel, left: pos.x, top: pos.y, width: isCompare ? 500 : 290 }}>
            {/* Header */}
            <div
                onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
                }}
                style={s.header}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={s.headerLabel}>{isCompare ? "Compare" : "Details"}</span>
                    {isCompare && similarity !== null && (
                        // Highlight the badge when the two items are strongly similar (>0.7 cosine)
                        <span style={{
                            ...s.simBadge,
                            background: similarity > 0.7 ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.04)",
                            color: similarity > 0.7 ? "#a5b4fc" : "#555",
                            borderColor: similarity > 0.7 ? "rgba(99,102,241,0.3)" : "#1e1e2e",
                        }}>
                            similarity {similarity.toFixed(2)}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    onMouseDown={e => e.stopPropagation()}
                    style={s.closeBtn}
                    onMouseEnter={e => e.target.style.color = "#a5b4fc"}
                    onMouseLeave={e => e.target.style.color = "#333"}
                >✕</button>
            </div>

            {/* Content */}
            {isCompare ? (
                <div style={s.compareGrid}>
                    <div style={s.compareCol}>
                        <div style={s.colName}>{selected[0].Name}</div>
                        <div style={s.scroll}>
                            <MetaRows point={selected[0]} embedCols={embedCols} />
                        </div>
                    </div>
                    <div style={s.divider} />
                    <div style={s.compareCol}>
                        <div style={s.colName}>{selected[1].Name}</div>
                        <div style={s.scroll}>
                            <MetaRows point={selected[1]} embedCols={embedCols} />
                        </div>
                    </div>
                </div>
            ) : (
                <div style={s.scroll}>
                    <MetaRows point={selected[0]} embedCols={embedCols} />
                </div>
            )}
        </div>
    );
}

const s = {
    panel: {
        position: "absolute",
        zIndex: 50,
        background: "#0c0c16",
        border: "1px solid #1e1e30",
        borderRadius: 3,
        boxShadow: "5px 5px 0px #000",
        userSelect: "none",
    },
    header: {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 14px 8px",
        borderBottom: "1px solid #1a1a28",
        cursor: "grab",
        userSelect: "none",
    },
    headerLabel: {
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
        color: "#6366f1", textTransform: "uppercase",
    },
    simBadge: {
        fontSize: 10, fontWeight: 600, padding: "2px 7px",
        borderRadius: 2, border: "1px solid",
        fontVariantNumeric: "tabular-nums",
    },
    closeBtn: {
        background: "none", border: "none", color: "#333",
        fontSize: 14, cursor: "pointer", padding: "0 2px",
        lineHeight: 1, transition: "color 0.12s",
    },
    compareGrid: {
        display: "flex",
    },
    compareCol: {
        flex: 1, minWidth: 0,
    },
    colName: {
        fontSize: 11, fontWeight: 700, color: "#e2e2e2",
        padding: "8px 14px 6px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    },
    divider: {
        width: 1, background: "rgba(255,255,255,0.05)", flexShrink: 0,
    },
    scroll: {
        maxHeight: 340, overflowY: "auto", scrollbarWidth: "none",
        padding: "6px 0 8px",
        userSelect: "text",
    },
    row: {
        display: "flex", gap: 8,
        padding: "4px 14px",
        alignItems: "flex-start",
    },
    key: {
        fontSize: 10, color: "#3a3a5a", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.06em",
        flexShrink: 0, width: 90, paddingTop: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        userSelect: "none",
    },
    val: {
        fontSize: 11, color: "#a0a0c0", lineHeight: 1.5, flex: 1,
        wordBreak: "break-word", cursor: "text",
    },
};
