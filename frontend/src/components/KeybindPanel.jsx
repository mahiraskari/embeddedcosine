import { useRef, useState, useEffect } from "react";

const SECTIONS = [
    {
        title: "Navigation — 2D",
        rows: [
            ["Left drag",       "Pan the map"],
            ["Right drag",      "Box zoom to selection"],
            ["Scroll",          "Zoom in / out"],
            ["Double click",    "Reset to full view"],
        ],
    },
    {
        title: "Navigation — 3D",
        rows: [
            ["Left drag",       "Look around (FPS)"],
            ["Right drag",      "Orbit"],
            ["Scroll",          "Zoom in / out"],
            ["Double click",    "Reset camera"],
        ],
    },
    {
        title: "Points",
        rows: [
            ["Click a point",   "Open details panel"],
            ["Click a second",  "Compare two points side by side with similarity score"],
        ],
        last: true,
    },
];

export default function KeybindPanel({ onClose }) {
    const dragState = useRef(null);
    const [pos, setPos] = useState({ x: 160, y: 56 });

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

    return (
        <div data-panel style={{ ...s.panel, left: pos.x, top: pos.y }}>
            {/* Header */}
            <div
                onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
                }}
                style={s.header}
            >
                <span style={s.headerLabel}>Controls</span>
                <button
                    onClick={onClose}
                    onMouseDown={e => e.stopPropagation()}
                    style={s.closeBtn}
                    onMouseEnter={e => e.target.style.color = "#a5b4fc"}
                    onMouseLeave={e => e.target.style.color = "#333"}
                >✕</button>
            </div>

            {/* Content */}
            <div style={s.body}>
                {SECTIONS.map(sec => (
                    <div key={sec.title} style={{ ...s.section, borderBottom: sec.last ? "none" : "1px solid #111" }}>
                        <div style={s.sectionTitle}>{sec.title}</div>
                        {sec.rows.map(([key, desc]) => (
                            <div key={key} style={s.row}>
                                <span style={s.key}>{key}</span>
                                <span style={s.desc}>{desc}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
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
        width: 320,
    },
    header: {
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 14px 8px",
        borderBottom: "1px solid #1a1a28",
        cursor: "grab",
    },
    headerLabel: {
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
        color: "#6366f1", textTransform: "uppercase",
    },
    closeBtn: {
        background: "none", border: "none", color: "#333",
        fontSize: 14, cursor: "pointer", padding: "0 2px",
        lineHeight: 1, transition: "color 0.12s",
    },
    body: {
        padding: "10px 0 12px",
        maxHeight: 420, overflowY: "auto", scrollbarWidth: "none",
    },
    section: {
        padding: "6px 14px 10px",
        borderBottom: "1px solid #111",
    },
    sectionTitle: {
        fontSize: 9, fontWeight: 700, color: "#3a3a5a",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 8,
    },
    row: {
        display: "flex", alignItems: "baseline", gap: 10,
        padding: "3px 0",
    },
    key: {
        fontSize: 11, color: "#e2e2e2", fontWeight: 500,
        width: 110, flexShrink: 0,
    },
    desc: {
        fontSize: 11, color: "#3a3a5a", lineHeight: 1.4,
    },
};
