import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const STACK = [
    { label: "Embeddings",               value: "all-MiniLM-L6-v2 via sentence-transformers. 384-dimensional vectors per item." },
    { label: "Vector index",             value: "FAISS IndexFlatIP. Cosine similarity search over the full dataset." },
    { label: "Dimensionality reduction", value: "UMAP. Projects 384-dim vectors down to 2D and 3D for visualisation." },
    { label: "Backend",                  value: "FastAPI + Python. Streaming pipeline via SSE, JWT auth via Supabase." },
    { label: "Frontend",                 value: "React + Three.js. Interactive 2D/3D point cloud renderer." },
];

const STEPS = [
    ["01", "Upload",         <>Drop a CSV or JSON. The backend reads the file with pandas and returns a cleaned and tidied column list. <a href="https://kaggle.com" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", textDecoration: "none" }}>Kaggle</a> is a good place to find datasets on any topic, and what I used for testing.</> ],
    ["02", "Configure",      "Pick a display-name column and one or more columns to embed. They get joined into a single string per row."],
    ["03", "Embed",          "The AI model reads each row and embeds it into a vector of numbers that captures its meaning.", "embedded"],
    ["04", "Index + reduce", "FAISS builds a cosine-similarity index. UMAP projects the vectors into 2D and 3D space.", "cosine"],
    ["05", "Explore",        "Pan, zoom, fly through the point cloud. Search by concept. Click any point for details."],
];

function XPWindow({ title, children, initialPos, width, containerRef }) {
    const [pos, setPos] = useState(initialPos || { x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const selfRef = useRef(null);

    const onTitleMouseDown = (e) => {
        e.preventDefault();
        const ox = pos.x, oy = pos.y;
        const mx = e.clientX, my = e.clientY;
        setDragging(true);

        const onMove = (ev) => {
            let newX = ox + (ev.clientX - mx);
            let newY = oy + (ev.clientY - my);
            if (containerRef?.current && selfRef.current) {
                const cw = containerRef.current.offsetWidth;
                const ch = containerRef.current.offsetHeight;
                const sw = selfRef.current.offsetWidth;
                const sh = selfRef.current.offsetHeight;
                newX = Math.max(0, Math.min(newX, cw - sw));
                newY = Math.max(0, Math.min(newY, ch - sh));
            }
            setPos({ x: newX, y: newY });
        };
        const onUp = () => {
            setDragging(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div ref={selfRef} style={{
            ...xp.window,
            position: "absolute",
            left: pos.x,
            top: pos.y,
            width: width || "auto",
            cursor: dragging ? "grabbing" : "default",
            userSelect: dragging ? "none" : "auto",
            zIndex: dragging ? 100 : 1,
        }}>
            <div style={{ ...xp.titleBar, cursor: "grab" }} onMouseDown={onTitleMouseDown}>
                <span style={xp.titleText}>{title}</span>
                <div style={xp.titleBtns}>
                    <span style={xp.titleBtn}>—</span>
                    <span style={xp.titleBtn}>□</span>
                    <span style={{ ...xp.titleBtn, background: "linear-gradient(180deg, #e8504a 0%, #b52020 100%)" }}>✕</span>
                </div>
            </div>
            <div style={xp.windowBody}>{children}</div>
        </div>
    );
}

export default function AboutPage() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    return (
        <div style={s.page}>
            <Navbar />

            <div ref={canvasRef} style={s.canvas}>

                <XPWindow title="how_it_works.exe" initialPos={{ x: 100, y: 40 }} width={680} containerRef={canvasRef}>
                    <div style={s.stepsGrid}>
                        {STEPS.map(([n, title, desc, tag]) => (
                            <div key={n} style={s.stepCard}>
                                <span style={s.stepN}>{n}</span>
                                <div style={s.stepTitle}>{title}</div>
                                <div style={s.stepDesc}>{desc}</div>
                                {tag && <span style={s.tag}>{tag}</span>}
                            </div>
                        ))}
                    </div>
                    <p style={s.nameNote}>
                        Steps 03 + 04 = <span style={{ color: "#818cf8" }}>embedded</span> + <span style={{ color: "#818cf8" }}>cosine</span> = embeddedcosine
                    </p>
                </XPWindow>

                <XPWindow title="tech_stack.txt" initialPos={{ x: 750, y: 120 }} width={760} containerRef={canvasRef}>
                    {STACK.map(({ label, value }, i) => (
                        <div key={label} style={{
                            ...s.stackRow,
                            background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                        }}>
                            <span style={s.stackLabel}>{label}</span>
                            <span style={s.stackValue}>{value}</span>
                        </div>
                    ))}
                </XPWindow>

                <XPWindow title="run_locally.txt" initialPos={{ x: 100, y: 570 }} width={400} containerRef={canvasRef}>
                    <p style={s.readmeText}>
                        There is a local branch of this project made specifically to run it on your
                        own machine without any of the account setup, server limits, or extra configuration.
                        Follow the README commands in the link below to get started.
                    </p>
                    <p style={s.readmeText}>
                        No sign in, no file size limit, no rate limits. Everything runs on your CPU and is typically 4–10x faster than the hosted version depending on your specs.
                    </p>
                    <a
                        href="https://github.com/mahiraskari/embeddedcosine/tree/local"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#818cf8", fontSize: 12, textDecoration: "none", borderBottom: "1px solid rgba(129,140,248,0.3)" }}
                    >
                        github.com/mahiraskari/embeddedcosine/tree/local →
                    </a>
                </XPWindow>

                <XPWindow title="readme.txt" initialPos={{ x: 540, y: 490 }} width={800} containerRef={canvasRef}>
                    <p style={s.readmeText}>
                        embeddedcosine turns any structured dataset into a navigable semantic map.
                        Similar things cluster together. You search by meaning, not keywords.
                        Built by one person, for anyone curious about their data.
                    </p>
                    <p style={s.readmeText}>
                        embeddedcosine is a personal project, a way to view vector databases
                        in 2D and 3D dimensional planes. Built because I wanted to actually
                        see what embedding models do to data, and thought others might too.
                    </p>
                    <p style={s.readmeText}>
                        It's free to use. If you find it useful or just think it's cool,{" "}
                        <span
                            style={{ color: "#818cf8", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                            onClick={() => navigate("/support")}
                        >
                            consider supporting it
                        </span>.
                    </p>
                </XPWindow>

            </div>

            <footer style={s.footer}>
                <span style={s.footerLogo}>embeddedcosine</span>
            </footer>
        </div>
    );
}

const xp = {
    window: {
        borderRadius: 6,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "5px 5px 0px #000",
    },
    titleBar: {
        background: "linear-gradient(180deg, #2d5fa8 0%, #1a3d7a 100%)",
        padding: "7px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        userSelect: "none",
    },
    titleText: {
        fontSize: 12,
        fontWeight: 600,
        color: "#fff",
        letterSpacing: "0.01em",
        fontFamily: "monospace",
    },
    titleBtns: {
        display: "flex",
        gap: 4,
    },
    titleBtn: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 14,
        borderRadius: 2,
        background: "linear-gradient(180deg, #4a7fd4 0%, #2a5aa8 100%)",
        border: "1px solid rgba(0,0,0,0.35)",
        fontSize: 8,
        color: "#fff",
        fontWeight: 700,
        cursor: "default",
        userSelect: "none",
        letterSpacing: 0,
        lineHeight: 1,
    },
    windowBody: {
        background: "#08080f",
        padding: "20px",
    },
};

const s = {
    page: {
        background: "#05050a",
        color: "#e2e2e2",
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: "flex",
        flexDirection: "column",
    },
    canvas: {
        position: "relative",
        width: "100%",
        height: 1020,
        padding: "32px 48px",
        boxSizing: "border-box",
        overflow: "hidden",
    },
    stepsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 1,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 16,
    },
    stepCard: {
        background: "#08080f",
        padding: "20px 18px",
    },
    stepN: {
        display: "block",
        fontSize: 10,
        fontWeight: 700,
        color: "#2d5fa8",
        letterSpacing: "0.1em",
        marginBottom: 8,
        fontFamily: "monospace",
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: 650,
        color: "#e2e2e2",
        marginBottom: 6,
    },
    stepDesc: {
        fontSize: 12,
        color: "#444",
        lineHeight: 1.6,
    },
    tag: {
        display: "inline-block",
        marginTop: 10,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: "#818cf8",
        background: "rgba(129,140,248,0.08)",
        border: "1px solid rgba(129,140,248,0.18)",
        padding: "2px 7px",
        borderRadius: 2,
        fontFamily: "monospace",
    },
    nameNote: {
        fontSize: 12,
        color: "#333",
        fontFamily: "monospace",
    },
    stackRow: {
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 16,
        padding: "11px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
    },
    stackLabel: {
        fontSize: 11,
        fontWeight: 700,
        color: "#818cf8",
        letterSpacing: "0.04em",
        fontFamily: "monospace",
    },
    stackValue: {
        fontSize: 12,
        color: "#444",
        lineHeight: 1.6,
    },
    readmeText: {
        fontSize: 14,
        color: "#555",
        lineHeight: 1.8,
        marginBottom: 12,
        fontFamily: "monospace",
    },
    footer: {
        display: "flex",
        alignItems: "center",
        padding: "24px 48px",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        marginTop: "auto",
    },
    footerLogo: {
        fontSize: 15,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.4px",
    },
};
