import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { searchGames, fetchDemoPoints } from "../api/client";
import { supabase } from "../supabase";
import LoginModal from "../components/LoginModal";
import AccountMenu from "../components/AccountMenu";
import Navbar from "../components/Navbar";
import MapView from "../components/MapView";
import "./LandingPage.css";

const FEATURES = [
    {
        icon: "⬡",
        title: "Upload anything",
        desc: "CSV or JSON. Pick the column to embed and the display name. No code changes needed.",
    },
    {
        icon: "◈",
        title: "AI-powered layout",
        desc: "Sentence-transformer embeddings + UMAP reduction place semantically similar items near each other.",
    },
    {
        icon: "⊹",
        title: "Natural language search",
        desc: "Type a concept, not a keyword. The search finds items whose meaning matches yours.",
    },
    {
        icon: "◫",
        title: "2D & 3D exploration",
        desc: "Pan and zoom a flat Voronoi map or fly through the point cloud in 3D.",
    },
];

// Points only — no labels on individual dots, clusters labelled separately
const DEMO_POINTS = [
    // Metroidvania cluster — top-left
    { x: 14, y: 20, color: "#818cf8", name: "Hollow Knight" },
    { x: 19, y: 16, color: "#a78bfa", name: "Celeste" },
    { x: 11, y: 27, color: "#7c3aed", name: "Dead Cells" },
    { x: 18, y: 30, color: "#9333ea", name: "Ori" },
    { x: 23, y: 23, color: "#818cf8", name: "Blasphemous" },
    // Competitive FPS — top-right
    { x: 82, y: 14, color: "#ef4444", name: "Apex Legends" },
    { x: 88, y: 20, color: "#f87171", name: "CS2" },
    { x: 78, y: 22, color: "#fca5a5", name: "Rust" },
    { x: 85, y: 28, color: "#dc2626", name: "Valorant" },
    { x: 91, y: 13, color: "#f87171", name: "TF2" },
    // Survival / Sandbox — centre
    { x: 52, y: 48, color: "#34d399", name: "Stardew Valley" },
    { x: 59, y: 54, color: "#6ee7b7", name: "Terraria" },
    { x: 55, y: 61, color: "#059669", name: "Valheim" },
    { x: 48, y: 55, color: "#10b981", name: "Minecraft" },
    { x: 63, y: 46, color: "#34d399", name: "Core Keeper" },
    // Soulslike — bottom-left
    { x: 22, y: 75, color: "#fbbf24", name: "Elden Ring" },
    { x: 16, y: 82, color: "#f59e0b", name: "Dark Souls III" },
    { x: 28, y: 80, color: "#d97706", name: "Sekiro" },
    { x: 13, y: 70, color: "#fbbf24", name: "Lies of P" },
    { x: 30, y: 70, color: "#f59e0b", name: "Nioh 2" },
    // Open World RPG — bottom-right
    { x: 76, y: 72, color: "#c084fc", name: "The Witcher 3" },
    { x: 83, y: 79, color: "#e879f9", name: "Cyberpunk 2077" },
    { x: 70, y: 80, color: "#a855f7", name: "Skyrim" },
    { x: 88, y: 70, color: "#c084fc", name: "RDR2" },
    // Puzzle / Narrative — mid-left
    { x: 12, y: 50, color: "#38bdf8", name: "Portal 2" },
    { x: 19, y: 57, color: "#0ea5e9", name: "Half-Life 2" },
    { x: 10, y: 61, color: "#38bdf8", name: "The Witness" },
];

const CLUSTERS = [
    { x: 17, y: 9,  label: "Metroidvania",      color: "#818cf8", anchor: "middle" },
    { x: 85, y: 7,  label: "Competitive FPS",   color: "#f87171", anchor: "middle" },
    { x: 56, y: 39, label: "Survival / Sandbox", color: "#34d399", anchor: "middle" },
    { x: 21, y: 89, label: "Soulslike",         color: "#fbbf24", anchor: "middle" },
    { x: 79, y: 90, label: "Open World RPG",    color: "#c084fc", anchor: "middle" },
    { x: 12, y: 42, label: "Puzzle",            color: "#38bdf8", anchor: "middle" },
];

