import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ProjectsPage from "./pages/ProjectsPage";
import MapApp from "./pages/MapApp";
import AboutPage from "./pages/AboutPage";
import SupportPage from "./pages/SupportPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/datasets" element={<ProjectsPage />} />
                <Route path="/map" element={<MapApp />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/support" element={<SupportPage />} />
            </Routes>
        </BrowserRouter>
    );
}
