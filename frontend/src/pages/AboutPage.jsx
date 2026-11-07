import { useState, useRef, useEffect } from "react";
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
    ["01", "Upload",         <>Drop a CSV or JSON. The backend reads the file with pandas and returns a cleaned and tidied column list. <a href="https://kaggle.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-text)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>Kaggle</a> is a good place to find datasets on any topic, and what I used for testing.</> ],
    ["02", "Configure",      "Pick a display-name column and one or more columns to embed. They get joined into a single string per row."],
    ["03", "Embed",          "The AI model reads each row and embeds it into a vector of numbers that captures its meaning.", "embedded"],
    ["04", "Index + reduce", "FAISS builds a cosine-similarity index. UMAP projects the vectors into 2D and 3D space.", "cosine"],
    ["05", "Explore",        "Pan, zoom, fly through the point cloud. Search by concept. Click any point for details."],
];

function XPWindow({ title, children, initialFrac, widthFrac, containerRef, isMobile }) {
    const [dragPos, setDragPos] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [closed, setClosed] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const selfRef = useRef(null);

    if (closed) return null;

    const onTitleMouseDown = (e) => {
        if (maximized || isMobile) return;
        e.preventDefault();
        const selfRect = selfRef.current.getBoundingClientRect();
        const contRect = containerRef.current.getBoundingClientRect();
        const ox = selfRect.left - contRect.left;
        const oy = selfRect.top  - contRect.top;
        const mx = e.clientX, my = e.clientY;
        setDragPos({ x: ox, y: oy });
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
            setDragPos({ x: newX, y: newY });
        };
        const onUp = () => {
            setDragging(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    const posStyle = isMobile
        ? { position: "relative", left: 0, top: 0, width: "100%" }
        : maximized
            ? { left: 0, top: 0, width: "100%", height: "100%" }
            : dragPos
                ? { left: dragPos.x, top: dragPos.y, width: `${(widthFrac || 0.45) * 100}%` }
                : { left: `${initialFrac.x * 100}%`, top: `${initialFrac.y * 100}%`, width: `${(widthFrac || 0.45) * 100}%` };

    return (
        <div ref={selfRef} style={{
            ...xp.window,
            position: isMobile ? "relative" : "absolute",
            ...posStyle,
            display: "flex",
            flexDirection: "column",
            cursor: dragging ? "grabbing" : "default",
            userSelect: dragging ? "none" : "auto",
            zIndex: dragging ? 100 : maximized ? 50 : 1,
        }}>
            <div style={{ ...xp.titleBar, cursor: maximized ? "default" : "grab" }} onMouseDown={onTitleMouseDown}>
                <span style={xp.titleText}>{title}</span>
                <div style={xp.titleBtns}>
                    <span className="xp-title-btn" aria-hidden="true">—</span>
                    <span
                        className="xp-title-btn"
                        role="button"
                        aria-label={maximized ? "Restore window" : "Maximize window"}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setMaximized(m => !m)}
                    >□</span>
                    <span
                        className="xp-title-btn xp-title-btn--close"
                        role="button"
                        aria-label="Close window"
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setClosed(true)}
                    >✕</span>
                </div>
            </div>
            <div style={{ ...xp.windowBody, ...(maximized ? { flex: 1, overflowY: "auto" } : {}) }}>{children}</div>
        </div>
    );
}

