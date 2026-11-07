import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MapView from "../components/MapView";
import ResultsPanel from "../components/ResultsPanel";
import ClickPanel from "../components/ClickPanel";
import KeybindPanel from "../components/KeybindPanel";
import MapTaskbar from "../components/MapTaskbar";
import { fetchProjectPoints, fetchDemoPoints, searchGames, fetchProjectMeta, fetchDemoMeta } from "../api/client";
import "../App.css";

export default function MapApp() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isDemo      = searchParams.get("demo") === "true";
    const projectId   = searchParams.get("id");

    const [points, setPoints]               = useState([]);
    const [dims, setDims]                   = useState(2);
    const [loading, setLoading]             = useState(true);
    // A search can be handed over from the home demo via ?q=
    const initialQuery = searchParams.get("q") || "";
    // ...and a point to open straight away via ?select=
    const selectName   = searchParams.get("select");
    const didSelect    = useRef(false);
    const [query, setQuery]                 = useState(initialQuery);
    const [searchResults, setSearchResults] = useState(null);
    const [topK, setTopK]                   = useState(25);
    const [showVoronoi, setShowVoronoi]     = useState(false);
    const [selected, setSelected]           = useState([]);
    const [showKeys, setShowKeys]           = useState(false);
    const [embedCols, setEmbedCols]         = useState([]);
    const [projectName, setProjectName]     = useState("");
    const flyToRef                          = useRef(null);

    // The map fills the viewport, so hide the page scrollbar while it is open
    useEffect(() => {
        document.documentElement.classList.add("no-page-scroll");
        return () => document.documentElement.classList.remove("no-page-scroll");
    }, []);

    useEffect(() => {
        if (!isDemo && !projectId) { navigate("/datasets"); return; }
        // Fetch embed cols once on mount
        const metaReq = isDemo ? fetchDemoMeta() : fetchProjectMeta(projectId);
        metaReq.then(m => { setEmbedCols(m.embed_cols || []); setProjectName(m.name || ""); }).catch(() => {});
    }, [isDemo, projectId]);

    useEffect(() => {
        if (!isDemo && !projectId) return;
        setLoading(true);
        const req = isDemo ? fetchDemoPoints(dims) : fetchProjectPoints(projectId, dims);
        req.then(data => {
            setPoints(data.points);
            if (selectName && !didSelect.current) {
                didSelect.current = true;
                const pt = data.points.find(p => p.Name === selectName);
                if (pt) {
                    setSelected([pt]);
                    // give the map a moment to mount before flying to the point
                    setTimeout(() => flyToRef.current?.(pt), 400);
                }
            }
        }).finally(() => setLoading(false));
    }, [dims, isDemo, projectId]);

    const handlePointClick = (point) => {
        setSelected(prev => {
            if (prev.length === 0) return [point];
            if (prev.length === 1) {
                if (prev[0].Name === point.Name) return [];   // clicking same point deselects
                return [prev[0], point];                       // second distinct point → compare mode
            }
            return [point];  // third click resets to single selection
        });
    };

    const runSearch = async (q, k) => {
        if (!q.trim()) { setSearchResults(null); return; }
        const data = await searchGames(q.trim(), k, isDemo, isDemo ? null : projectId);
        setSearchResults(data.results);
    };

    // Run the handed-over search once on arrival
    useEffect(() => {
        if (initialQuery.trim()) runSearch(initialQuery, 25);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        runSearch(query, topK);
    };

    const handleTopKChange = (k) => {
        setTopK(k);
        if (query.trim()) runSearch(query, k);
    };

    const clearSearch = () => { setQuery(""); setSearchResults(null); };

    const flyToPoint = (name) => {
        if (!flyToRef.current) return;
        // flyToRef.current is assigned by whichever Scene component is mounted (2D or 3D)
        const pt = points.find(p => p.Name === name);
        if (pt) flyToRef.current(pt);
    };

    const backPath  = isDemo ? "/" : "/datasets";
    const backLabel = isDemo ? "Home" : "Datasets";
    const title     = isDemo ? "drug_side_effects.exe" : (projectName || "dataset");
    const status    = loading ? "Loading…"
        : searchResults ? `${searchResults.length} closest matches for “${query.trim()}”`
        : `${points.length.toLocaleString()} points · click a point for details, click a second to compare`;

    return (
        <div className="app">
            {/* XP title bar — the whole page is one maximized window */}
            <div className="map-titlebar">
                <span className="map-titlebar-text">{title}</span>
                <div className="xp-window-btns">
                    <span className="xp-title-btn" aria-hidden="true">—</span>
                    <span className="xp-title-btn" role="button" tabIndex={0} title={`Back to ${backLabel.toLowerCase()}`}
                        aria-label={`Restore: back to ${backLabel.toLowerCase()}`} onClick={() => navigate(backPath)}>□</span>
                    <span className="xp-title-btn xp-title-btn--close" role="button" tabIndex={0} title="Close"
                        aria-label={`Close: back to ${backLabel.toLowerCase()}`} onClick={() => navigate(backPath)}>✕</span>
                </div>
            </div>

            {/* Toolbar */}
            <header className="header">
                <button className="map-back" onClick={() => navigate(backPath)}>← {backLabel}</button>
                <form className="search-bar" role="search" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder={isDemo ? "Search a side effect" : "Search by meaning"}
                        aria-label="Search"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    {searchResults && (
                        <button type="button" className="search-clear" aria-label="Clear search" onClick={clearSearch}>✕</button>
                    )}
                    <button type="submit" className="search-go">Search</button>
                </form>
                <div className="header-right">
                    {dims === 2 && (
                        <button
                            className={`load-dataset-btn${showVoronoi ? " voronoi-active" : ""}`}
                            aria-pressed={showVoronoi}
                            onClick={() => setShowVoronoi(v => !v)}
                        >
                            Voronoi
                        </button>
                    )}
                    <div className={`dim-toggle dim-toggle--${dims === 2 ? "left" : "right"}`}>
                        <span className="dim-toggle-slider" />
                        <button onClick={() => setDims(2)} aria-pressed={dims === 2}>2D</button>
                        <button onClick={() => setDims(3)} aria-pressed={dims === 3}>3D</button>
                    </div>
                    <button
                        className={`help-btn${showKeys ? " is-active" : ""}`}
                        onClick={() => setShowKeys(v => !v)}
                        aria-label="Controls"
                        title="Controls"
                        aria-pressed={showKeys}
                    >?</button>
                </div>
            </header>

            <main className="main">
                <div className="map-container">
                    {loading ? (
                        <div className="loading"><span className="loading-spinner" />Loading map</div>
                    ) : (
                        <MapView
                            points={points}
                            dims={dims}
                            searchResults={searchResults}
                            showVoronoi={showVoronoi}
                            onPointClick={handlePointClick}
                            flyToRef={flyToRef}
                        />
                    )}
                    {searchResults && (
                        <ResultsPanel
                            results={searchResults}
                            onClose={clearSearch}
                            onFlyTo={flyToPoint}
                            topK={topK}
                            onTopKChange={handleTopKChange}
                        />
                    )}
                    <MapTaskbar />
                    {showKeys && (
                        <KeybindPanel onClose={() => setShowKeys(false)} />
                    )}
                    {selected.length > 0 && (
                        <ClickPanel
                            selected={selected}
                            onClose={() => setSelected([])}
                            onRemove={(i) => setSelected(prev => prev.filter((_, j) => j !== i))}
                            demo={isDemo}
                            projectId={projectId}
                            embedCols={embedCols}
                        />
                    )}
                </div>
            </main>

            {/* Status bar */}
            <footer className="map-statusbar">{status}</footer>
        </div>
    );
}
