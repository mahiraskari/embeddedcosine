import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabase";
import LandingPage from "./pages/LandingPage";
import ProjectsPage from "./pages/ProjectsPage";
import MapApp from "./pages/MapApp";
import SupportPage from "./pages/SupportPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ClosedWindowsBar from "./components/ClosedWindowsBar";

// Wraps routes that require a logged-in user.
// Redirects to /login if there's no active session.
function ProtectedRoute({ session, children }) {
    if (session === undefined) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;
    if (!session) return <Navigate to="/?login=true" replace />;
    return children;
}

// If a sign-in (e.g. GitHub) failed, Supabase sends the reason back in the URL.
// Pick it up once, clean the URL, and reopen the sign-in window showing the message.
// The message is passed on in sessionStorage, not the URL, so a crafted link cannot show fake text.
function readAuthError() {
    const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
    let msg = params.get("error_description") || (params.get("error") && params.get("error").replace(/_/g, " "));
    try { msg = msg && decodeURIComponent(msg.replace(/\+/g, " ")); } catch { /* already decoded */ }
    if (!msg) return null;
    try { sessionStorage.setItem("auth_error", "Sign-in failed: " + msg.slice(0, 200)); } catch { /* storage blocked */ }
    window.history.replaceState(null, "", "/?login=true");
    return msg;
}
readAuthError();

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
                <Route path="/about" element={<Navigate to="/#how-it-works" replace />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route
                    path="/datasets"
                    element={
                        <ProtectedRoute session={session}>
                            <ProjectsPage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <ClosedWindowsBar />
        </BrowserRouter>
    );
}
