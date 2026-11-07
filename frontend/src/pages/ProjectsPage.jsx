import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProjects, renameProject, deleteProject, fetchProjectPreview } from "../api/client";
import SetupView from "../components/SetupView";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { closedWindows } from "../components/closedWindows";

const THUMB_HEIGHT = 220;

// Same position-based colouring as the main map: x sweeps teal → blue → violet → pink, y shifts lightness
const hsl = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;

function MiniMap({ projectId }) {
    const canvasRef = useRef(null);
    const wrapRef = useRef(null);
    const [pts, setPts] = useState(null);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        // Lazy-load the thumbnail — only fetch once the card scrolls into view
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    fetchProjectPreview(projectId).then(d => setPts(d.points)).catch(() => {});
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [projectId]);

    useEffect(() => {
        if (!pts || !canvasRef.current) return;
        const canvas = canvasRef.current;
        // Draw at the real on-screen size (and pixel density) so the preview stays sharp at any card width
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        const ctx = canvas.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const W = cssW, H = cssH;
        ctx.clearRect(0, 0, W, H);

        // Normalise UMAP coordinates to canvas space with a small padding border
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const pad = 16;
        const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;

        pts.forEach(p => {
            const nx = (p.x - minX) / spanX, ny = (p.y - minY) / spanY;
            const cx = pad + nx * (W - pad * 2);
            const cy = pad + (1 - ny) * (H - pad * 2);
            ctx.fillStyle = hsl(175 + nx * 150, 72, 72 - ny * 16);
            ctx.globalAlpha = 0.85;
            ctx.fillRect(cx - 1.5, cy - 1.5, 3, 3);
        });
        ctx.globalAlpha = 1;
    }, [pts]);

    return (
        <div ref={wrapRef} style={{ width: "100%", height: THUMB_HEIGHT }}>
            <canvas
                ref={canvasRef}
                style={{ width: "100%", height: THUMB_HEIGHT, display: "block" }}
            />
        </div>
    );
}

function ProjectCard({ project, onOpen, onDelete }) {
    const [name, setName] = useState(project.name);
    const [minimized, setMinimized] = useState(false);
    const [hidden, setHidden] = useState(false);

    // ✕ parks the card on the bar at the bottom of the screen until it is clicked there
    useEffect(() => {
        const key = `dataset-${project.id}`;
        if (hidden) closedWindows.add({ key, title: name, restore: () => setHidden(false) });
        else closedWindows.remove(key);
    }, [hidden, name, project.id]);
    useEffect(() => () => closedWindows.remove(`dataset-${project.id}`), [project.id]);

    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [hovering, setHovering] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commitRename = async () => {
        const trimmed = name.trim();
        if (!trimmed) { setName(project.name); setEditing(false); return; }
        await renameProject(project.id, trimmed).catch(() => {});
        setEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") commitRename();
        if (e.key === "Escape") { setName(project.name); setEditing(false); }
    };

    return (
        <div
            style={{
                ...styles.card,
                alignSelf: "start",
                display: hidden ? "none" : undefined,
                borderColor: hovering ? "var(--accent-line)" : "var(--line-strong)",
                boxShadow: "var(--xp-shadow)",
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => { setHovering(false); setConfirmDelete(false); }}
        >
            {/* XP Title Bar */}
            <div style={{
                ...styles.titleBar,
                background: hovering
                    ? "var(--xp-title-hover)"
                    : "var(--xp-title)",
                transition: "background 0.15s",
            }}>
                {editing ? (
                    <input
                        ref={inputRef}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleKeyDown}
                        style={styles.titleInput}
                    />
                ) : (
                    <span
                        className="keep-case"
                        style={styles.titleText}
                        title="Click to rename"
                        onClick={() => setEditing(true)}
                    >
                        {name}
                    </span>
                )}
                <div style={styles.titleBtns}>
                    <span className="xp-title-btn" role="button" aria-label={minimized ? "Restore" : "Minimize"} title={minimized ? "Restore" : "Minimize"} onClick={e => { e.stopPropagation(); setMinimized(m => !m); }}>—</span>
                    <span className="xp-title-btn" role="button" aria-label="Open map" title="Open map" onClick={() => onOpen(project.id)}>□</span>
                    <span
                        className="xp-title-btn xp-title-btn--close"
                        role="button"
                        aria-label="Close"
                        title="Close"
                        onClick={e => { e.stopPropagation(); setConfirmDelete(false); setHidden(true); }}
                    >✕</span>
                </div>
            </div>

            {/* Thumbnail (hidden while rolled up) */}
            {!minimized && <>
            <div style={styles.thumbArea} onClick={() => onOpen(project.id)}>
                {project.has_map
                    ? <MiniMap projectId={project.id} />
                    : <div style={styles.noMap}>No map yet</div>
                }
            </div>

            {/* Bottom info */}
            <div style={styles.cardBottom}>
                {confirmDelete ? (
                    <div style={styles.deleteConfirm}>
                        <span style={{ fontSize: 12, color: "var(--text-2)" }}>Delete?</span>
                        <button style={styles.confirmYes} onClick={() => onDelete(project.id)}>Yes</button>
                        <button style={styles.confirmNo} onClick={() => setConfirmDelete(false)}>No</button>
                    </div>
                ) : (
                    <>
                        {project.point_count > 0 && (
                            <span style={styles.cardMeta}>{project.point_count.toLocaleString()} points</span>
                        )}
                        <button style={styles.deleteBtn} onClick={() => setConfirmDelete(true)}>Delete</button>
                    </>
                )}
            </div>
            </>}
        </div>
    );
}

