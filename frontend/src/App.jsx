import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabase";
import LandingPage from "./pages/LandingPage";
import ProjectsPage from "./pages/ProjectsPage";
import MapApp from "./pages/MapApp";

// Wraps routes that require a logged-in user.
// Redirects to /login if there's no active session.
function ProtectedRoute({ session, children }) {
    if (session === undefined) return null; // still loading
    if (!session) return <Navigate to="/?login=true" replace />;
    return children;
}

export default function App() {
    const [session, setSession] = useState(undefined);

    useEffect(() => {
        // Grab the current session on mount, then keep it in sync
        supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/map" element={<MapApp />} />
                <Route
                    path="/projects"
                    element={
                        <ProtectedRoute session={session}>
                            <ProjectsPage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}