const RESULT_COLORS = ["#818cf8","#a78bfa","#c084fc","#e879f9","#34d399","#38bdf8","#fbbf24","#f87171"];

function DemoMap() {
    const [hovered, setHovered] = useState(null);
    return (
        <div className="demo-map">
            <div className="demo-map-header">
                <span className="demo-map-tag">2D map</span>
                <span className="demo-map-title">Movies & TV shows · hover a point</span>
            </div>
            <svg viewBox="0 0 100 100" className="demo-svg" style={{ cursor: "crosshair" }}>
                <defs>
                    <radialGradient id="g1" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#818cf8" stopOpacity="0.13"/><stop offset="100%" stopColor="#818cf8" stopOpacity="0"/></radialGradient>
                    <radialGradient id="g2" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#34d399" stopOpacity="0.13"/><stop offset="100%" stopColor="#34d399" stopOpacity="0"/></radialGradient>
                    <radialGradient id="g3" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#f87171" stopOpacity="0.13"/><stop offset="100%" stopColor="#f87171" stopOpacity="0"/></radialGradient>
                    <radialGradient id="g4" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.13"/><stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/></radialGradient>
                    <radialGradient id="g5" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.13"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/></radialGradient>
                    <radialGradient id="g6" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#c084fc" stopOpacity="0.13"/><stop offset="100%" stopColor="#c084fc" stopOpacity="0"/></radialGradient>
                </defs>

                {/* Cluster blobs */}
                <ellipse cx="17" cy="22" rx="13" ry="14" fill="url(#g1)"/>
                <ellipse cx="85" cy="20" rx="12" ry="14" fill="url(#g3)"/>
                <ellipse cx="56" cy="53" rx="14" ry="14" fill="url(#g2)"/>
                <ellipse cx="21" cy="76" rx="13" ry="13" fill="url(#g4)"/>
                <ellipse cx="79" cy="77" rx="13" ry="13" fill="url(#g6)"/>
                <ellipse cx="13" cy="54" rx="9"  ry="11" fill="url(#g5)"/>

                {/* Cluster labels — in clear zones above blobs */}
                {CLUSTERS.map(c => (
                    <text key={c.label} x={c.x} y={c.y} fontSize="2.4" fill={c.color}
                        opacity="0.6" textAnchor={c.anchor} fontFamily="sans-serif" fontWeight="700">
                        {c.label}
                    </text>
                ))}

                {/* Dots — hover shows name */}
                {DEMO_POINTS.map(p => (
                    <rect
                        key={p.name}
                        x={p.x - 1} y={p.y - 1} width="2" height="2"
                        fill={p.color}
                        opacity={hovered === p.name ? 1 : 0.85}
                        onMouseEnter={() => setHovered(p.name)}
                        onMouseLeave={() => setHovered(null)}
                        style={{ cursor: "crosshair" }}
                    />
                ))}

                {/* Hover tooltip — shown as SVG text near hovered dot */}
                {hovered && (() => {
                    const p = DEMO_POINTS.find(d => d.name === hovered);
                    if (!p) return null;
                    // Flip the tooltip to the left for points near the right edge of the SVG
                    const tx = p.x > 70 ? p.x - 2 : p.x + 2.5;
                    const anchor = p.x > 70 ? "end" : "start";
                    return (
                        <g>
                            <rect x={tx - (anchor === "end" ? 22 : 0)} y={p.y - 3.5} width="22" height="4.5" rx="1" fill="rgba(10,10,20,0.92)"/>
                            <text x={anchor === "end" ? tx - 1 : tx + 1} y={p.y + 0.2}
                                fontSize="2.2" fill={p.color} textAnchor={anchor}
                                fontFamily="sans-serif" fontWeight="600">
                                {p.name}
                            </text>
                        </g>
                    );
                })()}
            </svg>
        </div>
    );
}

