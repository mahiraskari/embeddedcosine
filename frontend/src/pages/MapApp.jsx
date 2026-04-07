import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MapView from "../components/MapView";
import SetupView from "../components/SetupView";
import ResultsPanel from "../components/ResultsPanel";
import { fetchMapPoints, fetchDemoPoints, searchGames, fetchDatasetStatus } from "../api/client";
import "../App.css";

export default function MapApp() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isDemo = searchParams.get("demo") === "true";
    const [ready, setReady]                 = useState(null);
    const [showSetup, setShowSetup]         = useState(false);
    const [points, setPoints]               = useState([]);
    const [dims, setDims]                   = useState(2);
    const [loading, setLoading]             = useState(false);
    const [query, setQuery]                 = useState("");
    const [searchResults, setSearchResults] = useState(null);
    const [showVoronoi, setShowVoronoi]     = useState(false);

    const loadPoints = (d) => {
        setLoading(true);
        const fetch = isDemo ? fetchDemoPoints(d) : fetchMapPoints(d);
        fetch.then(data => setPoints(data.points)).finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isDemo) {
            setReady(true);
            return;
        }
        fetchDatasetStatus().then(s => setReady(s.has_map));
    }, []);

    useEffect(() => {
        if (!ready) return;
        loadPoints(dims);
    }, [dims, ready]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) { setSearchResults(null); return; }
        const data = await searchGames(query.trim(), 10, isDemo);
        setSearchResults(data.results);
    };

    const clearSearch = () => { setQuery(""); setSearchResults(null); };

    if (ready === null) {
        return <div className="loading" style={{ height: "100vh" }}>LOADING</div>;
    }

    if (!ready || showSetup) {
        return (
            <SetupView
                onDone={() => {
                    setReady(true);
                    setShowSetup(false);
                    setSearchResults(null);
                    setQuery("");
                    loadPoints(dims);
                }}
                onBack={ready ? () => setShowSetup(false) : () => navigate("/")}
            />
        );
    }

    return (
        <div className="app">
            <header className="header">
                <span className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                    embeddedcosine
                </span>
                <form className="search-bar" onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="Search..."
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
                <button className="load-dataset-btn" onClick={() => navigate("/")}>
                    ← Home
                </button>
                {!isDemo && (
                    <button className="load-dataset-btn" onClick={() => setShowSetup(true)}>
                        + Load dataset
                    </button>
                )}
            </header>

            <main className="main">
                <div className="map-container">
                    {loading ? (
                        <div className="loading">LOADING</div>
                    ) : (
                        <MapView points={points} dims={dims} searchResults={searchResults} showVoronoi={showVoronoi} />
                    )}
                    {searchResults && (
                        <ResultsPanel results={searchResults} onClose={clearSearch} />
                    )}
                </div>
            </main>
        </div>
    );
}
