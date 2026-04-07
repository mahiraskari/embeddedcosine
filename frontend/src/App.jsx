import { useState, useEffect } from "react";
import MapView from "./components/MapView";
import { fetchMapPoints } from "./api/client";
import "./App.css";

export default function App() {
    const [points, setPoints] = useState([]);
    const [dims, setDims] = useState(2);
    const [loading, setLoading] = useState(true);

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
                        onClick={() => setDims(2)}
                    >
                        2D
                    </button>
                    <button
                        className={dims === 3 ? "active" : ""}
                        onClick={() => setDims(3)}
                    >
                        3D
                    </button>
                </div>
            </header>

            <main className="main">
                <div className="map-container">
                    {loading ? (
                        <div className="loading">Loading map...</div>
                    ) : (
                        <MapView points={points} dims={dims} />
                    )}
                </div>
            </main>
        </div>
    );
}
