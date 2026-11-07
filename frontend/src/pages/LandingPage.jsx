import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { searchGames, fetchDemoPoints } from "../api/client";
import LoginModal from "../components/LoginModal";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MapView from "../components/MapView";
import XPWindow from "../components/XPWindow";
import "./LandingPage.css";

const EXAMPLE_QUERIES = ["drowsiness", "nausea", "hair loss", "skin rash"];

const STEPS = [
    ["01", "Upload", <>Drop a CSV or JSON. The backend reads the file with pandas and returns a cleaned and tidied column list. <a className="text-link" href="https://kaggle.com" target="_blank" rel="noopener noreferrer">Kaggle</a> is a good place to find datasets on any topic, and what I used for testing.</>],
    ["02", "Configure", "Pick a display-name column and one or more columns to embed. They get joined into a single string per row."],
    ["03", "Embed", "The AI model reads each row and embeds it into a vector of numbers that captures its meaning.", "embedded"],
    ["04", "Index + reduce", "FAISS builds a cosine-similarity index. UMAP projects the vectors into 2D and 3D space.", "cosine"],
    ["05", "Explore", "Pan, zoom, fly through the point cloud. Search by concept. Click any point for details."],
];

const STACK = [
    ["Embeddings", "all-MiniLM-L6-v2 via sentence-transformers. 384-dimensional vectors per item."],
    ["Vector index", "FAISS IndexFlatIP. Cosine similarity search over the full dataset."],
    ["Dimensionality reduction", "UMAP. Projects 384-dim vectors down to 2D and 3D for visualisation."],
    ["Backend", "FastAPI + Python. Streaming pipeline via SSE, JWT auth via Supabase."],
    ["Frontend", "React + Three.js. Interactive 2D/3D point cloud renderer."],
];

// ── Live demo ────────────────────────────────────────────────────────────────

