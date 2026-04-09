import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MapView from "../components/MapView";
import ResultsPanel from "../components/ResultsPanel";
import ClickPanel from "../components/ClickPanel";
import KeybindPanel from "../components/KeybindPanel";
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
    const [query, setQuery]                 = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [topK, setTopK]                   = useState(10);
    const [showVoronoi, setShowVoronoi]     = useState(false);
    const [selected, setSelected]           = useState([]);
    const [showKeys, setShowKeys]           = useState(false);
    const [embedCols, setEmbedCols]         = useState([]);
    const flyToRef                          = useRef(null);

    useEffect(() => {
        if (!isDemo && !projectId) { navigate("/datasets"); return; }
        // Fetch embed cols once on mount
        const metaReq = isDemo ? fetchDemoMeta() : fetchProjectMeta(projectId);
        metaReq.then(m => setEmbedCols(m.embed_cols || [])).catch(() => {});
    }, [isDemo, projectId]);

    useEffect(() => {
        if (!isDemo && !projectId) return;
        setLoading(true);
        const req = isDemo ? fetchDemoPoints(dims) : fetchProjectPoints(projectId, dims);
        req.then(data => setPoints(data.points)).finally(() => setLoading(false));
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

    return (
        <div className="app">
            <header className="header">
                <span className="logo" onClick={() => navigate(isDemo ? "/" : "/datasets")} style={{ cursor: "pointer" }}>
                    embeddedcosine
                </span>
                <button className="load-dataset-btn" onClick={() => setShowKeys(v => !v)}>
                    Controls
                </button>
                <form className="search-bar" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    {searchResults && (
                        <button type="button" className="search-clear" onClick={clearSearch}>✕</button>
                    )}
                </form>
                <div className={`dim-toggle dim-toggle--${dims === 2 ? "left" : "right"}`}>
                    <span className="dim-toggle-slider" />
                    <button onClick={() => setDims(2)}>2D</button>
                    <button onClick={() => setDims(3)}>3D</button>
                </div>
                {dims === 2 && (
                    <button
                        className={`load-dataset-btn${showVoronoi ? " voronoi-active" : ""}`}
                        onClick={() => setShowVoronoi(v => !v)}
                    >
                        Voronoi
                    </button>
                )}
                <button className="load-dataset-btn" onClick={() => navigate(isDemo ? "/" : "/datasets")}>
                    {isDemo ? "← Home" : "← Datasets"}
                </button>
            </header>

            <main className="main">
                <div className="map-container">
                    {loading ? (
                        <div className="loading">LOADING</div>
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
                    {showKeys && (
                        <KeybindPanel onClose={() => setShowKeys(false)} />
                    )}
                    {selected.length > 0 && (
                        <ClickPanel
                            selected={selected}
                            onClose={() => setSelected([])}
                            demo={isDemo}
                            projectId={projectId}
                            embedCols={embedCols}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
