import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import MapApp from "./pages/MapApp";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/map" element={<MapApp />} />
            </Routes>
        </BrowserRouter>
    );
}
