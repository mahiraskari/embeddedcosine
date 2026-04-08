import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchProjects, renameProject, deleteProject, fetchProjectPreview } from "../api/client";
import SetupView from "../components/SetupView";

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
    const [hovering, setHovering] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const commitRename = async () => {
        const trimmed = name.trim();
        // Revert to original if the user cleared the field entirely
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
            style={styles.card}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => { setHovering(false); setConfirmDelete(false); }}
        >
            {/* Top name */}
            <div style={styles.cardTop}>
                {editing ? (
                    <input
                        ref={inputRef}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={handleKeyDown}
                        style={styles.nameInput}
                    />
                ) : (
                    <span
                        style={styles.cardName}
                        title="Click to rename"
                        onClick={() => setEditing(true)}
                    >
                        {name}
                    </span>
                )}
            </div>

            {/* Thumbnail */}
            <div
                style={styles.thumbArea}
                onClick={() => onOpen(project.id)}
            >
                {project.has_map
                    ? <MiniMap projectId={project.id} />
                    : <div style={styles.noMap}>No map yet</div>
                }
            </div>

            {/* Bottom info */}
            <div style={styles.cardBottom}>
                <span style={styles.cardMeta}>
                    {project.point_count ? `${project.point_count.toLocaleString()} points` : "building…"}
                </span>

                {/* Delete — appears on hover */}
                {hovering && !editing && (
                    confirmDelete ? (
                        <div style={styles.deleteConfirm}>
                            <span style={{ fontSize: 10, color: "#555" }}>Delete?</span>
                            <button style={styles.confirmYes} onClick={() => onDelete(project.id)}>Yes</button>
                            <button style={styles.confirmNo} onClick={() => setConfirmDelete(false)}>No</button>
                        </div>
                    ) : (
                        <button
                            style={styles.deleteBtn}
                            onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                        >
                            ✕
                        </button>
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
            style={{ ...styles.card, ...styles.newCard, borderColor: hovering ? "#6366f1" : "#1e1e2e" }}
            onClick={onClick}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
        >
            <span style={{ fontSize: 26, color: hovering ? "#6366f1" : "#2a2a3a", transition: "color 0.15s" }}>+</span>
            <span style={{ fontSize: 12, color: hovering ? "#a5b4fc" : "#333", marginTop: 8, transition: "color 0.15s" }}>
                New project
            </span>
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
            <nav style={styles.nav}>
                <span style={styles.navLogo} onClick={() => navigate("/")}>embeddedcosine</span>
                <button
                    onClick={() => navigate("/")}
                    style={styles.backBtn}
                    onMouseEnter={e => e.currentTarget.style.color = "#a5b4fc"}
                    onMouseLeave={e => e.currentTarget.style.color = "#555"}
                >
                    ← Back
                </button>
            </nav>

            <div style={styles.content}>
                <div style={styles.pageHeader}>
                    <h1 style={styles.pageTitle}>Projects</h1>
                    <p style={styles.pageSubtitle}>
                        Each project is a dataset mapped in semantic space.
                        {projects.length > 0 && (
                            <span style={{ color: projects.length >= 10 ? "#f87171" : "#2a2a3a", marginLeft: 8 }}>
                                {projects.length} / 10
                            </span>
                        )}
                    </p>
                </div>

                {loading ? (
                    <div style={styles.empty}>Loading…</div>
                ) : (
                    <div style={styles.grid}>
                        {projects.length < 10 && <NewProjectCard onClick={() => setShowSetup(true)} />}
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
        background: "#05050a",
        color: "#e2e2e2",
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    nav: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 28px",
        borderBottom: "1px solid #111",
        background: "rgba(5,5,10,0.95)",
        backdropFilter: "blur(12px)",
    },
    navLogo: {
        fontSize: 15, fontWeight: 700, color: "#fff",
        letterSpacing: "-0.4px", cursor: "pointer",
    },
    backBtn: {
        background: "none", border: "none",
        color: "#555", fontSize: 12, cursor: "pointer",
        padding: "0 12px 0 0", fontFamily: "inherit",
        transition: "color 0.12s", letterSpacing: "0.02em",
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
        fontSize: 22, fontWeight: 700, color: "#fff",
        letterSpacing: "-0.4px", marginBottom: 6,
    },
    pageSubtitle: {
        fontSize: 13, color: "#3a3a4a",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: 16,
    },
    card: {
        background: "#0c0c14",
        border: "1px solid #1a1a28",
        borderRadius: 3,
        overflow: "hidden",
        position: "relative",
        transition: "border-color 0.15s",
    },
    cardTop: {
        padding: "10px 12px 8px",
        borderBottom: "1px solid #111",
    },
    thumbArea: {
        background: "#07070d",
        cursor: "pointer",
        height: 110,
        overflow: "hidden",
        borderBottom: "1px solid #111",
    },
    noMap: {
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", fontSize: 11, color: "#2a2a3a",
    },
    cardBottom: {
        padding: "10px 12px 12px",
        display: "flex", flexDirection: "column", gap: 3,
        position: "relative",
    },
    cardName: {
        fontSize: 13, fontWeight: 600, color: "#e2e2e2",
        cursor: "text", letterSpacing: "-0.2px",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    },
    nameInput: {
        fontSize: 13, fontWeight: 600, color: "#e2e2e2",
        background: "transparent", border: "none",
        borderBottom: "1px solid #6366f1",
        outline: "none", width: "100%", padding: 0,
        fontFamily: "inherit", letterSpacing: "-0.2px",
    },
    cardMeta: {
        fontSize: 11, color: "#2a2a3a",
    },
    deleteBtn: {
        position: "absolute", top: 10, right: 10,
        background: "none", border: "none",
        color: "#333", fontSize: 11,
        cursor: "pointer", padding: "2px 4px",
        transition: "color 0.12s",
        lineHeight: 1,
    },
    deleteConfirm: {
        position: "absolute", top: 8, right: 8,
        display: "flex", alignItems: "center", gap: 4,
    },
    confirmYes: {
        background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
        color: "#f87171", fontSize: 10, padding: "2px 6px",
        borderRadius: 2, cursor: "pointer",
    },
    confirmNo: {
        background: "none", border: "1px solid #222",
        color: "#555", fontSize: 10, padding: "2px 6px",
        borderRadius: 2, cursor: "pointer",
    },
    newCard: {
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        minHeight: 160, cursor: "pointer",
        borderStyle: "dashed", transition: "border-color 0.15s",
    },
    empty: {
        color: "#2a2a3a", fontSize: 13,
    },
};