function LiveDemo({ navigate }) {
    const [points2d, setPoints2d]       = useState(null);
    const [points3d, setPoints3d]       = useState(null);
    const [failed, setFailed]           = useState(false);
    const [dims, setDims]               = useState(2);
    const [showVoronoi, setShowVoronoi] = useState(false);
    const [query, setQuery]             = useState("");
    const [lastQuery, setLastQuery]     = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching]     = useState(false);
    const [showInfo, setShowInfo]       = useState(true);

    // Prefetch both 2D and 3D in parallel so toggling dims doesn't trigger another round-trip
    useEffect(() => {
        fetchDemoPoints(2).then(d => setPoints2d(d.points)).catch(() => setFailed(true));
        fetchDemoPoints(3).then(d => setPoints3d(d.points)).catch(() => {});
    }, []);

    const points = dims === 3 ? points3d : points2d;
    const loaded = points !== null;

    const runSearch = async (q) => {
        const trimmed = q.trim();
        if (!trimmed) { setSearchResults(null); return; }
        setSearching(true);
        try {
            const d = await searchGames(trimmed, 25, true);
            setSearchResults(d.results);
            setLastQuery(trimmed);
        } catch {
            setSearchResults(null);
        }
        setSearching(false);
    };

    const clear = () => { setQuery(""); setSearchResults(null); setLastQuery(""); };

    // Carry the current search over to the full map so the results list is waiting there
    // (and, when a point was clicked, open the full map with that point selected)
    // The map keeps the click handler it was first given, so read the current search from a ref
    const searchRef = useRef({ lastQuery: "", hasResults: false });
    useEffect(() => { searchRef.current = { lastQuery, hasResults: Boolean(searchResults) }; }, [lastQuery, searchResults]);
    const openFullMap = (point) => {
        const params = new URLSearchParams({ demo: "true" });
        const { lastQuery: q, hasResults } = searchRef.current;
        if (q && hasResults) params.set("q", q);
        if (point?.Name) params.set("select", point.Name);
        navigate(`/map?${params.toString()}`);
    };

    const status = !points2d
        ? ""
        : searchResults
            ? `${searchResults.length} closest matches for “${lastQuery}”`
            : `${points2d.length.toLocaleString()} drugs · hover a point to see its name, click it to open its details`;

    return (
        <XPWindow
            id="demo"
            title="drug_side_effects.exe"
            className="live-demo"
            bodyClassName="live-demo-body"
            collapsible={false}
            onMaximize={() => openFullMap()}
            maximizeLabel="Open full map"
        >
            {/* Toolbar */}
            <div className="live-demo-toolbar">
                <form className="live-demo-search" role="search" onSubmit={e => { e.preventDefault(); runSearch(query); }}>
                    <input
                        className="live-demo-search-input"
                        type="text"
                        placeholder="Search a side effect"
                        aria-label="Search side effects"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    {searchResults && (
                        <button type="button" className="live-demo-clear" aria-label="Clear search" onClick={clear}>✕</button>
                    )}
                    <button type="submit" className="live-demo-go" disabled={searching}>
                        {searching ? "Searching" : "Search"}
                    </button>
                </form>
                <div className="live-demo-examples" aria-label="Example searches">
                    <span className="live-demo-examples-label">Try</span>
                    {EXAMPLE_QUERIES.map(q => (
                        <button
                            key={q}
                            type="button"
                            className={`live-demo-chip${lastQuery === q && searchResults ? " is-active" : ""}`}
                            onClick={() => { setQuery(q); runSearch(q); }}
                        >
                            {q}
                        </button>
                    ))}
                </div>
                <div className="live-demo-toolbar-right">
                    {dims === 2 && (
                        <button
                            className={`live-demo-voronoi${showVoronoi ? " active" : ""}`}
                            type="button"
                            aria-pressed={showVoronoi}
                            onClick={() => setShowVoronoi(v => !v)}
                        >
                            Voronoi
                        </button>
                    )}
                    <div className={`live-demo-dims live-demo-dims--${dims === 2 ? "left" : "right"}`}>
                        <span className="dim-toggle-slider" />
                        <button onClick={() => setDims(2)} aria-pressed={dims === 2}>2D</button>
                        <button onClick={() => setDims(3)} aria-pressed={dims === 3}>3D</button>
                    </div>
                    {!showInfo && (
                        <button className="live-demo-voronoi" onClick={() => setShowInfo(true)} aria-label="What am I looking at?" title="What am I looking at?">?</button>
                    )}
                </div>
            </div>

            {/* What is being shown */}
            {showInfo && (
                <div className="live-demo-info">
                    <p className="live-demo-info-text">
                        Each point is a drug. Its list of side effects was turned into an embedding,
                        a vector of numbers that captures what the text means. Drugs with similar side effects end up
                        close together, even when the wording differs. Search compares your words with every sentence of every
                        drug's side effects and ranks each drug by its closest sentence.
                    </p>
                    <dl className="live-demo-info-specs">
                        <div><dt>Data</dt><dd>{points2d ? `${points2d.length.toLocaleString()} drugs` : "drugs"}</dd></div>
                        <div><dt>Embedded</dt><dd>side_effects</dd></div>
                        <div><dt>Model</dt><dd>MiniLM · 384 dims</dd></div>
                        <div title="FAISS finds the stored vectors nearest to your search. A flat index checks every one, so results are exact."><dt>Index</dt><dd>FAISS · exact</dd></div>
                        <div title="Each drug's side effects are split into sentences, and a drug ranks by the one that matches your search best."><dt>Ranking</dt><dd>closest sentence</dd></div>
                        <div title="How close in meaning two vectors are, from 0 (unrelated) to 1 (the same)."><dt>Score</dt><dd>cosine 0–1</dd></div>
                        <div><dt>Layout</dt><dd>UMAP</dd></div>
                    </dl>
                    <button className="live-demo-info-hide" onClick={() => setShowInfo(false)} aria-label="Hide explanation">Hide</button>
                </div>
            )}

            {/* Map */}
            <div className="live-demo-map">
                {failed ? (
                    <div className="live-demo-placeholder">
                        <p>The demo map couldn't load. The server may be offline.</p>
                    </div>
                ) : !loaded ? (
                    <div className="live-demo-placeholder">
                        <div className="live-demo-spinner" />
                        <p>Loading map</p>
                    </div>
                ) : (
                    <MapView points={points} dims={dims} searchResults={searchResults} showVoronoi={showVoronoi} onPointClick={openFullMap} />
                )}
            </div>

            {/* Status bar */}
            <div className="live-demo-footer">
                <span className="live-demo-status">{status}</span>
                <button className="btn btn-light btn-sm" onClick={() => openFullMap()}>
                    Open full map
                </button>
            </div>
        </XPWindow>
    );
}

// ── How it works (former About page) ─────────────────────────────────────────

const WINDOWS = [
    { key: "readme",  title: "readme.txt",       className: "about-readme" },
    { key: "how",     title: "how_it_works.exe", className: "about-how" },
    { key: "local",   title: "run_locally.txt",  className: "about-local" },
    { key: "stack",   title: "tech_stack.txt",   className: "about-stack" },
];

