import MapWindow from "./MapWindow";

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
    },
];

export default function KeybindPanel({ onClose }) {
    return (
        <MapWindow id="controls" title="controls.txt" onClose={onClose} anchor="center" defaultWidth={420} defaultHeight={520} offset={{ x: 16, y: 48 }}>
            <div className="map-window-scroll" style={{ padding: "8px 0 12px" }}>
                {SECTIONS.map((sec, i) => (
                    <section key={sec.title} style={{ ...s.section, borderBottom: i === SECTIONS.length - 1 ? "none" : "1px solid var(--line)" }}>
                        <h3 style={s.sectionTitle}>{sec.title}</h3>
                        {sec.rows.map(([key, desc]) => (
                            <div key={key} style={s.row}>
                                <span style={s.key}><kbd style={s.kbd}>{key}</kbd></span>
                                <span style={s.desc}>{desc}</span>
                            </div>
                        ))}
                    </section>
                ))}
            </div>
        </MapWindow>
    );
}

const s = {
    section: {
        padding: "10px 16px 12px",
    },
    sectionTitle: {
        margin: "0 0 8px",
        fontSize: 13, fontWeight: 500, color: "var(--text)",
    },
    row: {
        display: "grid",
        gridTemplateColumns: "150px 1fr",
        alignItems: "baseline",
        gap: 12,
        padding: "4px 0",
    },
    key: {
        minWidth: 0,
    },
    kbd: {
        display: "inline-block",
        fontFamily: "var(--mono)",
        fontSize: 12,
        color: "var(--text)",
        padding: "1px 6px",
        background: "var(--raised)",
        border: "1px solid var(--line-strong)",
        borderBottomWidth: 2,
        borderRadius: 4,
        whiteSpace: "nowrap",
    },
    desc: {
        fontSize: 13, color: "var(--text-2)", lineHeight: 1.5,
    },
};
