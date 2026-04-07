import { useState, useEffect } from "react";
import MapView from "./components/MapView";
import { fetchMapPoints } from "./api/client";
import "./App.css";

export default function App() {
    const [points, setPoints] = useState([]);
    const [dims, setDims] = useState(2);
    const [loading, setLoading] = useState(true);
    const [showVoronoi, setShowVoronoi] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetchMapPoints(dims)
            .then((data) => setPoints(data.points))
            .finally(() => setLoading(false));
    }, [dims]);

    return (
        <div className="app">
            <header className="header">
                <h1 className="logo">embeddedcosine</h1>
                <div className="dim-toggle">
                    <button
                        className={dims === 2 ? "active" : ""}
                        onClick={() => { setDims(2); setLoading(true); }}
                    >
                        2D
                    </button>
                    <button
                        className={dims === 3 ? "active" : ""}
                        onClick={() => { setDims(3); setLoading(true); }}
                    >
                        3D
                    </button>
                </div>
                {dims === 2 && (
                    <div className="dim-toggle">
                        <button
                            className={showVoronoi ? "active" : ""}
                            onClick={() => setShowVoronoi(v => !v)}
                        >
                            Voronoi
                        </button>
                    </div>
                )}
            </header>

            <main className="main">
                <div className="map-container">
                    {loading ? (
                        <div className="loading">Loading map...</div>
                    ) : (
                        <MapView points={points} dims={dims} showVoronoi={showVoronoi} />
                    )}
                </div>
            </main>
        </div>
    );
}
