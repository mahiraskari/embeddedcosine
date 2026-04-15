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
                    <span style={xp.titleBtn}>—</span>
                    <span
                        style={{ ...xp.titleBtn, cursor: "pointer" }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={() => setMaximized(m => !m)}
                    >□</span>
                    <span
                        style={{ ...xp.titleBtn, cursor: "pointer", background: "linear-gradient(180deg, #e8504a 0%, #b52020 100%)" }}
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
        border: "1px solid rgba(255,255,255,0.06)",
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
        gap: 5,
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
        padding: "24px",
    },
};

const s = {
    page: {
        background: "#05050a",
        color: "#e2e2e2",
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
    },
    eyebrow: {
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#818cf8",
        marginBottom: 16,
        fontFamily: "monospace",
    },
    heroTitle: {
        fontSize: "clamp(24px, 3vw, 40px)",
        fontWeight: 800,
        color: "#fff",
        letterSpacing: "-1.4px",
        lineHeight: 1.08,
        marginBottom: 16,
    },
    heroSub: {
        fontSize: 13,
        color: "#555",
        lineHeight: 1.75,
        fontFamily: "monospace",
        margin: 0,
    },
    canvas: {
        position: "relative",
        width: "100%",
        flex: 1,
        minHeight: "calc(100vh - 120px)",
        padding: "32px 48px",
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
        color: "#555",
        lineHeight: 1.75,
        fontFamily: "monospace",
        margin: 0,
    },
    btn: {
        display: "inline-block",
        background: "linear-gradient(180deg, #2d5fa8 0%, #1a3d7a 100%)",
        color: "#fff",
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
        color: "#2a2a3a",
        margin: 0,
        fontFamily: "monospace",
    },
    row: {
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 16,
        padding: "12px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
    },
    rowTitle: {
        fontSize: 12,
        fontWeight: 700,
        color: "#818cf8",
        letterSpacing: "0.02em",
        fontFamily: "monospace",
    },
    breakdownNote: {
        fontSize: 11,
        color: "#2a2a3a",
        fontFamily: "monospace",
        margin: "16px 12px 0",
        lineHeight: 1.6,
    },
    rowDesc: {
        fontSize: 12,
        color: "#444",
        lineHeight: 1.6,
    },
    footer: {
        display: "flex",
        alignItems: "center",
        padding: "20px 48px",
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