function DemoSearch() {
    const [query, setQuery]       = useState("");
    const [results, setResults]   = useState([]);
    const [loading, setLoading]   = useState(false);
    const [searched, setSearched] = useState(false);
    const [columns, setColumns]   = useState([]);
    const [field, setField]       = useState("Name"); // which column to display in results
    const [embeddedBy, setEmbeddedBy] = useState("");

    useEffect(() => {
        fetchDatasetStatus().then(s => {
            if (s.config?.columns) {
                setColumns(s.config.columns);
                setField(s.config.name_col || s.config.columns[0]);
                setEmbeddedBy(s.config.text_col || "");
            }
        }).catch(() => {});
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const data = await searchGames(query.trim(), 5, true);
            setResults(data.results);
        } catch {
            setResults([]);
        }
        setLoading(false);
    };

    return (
        <div className="demo-search">
            <div className="demo-map-header">
                <span className="demo-map-tag">search</span>
                <span className="demo-map-title">Try a live search</span>
                {embeddedBy && (
                    <span className="demo-embedded-by">embedded by: <b>{embeddedBy}</b></span>
                )}
            </div>
            <div className="demo-search-inner">
                <form className="demo-query-form" onSubmit={handleSearch}>
                    <span className="demo-query-icon">⊹</span>
                    <input
                        className="demo-query-input"
                        type="text"
                        placeholder="e.g. nausea and vomiting"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button type="submit" className="demo-query-btn" disabled={loading}>
                        {loading ? "…" : "→"}
                    </button>
                </form>

                {columns.length > 1 && (
                    <div className="demo-field-row">
                        <span className="demo-field-label">Show field</span>
                        <div className="demo-field-pills">
                            {columns.map(c => (
                                <button
                                    key={c}
                                    className={`demo-field-pill${field === c ? " active" : ""}`}
                                    onClick={() => setField(c)}
                                    type="button"
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {searched && (
                    <>
                        <div className="demo-results-label">Top matches · {field}</div>
                        <div className="demo-results">
                            {loading ? (
                                <div style={{ color: "#333", fontSize: 12, padding: "12px 0" }}>Searching…</div>
                            ) : results.length === 0 ? (
                                <div style={{ color: "#333", fontSize: 12, padding: "12px 0" }}>No results. Is the backend running?</div>
                            ) : results.map((r, i) => (
                                <div key={r.Name} className="demo-result-row">
                                    <span className="demo-result-rank">{i + 1}</span>
                                    <span className="demo-result-dot" style={{ background: RESULT_COLORS[i % RESULT_COLORS.length] }} />
                                    <div className="demo-result-info">
                                        <span className="demo-result-name">{r.Name}</span>
                                        {field !== "Name" && r[field] && (
                                            <span className="demo-result-field">
                                                {String(r[field]).slice(0, 60)}{String(r[field]).length > 60 ? "…" : ""}
                                            </span>
                                        )}
                                    </div>
                                    <span className="demo-result-score">{r.score.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {!searched && (
                    <p className="demo-search-note" style={{ marginTop: 16 }}>
                        Search hits the real FAISS index. Pick a field above to see different metadata in results.
                    </p>
                )}
            </div>
        </div>
    );
}

function LiveDemo({ navigate }) {
    const [points2d, setPoints2d]       = useState(null);
    const [points3d, setPoints3d]       = useState(null);
    const [dims, setDims]               = useState(2);
    const [showVoronoi, setShowVoronoi] = useState(false);
    const [query, setQuery]             = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching]     = useState(false);

    // Prefetch both 2D and 3D in parallel so toggling dims doesn't trigger another round-trip
    useEffect(() => {
        fetchDemoPoints(2).then(d => setPoints2d(d.points)).catch(() => {});
        fetchDemoPoints(3).then(d => setPoints3d(d.points)).catch(() => {});
    }, []);

    const points = dims === 3 ? points3d : points2d;
    const loaded = points !== null;

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) { setSearchResults(null); return; }
        setSearching(true);
        try {
            const d = await searchGames(query.trim(), 8, true);
            setSearchResults(d.results);
        } catch {}
        setSearching(false);
    };

    return (
        <div className="live-demo-wrap">
            {/* Controls bar */}
            <div className="live-demo-bar">
                <div className="live-demo-bar-left">
                    <span className="live-demo-bar-title">embeddedcosine_preview.exe</span>
                </div>
                <div className="live-demo-bar-right">
                    <form className="live-demo-search" onSubmit={handleSearch}>
                        <input
                            className="live-demo-search-input"
                            type="text"
                            placeholder="Search side effects…"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {searchResults && (
                            <button type="button" className="live-demo-clear"
                                onClick={() => { setQuery(""); setSearchResults(null); }}>✕</button>
                        )}
                        <button type="submit" className="live-demo-go" disabled={searching}>
                            {searching ? "…" : "→"}
                        </button>
                    </form>
                    {dims === 2 && (
                        <button
                            className={`live-demo-voronoi${showVoronoi ? " active" : ""}`}
                            type="button"
                            onClick={() => setShowVoronoi(v => !v)}
                        >
                            Voronoi
                        </button>
                    )}
                    <div className={`live-demo-dims live-demo-dims--${dims === 2 ? "left" : "right"}`}>
                        <span className="dim-toggle-slider" />
                        <button onClick={() => setDims(2)}>2D</button>
                        <button onClick={() => setDims(3)}>3D</button>
                    </div>
                    <div className="live-demo-xp-btns">
                        <span className="live-demo-xp-btn">—</span>
                        <span className="live-demo-xp-btn" style={{ cursor: "pointer" }} onClick={() => navigate("/map?demo=true")}>□</span>
                        <span className="live-demo-xp-btn live-demo-xp-btn--close">✕</span>
                    </div>
                </div>
            </div>

            {/* Map area */}
            <div className="live-demo-map">
                {!loaded ? (
                    <div className="live-demo-placeholder">
                        <div className="live-demo-spinner" />
                        <p>LOADING</p>
                    </div>
                ) : (
                    <MapView points={points} dims={dims} searchResults={searchResults} showVoronoi={showVoronoi} />
                )}
            </div>

            {/* Footer bar */}
            <div className="live-demo-footer">
                <span style={{ color: "#4a4a5a", fontSize: 11, fontFamily: "monospace" }}>
                    {points2d ? `${points2d.length.toLocaleString()} drugs · the closer two points, the more similar their side effects` : ""}
                </span>
                <button className="btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}
                    onClick={() => navigate("/map?demo=true")}>
                    Open full map for extra features →
                </button>
            </div>
        </div>
    );
}

export default function LandingPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [session, setSession]     = useState(null);
    const [showLogin, setShowLogin] = useState(searchParams.get("login") === "true");

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
            setSession(s ?? null);
            if (s) setShowLogin(false);
        });
        return () => subscription.unsubscribe();
    }, []);


    return (
        <div className="landing">
            {showLogin && (
                <LoginModal
                    onClose={() => setShowLogin(false)}
                    onSuccess={() => { setShowLogin(false); navigate("/datasets"); }}
                />
            )}

            <Navbar />

            {/* Demo */}
            <section className="section section-wide" id="demo">
                <div className="section-label">Interactive preview</div>
                <h2 className="section-title">2,900+ drugs, clustered by side effects in embedding space</h2>
                <LiveDemo navigate={navigate} />
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <span className="landing-nav-logo">embeddedcosine</span>
            </footer>
        </div>
    );
}
