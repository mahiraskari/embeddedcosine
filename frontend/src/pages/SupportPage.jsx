import { useState, useRef } from "react";
import Navbar from "../components/Navbar";

const DONATE_URL = "https://github.com/sponsors/mahiraskari";
const KOFI_URL = "https://ko-fi.com/mahiraskari";

const TOWARD = [
    ["Server costs",  "Keeping the backend online and fast."],
    ["Model hosting", "Running the sentence-transformer and FAISS index."],
    ["New features",  "Better search, more dataset formats, improved visualisations."],
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

export default function SupportPage() {
    const canvasRef = useRef(null);

    return (
        <div style={s.page}>
            <Navbar />

            <div ref={canvasRef} style={s.canvas}>

                <XPWindow title="keep_it_running.txt" initialPos={{ x: 240, y: 100 }} width={620} containerRef={canvasRef}>

                    <p style={s.heroSub}>
                        embeddedcosine is free to use. If you think it's cool or found
                        a use for it, a small donation helps keep it running and improving.
                    </p>
                </XPWindow>

                <XPWindow title="donate.exe" initialPos={{ x: 760, y: 200 }} width={640} containerRef={canvasRef}>
                    <div style={s.donateInner}>
                        <p style={s.donateText}>
                            Everything here runs on real servers, real compute, and real time.
                            Any contribution goes a long way toward keeping this tool free and improving.
                        </p>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" style={s.btn}>
                                GitHub Sponsors
                            </a>
                            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" style={{ ...s.btn, background: "linear-gradient(180deg, #5c9e31 0%, #3d6e1f 100%)" }}>
                                Ko-fi
                            </a>
                        </div>
                        <p style={s.note}>No account needed. Any amount helps.</p>
                    </div>
                </XPWindow>

                <XPWindow title="breakdown_of_costs" initialPos={{ x: 400, y: 400 }} width={700} containerRef={canvasRef}>
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
        padding: "32px 48px",
        boxSizing: "border-box",
        overflow: "hidden",
    },
    donateInner: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    donateText: {
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
