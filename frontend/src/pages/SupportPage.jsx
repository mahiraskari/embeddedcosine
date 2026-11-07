import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";

const TIP_URL = "https://github.com/sponsors/mahiraskari";
const KOFI_URL = "https://ko-fi.com/mahiraskari";

const TOWARD = [
    ["Server costs",  "Keeping the backend online and fast."],
    ["Model hosting", "Running the sentence-transformer and FAISS index."],
    ["New features",  "Better search, more dataset formats, improved visualisations."],
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
                ? { left: dragPos.x, top: dragPos.y, width: `${(widthFrac || 0.42) * 100}%` }
                : { left: `${initialFrac.x * 100}%`, top: `${initialFrac.y * 100}%`, width: `${(widthFrac || 0.42) * 100}%` };

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

export default function SupportPage() {
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

                <XPWindow title="keep_it_running.txt" initialFrac={{ x: 0.14, y: 0.10 }} widthFrac={0.37} containerRef={canvasRef} isMobile={isMobile}>
                    <p style={s.heroSub}>
                        embeddedcosine is free to use. If you find it useful or just think it's cool,
                        leaving a tip helps keep the servers running and the project improving.
                    </p>
                </XPWindow>

                <XPWindow title="tip.exe" initialFrac={{ x: 0.45, y: 0.31 }} widthFrac={0.39} containerRef={canvasRef} isMobile={isMobile}>
                    <div style={s.tipInner}>
                        <p style={s.tipText}>
                            Everything here runs on real servers, real compute, and real time.
                            If you've found value in it, a tip goes a long way.
                        </p>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <a href={TIP_URL} target="_blank" rel="noopener noreferrer" style={s.btn}>
                                GitHub Sponsors
                            </a>
                            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" style={{ ...s.btn, background: "linear-gradient(180deg, #5c9e31 0%, #3d6e1f 100%)" }}>
                                Ko-fi
                            </a>
                        </div>
                        <p style={s.note}>No account needed. Any amount helps.</p>
                    </div>
                </XPWindow>

                <XPWindow title="breakdown_of_costs" initialFrac={{ x: 0.21, y: 0.63 }} widthFrac={0.43} containerRef={canvasRef} isMobile={isMobile}>
                    {TOWARD.map(([title, desc], i) => (
                        <div key={title} style={{
                            ...s.row,
                            background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                        }}>
                            <span style={s.rowTitle}>{title}</span>
                            <span style={s.rowDesc}>{desc}</span>
                        </div>
                    ))}
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
        padding: "24px",
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
    eyebrow: {
        fontSize: 11,
        fontWeight: 600,
        
       
        color: "var(--accent-text)",
        marginBottom: 16,
        fontFamily: "var(--mono)",
    },
    heroTitle: {
        fontSize: "clamp(24px, 3vw, 40px)",
        fontWeight: 600,
        color: "var(--text)",
        letterSpacing: "-1.4px",
        lineHeight: 1.08,
        marginBottom: 16,
    },
    heroSub: {
        fontSize: 13,
        color: "var(--text-2)",
        lineHeight: 1.75,
        fontFamily: "var(--mono)",
        margin: 0,
    },
    canvas: {
        position: "relative",
        width: "100%",
        flex: 1,
        minHeight: "calc(100vh - 120px)",
        padding: "32px",
        boxSizing: "border-box",
        overflow: "hidden",
    },
    tipInner: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    tipText: {
        fontSize: 14,
        color: "var(--text-2)",
        lineHeight: 1.75,
        fontFamily: "var(--mono)",
        margin: 0,
    },
    btn: {
        display: "inline-block",
        background: "var(--xp-title)",
        color: "var(--text)",
        textDecoration: "none",
        padding: "10px 20px",
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "-0.1px",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        alignSelf: "flex-start",
    },
    note: {
        fontSize: 11,
        color: "var(--muted)",
        margin: 0,
        fontFamily: "var(--mono)",
    },
    row: {
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 16,
        padding: "12px 12px",
        borderBottom: "1px solid var(--line)",
    },
    rowTitle: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--accent-text)",
        letterSpacing: "0.02em",
        fontFamily: "var(--mono)",
    },
    breakdownNote: {
        fontSize: 11,
        color: "var(--muted)",
        fontFamily: "var(--mono)",
        margin: "16px 12px 0",
        lineHeight: 1.6,
    },
    rowDesc: {
        fontSize: 12,
        color: "var(--text-2)",
        lineHeight: 1.6,
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