function NewProjectCard({ onClick }) {
    const [hovering, setHovering] = useState(false);
    return (
        <div
            style={{ ...styles.card, ...styles.newCard, borderColor: hovering ? "var(--accent-line)" : "var(--line-strong)" }}
            onClick={onClick}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            <div style={{ ...styles.titleBar, background: hovering ? "var(--xp-title-hover)" : "var(--xp-title-idle)", transition: "background 0.15s" }}>
                <span style={styles.titleText}>new_dataset.exe</span>
                <div style={styles.titleBtns}>
                    <span className="xp-title-btn" aria-hidden="true">—</span>
                    <span className="xp-title-btn" aria-hidden="true">□</span>
                    <span className="xp-title-btn xp-title-btn--close" aria-hidden="true">✕</span>
                </div>
            </div>
            <div style={{ ...styles.thumbArea, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: THUMB_HEIGHT }}>
                <span style={{ fontSize: 32, color: hovering ? "var(--accent-text)" : "var(--muted)", transition: "color 0.15s" }}>+</span>
                <span style={{ fontSize: 16, color: hovering ? "var(--accent-text-hover)" : "var(--muted)", marginTop: 8, transition: "color 0.15s", fontFamily: "var(--mono)" }}>
                    New dataset
                </span>
            </div>
            <div style={styles.cardBottom} />
        </div>
    );
}