function AboutWindows({ navigate }) {
    const [closed, setClosed] = useState([]);
    const close = (key) => setClosed(c => [...c, key]);

    const content = {
        readme: (
            <div className="prose">
                <p>
                    embeddedcosine turns any structured dataset into a navigable semantic map.
                    Similar things cluster together. You search by meaning, not keywords.
                    Built by one person, for anyone curious about their data.
                </p>
                <p>
                    It started as a personal project to actually see what embedding models do to data.
                    I wanted to watch ideas group together in space, and thought others might find that interesting too.
                </p>
                <p>
                    It's completely free to use and{" "}
                    <a href="https://github.com/mahiraskari/embeddedcosine" target="_blank" rel="noopener noreferrer">open source on GitHub</a>.
                    Fork it, edit it, do whatever you want with it. If you build something cool with it or just want to say thanks,{" "}
                    <button className="text-link" onClick={() => navigate("/support")}>supporting it</button>{" "}
                    goes a long way.
                </p>
            </div>
        ),
        how: (
            <>
                <ol className="about-steps">
                    {STEPS.map(([n, title, desc, tag]) => (
                        <li key={n} className="about-step">
                            <span className="about-step-n">{n}</span>
                            <div className="about-step-title">{title}</div>
                            <div className="about-step-desc">{desc}</div>
                            {tag && <span className="about-step-tag">{tag}</span>}
                        </li>
                    ))}
                </ol>
                <p className="about-name-note">
                    Steps 03 + 04 = <span>embedded</span> + <span>cosine</span> = embeddedcosine
                </p>
            </>
        ),
        local: (
            <div className="prose">
                <p>
                    There is a local branch of this project made specifically to run it on your own machine
                    without any of the account setup, server limits, or extra configuration.
                    Follow the README commands in the link below to get started.
                </p>
                <p>
                    No sign in, no file size limit, no rate limits. Everything runs on your CPU and is typically
                    4–10x faster than the hosted version depending on your specs.
                </p>
                <p>
                    <a className="about-mono-link" href="https://github.com/mahiraskari/embeddedcosine/tree/local" target="_blank" rel="noopener noreferrer">
                        github.com/mahiraskari/embeddedcosine/tree/local
                    </a>
                </p>
            </div>
        ),
        stack: (
            <dl className="about-stack-list">
                {STACK.map(([label, value]) => (
                    <div key={label} className="about-stack-row">
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
        ),
    };

    return (
        <div className="about-grid">
            {WINDOWS.filter(w => !closed.includes(w.key)).map(w => (
                <XPWindow key={w.key} title={w.title} className={w.className} draggable onClose={() => close(w.key)}>
                    {content[w.key]}
                </XPWindow>
            ))}
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    // The login modal is driven by the URL (/?login=true), so nav links and protected-route redirects both open it
    const showLogin = searchParams.get("login") === "true";

    // Scroll to a section when arriving with a hash (/#how-it-works)
    useEffect(() => {
        if (!location.hash) return;
        const el = document.getElementById(location.hash.slice(1));
        if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    }, [location.hash, location.key]);

    const closeLogin = () => navigate("/", { replace: true });

    return (
        <div className="page landing">
            {showLogin && (
                <LoginModal
                    onClose={closeLogin}
                    onSuccess={() => navigate("/datasets")}
                />
            )}

            <Navbar />

            <main className="page-main">
                <header className="landing-intro xp-welcome">
                    <div className="xp-welcome-inner">
                    <p className="landing-byline">A personal project · free and open source</p>
                    <h1 className="landing-title">
                        Turn any spreadsheet into a map you can search by meaning
                    </h1>
                    <p className="landing-lede">
                        Upload a CSV or JSON file. Every row becomes a dot, similar rows sit together,
                        and you search by describing what you want. The demo below maps 2,807 drugs by their side effects.
                    </p>
                    <div className="landing-intro-actions">
                        <button
                            className="btn btn-light"
                            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        >
                            Try the demo
                        </button>
                        <button className="text-link landing-intro-link" onClick={() => navigate("/datasets")}>
                            Map your own data (free account)
                        </button>
                    </div>
                    </div>
                </header>

                <LiveDemo navigate={navigate} />

                <section id="how-it-works" className="landing-section">
                    <h2 className="landing-section-title">How it works</h2>
                    <p className="page-sub">What embeddedcosine does to your data, the stack behind it, and how to run it yourself.</p>
                    <AboutWindows navigate={navigate} />
                </section>
            </main>

            <Footer />
        </div>
    );
}
