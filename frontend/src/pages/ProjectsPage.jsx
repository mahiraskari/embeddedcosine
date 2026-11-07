import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProjects, renameProject, deleteProject, fetchProjectPreview } from "../api/client";
import SetupView from "../components/SetupView";
import Navbar from "../components/Navbar";

const DOT_COLORS = ["#818cf8","#a78bfa","#c084fc","#6366f1","#38bdf8","#34d399","#fbbf24","#f87171"];

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
        const ctx = canvas.getContext("2d");
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Normalise UMAP coordinates to canvas space with a small padding border
        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const pad = 8;

        pts.forEach((p, i) => {
            const cx = pad + ((p.x - minX) / (maxX - minX)) * (W - pad * 2);
            const cy = pad + ((p.y - minY) / (maxY - minY)) * (H - pad * 2);
            ctx.fillStyle = DOT_COLORS[i % DOT_COLORS.length];
            ctx.globalAlpha = 0.7;
            ctx.fillRect(cx - 1, cy - 1, 2, 2);
        });
        ctx.globalAlpha = 1;
    }, [pts]);

    return (
        <div ref={wrapRef} style={{ width: "100%", height: 110 }}>
            <canvas
                ref={canvasRef}
                width={220}
                height={110}
                style={{ width: "100%", height: 110, display: "block" }}
            />
        </div>
    );
}

function ProjectCard({ project, onOpen, onDelete }) {
    const [name, setName] = useState(project.name);
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
                        style={styles.titleText}
                        title="Click to rename"
                        onClick={() => setEditing(true)}
                    >
                        {name}
                    </span>
                )}
                <div style={styles.titleBtns}>
                    <span className="xp-title-btn" aria-hidden="true">—</span>
                    <span className="xp-title-btn" role="button" aria-label="Open map" onClick={() => onOpen(project.id)}>□</span>
                    <span
                        className="xp-title-btn xp-title-btn--close"
                        role="button"
                        aria-label="Delete dataset"
                        onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                    >✕</span>
                </div>
            </div>

            {/* Thumbnail */}
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
                        <span style={{ fontSize: 11, color: "var(--text-2)" }}>Delete?</span>
                        <button style={styles.confirmYes} onClick={() => onDelete(project.id)}>Yes</button>
                        <button style={styles.confirmNo} onClick={() => setConfirmDelete(false)}>No</button>
                    </div>
                ) : (
                    project.point_count > 0 && (
                        <span style={styles.cardMeta}>{project.point_count.toLocaleString()} points</span>
                    )
                )}
            </div>
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
            <div style={{ ...styles.thumbArea, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 110 }}>
                <span style={{ fontSize: 26, color: hovering ? "var(--accent-text)" : "var(--muted)", transition: "color 0.15s" }}>+</span>
                <span style={{ fontSize: 11, color: hovering ? "var(--accent-text-hover)" : "var(--muted)", marginTop: 6, transition: "color 0.15s", fontFamily: "var(--mono)" }}>
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
        <div style={styles.page}>
            <Navbar />

            <div style={styles.content}>
                <div style={styles.pageHeader}>
                    <h1 style={styles.pageTitle}>Datasets</h1>
                    <p style={styles.pageSubtitle}>
                        Each dataset is mapped in semantic space.
                        {projects.length > 0 && (
                            <span style={{ color: projects.length >= 4 ? "var(--negative)" : "var(--muted)", marginLeft: 8 }}>
                                {projects.length} / 4
                            </span>
                        )}
                    </p>
                </div>

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
            </div>
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
        marginBottom: 36,
    },
    pageTitle: {
        fontSize: 22, fontWeight: 600, color: "var(--text)",
        letterSpacing: "-0.4px", marginBottom: 6,
    },
    pageSubtitle: {
        fontSize: 13, color: "var(--muted)",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
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
        fontSize: 12,
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
        fontSize: 12,
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
        height: 110,
        overflow: "hidden",
    },
    noMap: {
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", fontSize: 11, color: "var(--muted)",
    },
    cardBottom: {
        padding: "8px 10px 10px",
        display: "flex", alignItems: "center", gap: 3,
        minHeight: 32,
        background: "var(--card)",
        borderTop: "1px solid var(--line)",
    },
    cardMeta: {
        fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)",
    },
    deleteConfirm: {
        display: "flex", alignItems: "center", gap: 4,
    },
    confirmYes: {
        background: "var(--negative-soft)", border: "1px solid rgba(239,68,68,0.3)",
        color: "var(--negative)", fontSize: 11, padding: "2px 6px",
        borderRadius: 2, cursor: "pointer",
    },
    confirmNo: {
        background: "none", border: "1px solid var(--line-strong)",
        color: "var(--text-2)", fontSize: 11, padding: "2px 6px",
        borderRadius: 2, cursor: "pointer",
    },
    newCard: {
        cursor: "pointer",
        transition: "border-color 0.15s",
        overflow: "hidden",
    },
    empty: {
        color: "var(--muted)", fontSize: 13,
    },
};
