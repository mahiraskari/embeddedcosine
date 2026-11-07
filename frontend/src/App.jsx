import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ProjectsPage from "./pages/ProjectsPage";
import MapApp from "./pages/MapApp";
import SupportPage from "./pages/SupportPage";
import ClosedWindowsBar from "./components/ClosedWindowsBar";

// Local branch: no accounts, so every page is open.
export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/map" element={<MapApp />} />
                <Route path="/datasets" element={<ProjectsPage />} />
                <Route path="/about" element={<Navigate to="/#how-it-works" replace />} />
                <Route path="/support" element={<SupportPage />} />
            </Routes>
            <ClosedWindowsBar />
        </BrowserRouter>
    );
}
