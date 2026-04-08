import { useRef, useState, useEffect } from "react";

const COLORS = ["#818cf8","#a78bfa","#c084fc","#e879f9","#34d399","#6ee7b7","#38bdf8","#fbbf24","#f87171","#fb923c"];

export default function ResultsPanel({ results, onClose }) {
    const panelRef  = useRef(null);
    const dragState = useRef(null);
    const [pos, setPos] = useState({ x: 24, y: 80 }); // initial position from top-left of map-container

    // Drag logic
    useEffect(() => {
        const onMove = (e) => {
            if (!dragState.current) return;
            const dx = e.clientX - dragState.current.startX;
            const dy = e.clientY - dragState.current.startY;
            setPos({
                x: Math.max(0, dragState.current.origX + dx),
                y: Math.max(0, dragState.current.origY + dy),
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

    const onDragStart = (e) => {
        if (e.button !== 0) return; // left click only
        e.preventDefault();
        dragState.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX:  pos.x,
            origY:  pos.y,
        };
    };

    if (!results || results.length === 0) return null;

    return (
        <div
            ref={panelRef}
            style={{
                position:  "absolute",
                left:      pos.x,
                top:       pos.y,
                zIndex:    50,
                width:     280,
                background: "rgba(8, 8, 16, 0.97)",
                border:    "1px solid rgba(99,102,241,0.25)",
                borderRadius: 12,
                boxShadow: "0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(99,102,241,0.06)",
                userSelect: "none",
                backdropFilter: "blur(12px)",
            }}
        >
            {/* Drag handle */}
            <div
                onMouseDown={onDragStart}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px 9px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "grab",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                        color: "#6366f1", textTransform: "uppercase",
                    }}>
                        Results
                    </span>
                    <span style={{
                        fontSize: 10, color: "#333", background: "#111",
                        border: "1px solid #1e1e2e", borderRadius: 3,
                        padding: "1px 6px",
                    }}>
                        {results.length}
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                        onClick={onClose}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            background: "none", border: "none",
                            color: "#333", fontSize: 14,
                            cursor: "pointer", padding: "0 2px",
                            lineHeight: 1, transition: "color 0.12s",
                        }}
                        onMouseEnter={e => e.target.style.color = "#a5b4fc"}
                        onMouseLeave={e => e.target.style.color = "#333"}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Column headers */}
            <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 14px 4px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
                <span style={{ width: 14, flexShrink: 0 }} />
                <span style={{ width: 6, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 9, color: "#2a2a3a", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Match</span>
                <span style={{ fontSize: 9, color: "#2a2a3a", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", flexShrink: 0 }}>Similarity</span>
            </div>

            {/* Results list */}
            <div style={{ padding: "8px 0", maxHeight: 300, overflowY: "auto", scrollbarWidth: "none" }}>
                {results.map((r, i) => (
                    <div
                        key={r.Name}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "7px 14px",
                            transition: "background 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.06)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                        <span style={{
                            fontSize: 10, color: "#2a2a3a", width: 14,
                            textAlign: "right", flexShrink: 0, fontWeight: 700,
                        }}>
                            {i + 1}
                        </span>
                        <span style={{
                            width: 6, height: 6, borderRadius: 1.5, flexShrink: 0,
                            background: COLORS[i % COLORS.length],
                        }} />
                        <span style={{
                            flex: 1, fontSize: 12, color: "#d4d4e8",
                            fontWeight: 500, overflow: "hidden",
                            whiteSpace: "nowrap", textOverflow: "ellipsis",
                        }}>
                            {r.Name}
                        </span>
                        <span style={{
                            fontSize: 11, color: "#6366f1",
                            fontWeight: 600, fontVariantNumeric: "tabular-nums",
                            flexShrink: 0,
                        }}>
                            {r.score.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