export default function ProjectsPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [showSetup, setShowSetup] = useState(false);
    const [loading, setLoading] = useState(true);

    const load = () => {
        fetchProjects().then(d => setProjects(d.projects)).finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleDelete = async (id) => {
        await deleteProject(id).catch(() => {});
        setProjects(prev => prev.filter(p => p.id !== id));
    };

    if (showSetup) {
        return (
            <SetupView
                onDone={(projectId) => {
                    setShowSetup(false);
                    load();
                    if (projectId) navigate(`/map?id=${projectId}`);
                }}
                onBack={() => setShowSetup(false)}
            />
        );
    }

    return (
        <div className="page">
            <Navbar />

            <main className="page-main">
                <header style={styles.pageHeader}>
                    <h1 className="page-title">Your datasets</h1>
                    <p className="page-sub">
                        Open a map, or add a new CSV or JSON file. Click a title to rename it.
                    </p>
                    {!loading && (
                        <p style={{ ...styles.counter, color: projects.length >= 4 ? "var(--negative)" : "var(--muted)" }}>
                            {projects.length} of 4 datasets used
                            {projects.length >= 4 && " · delete one to add another"}
                        </p>
                    )}
                </header>

                {loading ? (
                    <div style={styles.empty}>Loading…</div>
                ) : (
                    <div style={styles.grid}>
                        {projects.length < 4 && <NewProjectCard onClick={() => setShowSetup(true)} />}
                        {projects.map(p => (
                            <ProjectCard
                                key={p.id}
                                project={p}
                                onOpen={(id) => navigate(`/map?id=${id}`)}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font)",
    },
    content: {
        maxWidth: 1400,
        margin: "0 auto",
        padding: "48px 28px",
    },
    pageHeader: {
        marginBottom: 32,
    },
    counter: {
        margin: "12px 0 0",
        fontFamily: "var(--mono)",
        fontSize: 14,
        fontVariantNumeric: "tabular-nums",
    },
    pageTitle: {
        fontSize: 22, fontWeight: 600, color: "var(--text)",
        letterSpacing: "-0.4px", marginBottom: 6,
    },
    pageSubtitle: {
        fontSize: 15, color: "var(--muted)",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))",
        gap: 24,
    },
    card: {
        background: "var(--card)",
        border: "1px solid var(--line-strong)",
        borderRadius: 6,
        overflow: "hidden",
        boxShadow: "var(--xp-shadow)",
        transition: "border-color 0.15s",
    },
    titleBar: {
        background: "var(--xp-title)",
        padding: "4px 4px 4px 10px",
        minHeight: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        userSelect: "none",
    },
    titleText: {
        fontSize: 14,
        fontWeight: 500,
        color: "#fff",
        fontFamily: "var(--mono)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: "text",
        flex: 1,
        minWidth: 0,
        marginRight: 6,
    },
    titleInput: {
        fontSize: 14,
        fontWeight: 500,
        color: "#fff",
        background: "transparent",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.4)",
        outline: "none",
        flex: 1,
        minWidth: 0,
        marginRight: 6,
        padding: 0,
        fontFamily: "var(--mono)",
        letterSpacing: "0.01em",
    },
    titleBtns: {
        display: "flex",
        gap: 2,
        flexShrink: 0,
    },
    thumbArea: {
        background: "var(--bg-deep)",
        cursor: "pointer",
        height: THUMB_HEIGHT,
        overflow: "hidden",
    },
    noMap: {
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", fontSize: 12, color: "var(--muted)",
    },
    deleteBtn: {
        marginLeft: "auto",
        background: "none", border: "none", padding: "2px 4px",
        color: "var(--muted)", fontSize: 14, cursor: "pointer", fontFamily: "inherit",
    },
    cardBottom: {
        padding: "8px 10px 10px",
        display: "flex", alignItems: "center", gap: 3,
        minHeight: 32,
        background: "var(--card)",
        borderTop: "1px solid var(--line)",
    },
    cardMeta: {
        fontSize: 14, color: "var(--muted)", fontFamily: "var(--mono)",
    },
    deleteConfirm: {
        display: "flex", alignItems: "center", gap: 4,
    },
    confirmYes: {
        background: "var(--negative-soft)", border: "1px solid rgba(239,68,68,0.3)",
        color: "var(--negative)", fontSize: 12, padding: "2px 6px",
        borderRadius: 2, cursor: "pointer",
    },
    confirmNo: {
        background: "none", border: "1px solid var(--line-strong)",
        color: "var(--text-2)", fontSize: 12, padding: "2px 6px",
        borderRadius: 2, cursor: "pointer",
    },
    newCard: {
        cursor: "pointer",
        transition: "border-color 0.15s",
        overflow: "hidden",
    },
    empty: {
        color: "var(--muted)", fontSize: 15,
    },
};
