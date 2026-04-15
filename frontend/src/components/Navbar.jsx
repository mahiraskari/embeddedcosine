import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import AccountMenu from "./AccountMenu";

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    useEffect(() => {
        const h = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, []);
    return isMobile;
};

const LINKS = [
    { label: "Preview", path: "/" },
    { label: "About",   path: "/about" },
    { label: "Support", path: "/support" },
];

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [session, setSession] = useState(undefined);
    const [menuOpen, setMenuOpen] = useState(false);
    const isMobile = useIsMobile();

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
        return () => subscription.unsubscribe();
    }, []);

    // Close menu when navigating
    const go = (path) => { navigate(path); setMenuOpen(false); };

    return (
        <div style={s.navWrapper}>
            <nav style={s.nav}>
                <span style={s.logo} onClick={() => navigate("/")}>embeddedcosine</span>

                <div style={s.right}>
                    {!isMobile && <button style={s.refresh} onClick={() => window.location.reload()} title="Refresh" onMouseEnter={e => e.currentTarget.style.color = "#a5b4fc"} onMouseLeave={e => e.currentTarget.style.color = "#6366f1"}>↻</button>}
                    {!isMobile && LINKS.map(({ label, path }) => (
                        <button key={label} style={activeStyle(s.link, location.pathname === path)} onClick={() => navigate(path)}>
                            {label}
                        </button>
                    ))}
                    {session !== undefined && (
                        <button style={s.cta} onClick={() => navigate("/datasets")}>
                            {session ? "My datasets" : "Try it out →"}
                        </button>
                    )}
                    {session && <AccountMenu session={session} />}
                    {isMobile && (
                        <button style={s.hamburger} onClick={() => setMenuOpen(o => !o)}>
                            {menuOpen ? "✕" : "☰"}
                        </button>
                    )}
                </div>
            </nav>

            {isMobile && menuOpen && (
                <div style={s.dropdown}>
                    {LINKS.map(({ label, path }) => (
                        <button
                            key={label}
                            style={{ ...s.dropdownItem, color: location.pathname === path ? "#fff" : "#555" }}
                            onClick={() => go(path)}
                        >
                            {label}
                        </button>
                    ))}
                    <button style={s.dropdownItem} onClick={() => { window.location.reload(); setMenuOpen(false); }}>
                        ↻ Refresh
                    </button>
                </div>
            )}
        </div>
    );
}

const activeStyle = (base, isActive) => isActive
    ? { ...base, color: "#fff", borderColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#fff", borderBottomStyle: "solid" }
    : base;

const s = {
    navWrapper: {
        position: "sticky",
        top: 0,
        zIndex: 100,
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    nav: {
        display: "flex",
        alignItems: "center",
        padding: "12px 28px",
        borderBottom: "1px solid #111",
        background: "rgba(5,5,10,0.95)",
        backdropFilter: "blur(12px)",
    },
    logo: {
        fontSize: 15,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.4px",
        cursor: "pointer",
        marginRight: "auto",
    },
    right: {
        display: "flex",
        alignItems: "center",
        gap: 8,
    },
    link: {
        background: "none",
        border: "1px solid #1e1e2e",
        color: "#555",
        padding: "7px 14px",
        borderRadius: 3,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s",
    },
    refresh: {
        background: "none",
        border: "none",
        color: "#6366f1",
        padding: "5px 8px",
        borderRadius: 3,
        fontSize: 20,
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1,
        transition: "color 0.15s",
    },
    cta: {
        background: "#fff",
        border: "none",
        color: "#0a0a14",
        padding: "7px 16px",
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        letterSpacing: "-0.2px",
    },
    hamburger: {
        background: "none",
        border: "1px solid #1e1e2e",
        color: "#555",
        padding: "5px 10px",
        borderRadius: 3,
        fontSize: 15,
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1,
    },
    dropdown: {
        background: "rgba(5,5,10,0.98)",
        borderBottom: "1px solid #1e1e2e",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backdropFilter: "blur(12px)",
    },
    dropdownItem: {
        background: "none",
        border: "none",
        borderBottom: "1px solid #111",
        color: "#555",
        padding: "16px 28px",
        fontSize: 14,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
    },
};