export default function AboutPage() {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    const canvasStyle = isMobile
        ? { display: "flex", flexDirection: "column", gap: 16, padding: "16px", boxSizing: "border-box", width: "100%" }
        : s.canvas;

    return (
        <div style={s.page}>
            <Navbar />

            <div ref={canvasRef} style={canvasStyle}>

                <XPWindow title="how_it_works.exe" initialFrac={{ x: 0.03, y: 0.02 }} widthFrac={0.46} containerRef={canvasRef} isMobile={isMobile}>
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
                        Steps 03 + 04 = <span style={{ color: "var(--accent-text)" }}>embedded</span> + <span style={{ color: "var(--accent-text)" }}>cosine</span> = embeddedcosine
                    </p>
                </XPWindow>

                <XPWindow title="tech_stack.txt" initialFrac={{ x: 0.48, y: 0.12 }} widthFrac={0.50} containerRef={canvasRef} isMobile={isMobile}>
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

                <XPWindow title="run_locally.txt" initialFrac={{ x: 0.03, y: 0.63 }} widthFrac={0.34} containerRef={canvasRef} isMobile={isMobile}>
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
                        style={{ color: "var(--accent-text)", fontSize: 14, fontFamily: "var(--mono)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                    >
                        github.com/mahiraskari/embeddedcosine/tree/local
                    </a>
                </XPWindow>

                <XPWindow title="readme.txt" initialFrac={{ x: 0.40, y: 0.50 }} widthFrac={0.57} containerRef={canvasRef} isMobile={isMobile}>
                    <p style={s.readmeText}>
                        embeddedcosine turns any structured dataset into a navigable semantic map.
                        Similar things cluster together. You search by meaning, not keywords.
                        Built by one person, for anyone curious about their data.
                    </p>
                    <p style={s.readmeText}>
                        It started as a personal project to actually see what embedding models do to data.
                        I wanted to watch ideas group together in space, and thought others might find that interesting too.
                    </p>
                    <p style={s.readmeText}>
                        It's completely free to use and{" "}
                        <a
                            href="https://github.com/mahiraskari/embeddedcosine"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent-text)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                        >
                            open source on GitHub
                        </a>
                        . Fork it, edit it, do whatever you want with it. If you build something cool with it or just want to say thanks,{" "}
                        <span
                            style={{ color: "var(--accent-text)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                            onClick={() => navigate("/support")}
                        >
                            supporting it
                        </span>
                        {" "}goes a long way.
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
        border: "1px solid #1e4ca8",
        boxShadow: "var(--xp-shadow)",
    },
    titleBar: {
        background: "var(--xp-title)",
        padding: "4px 4px 4px 10px",
        minHeight: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        userSelect: "none",
    },
    titleText: {
        fontSize: 12,
        fontWeight: 500,
        color: "#fff",
        fontFamily: "var(--mono)",
        textShadow: "0 1px 0 rgba(0,0,0,0.35)",
    },
    titleBtns: {
        display: "flex",
        gap: 2,
    },
    windowBody: {
        background: "var(--card)",
        padding: "20px",
    },
};

const s = {
    page: {
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
    },
    canvas: {
        position: "relative",
        width: "100%",
        minHeight: "max(calc(100vh - 120px), 1000px)",
        flex: 1,
        padding: "32px",
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
        background: "var(--card)",
        padding: "20px 18px",
    },
    stepN: {
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--accent-text)",
        
        marginBottom: 8,
        fontFamily: "var(--mono)",
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: 500,
        color: "var(--text)",
        marginBottom: 6,
    },
    stepDesc: {
        fontSize: 12,
        color: "var(--text-2)",
        lineHeight: 1.6,
    },
    tag: {
        display: "inline-block",
        marginTop: 10,
        fontSize: 11,
        fontWeight: 600,
        
        color: "var(--accent-text)",
        background: "var(--accent-soft)",
        border: "1px solid rgba(129,140,248,0.18)",
        padding: "2px 7px",
        borderRadius: 2,
        fontFamily: "var(--mono)",
    },
    nameNote: {
        fontSize: 12,
        color: "var(--muted)",
        fontFamily: "var(--mono)",
    },
    stackRow: {
        display: "grid",
        gridTemplateColumns: "180px 1fr",
        gap: 16,
        padding: "11px 12px",
        borderBottom: "1px solid var(--line)",
    },
    stackLabel: {
        fontSize: 11,
        fontWeight: 600,
        color: "var(--accent-text)",
        
        fontFamily: "var(--mono)",
    },
    stackValue: {
        fontSize: 12,
        color: "var(--text-2)",
        lineHeight: 1.6,
    },
    readmeText: {
        fontSize: 14,
        color: "var(--text-2)",
        lineHeight: 1.8,
        marginBottom: 12,
        fontFamily: "var(--mono)",
    },
    footer: {
        display: "flex",
        alignItems: "center",
        padding: "24px 32px",
        borderTop: "1px solid var(--line)",
        marginTop: "auto",
    },
    footerLogo: {
        fontSize: 15,
        fontWeight: 600,
        color: "var(--text)",
        letterSpacing: "-0.4px",
    },
};
