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
                    {!isMobile && <button className="nav-link nav-link--icon" onClick={() => window.location.reload()} title="Refresh" aria-label="Refresh">↻</button>}
                    {!isMobile && LINKS.map(({ label, path }) => (
                        <button
                            key={label}
                            className={`nav-link${location.pathname === path ? " is-active" : ""}`}
                            aria-current={location.pathname === path ? "page" : undefined}
                            onClick={() => navigate(path)}
                        >
                            {label}
                        </button>
                    ))}
                    {session !== undefined && (
                        <button className="nav-cta" style={s.cta} onClick={() => navigate("/datasets")}>
                            {session ? "My datasets" : "Try it out"}
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
                            style={{ ...s.dropdownItem, color: location.pathname === path ? "var(--text)" : "var(--text-2)" }}
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

const s = {
    navWrapper: {
        position: "sticky",
        top: 0,
        zIndex: 100,
        fontFamily: "var(--font)",
    },
    nav: {
        display: "flex",
        alignItems: "center",
        minHeight: 56,
        padding: "10px 32px",
        borderBottom: "1px solid var(--line)",
        background: "rgba(11,13,20,0.92)",
        backdropFilter: "blur(12px)",
    },
    logo: {
        fontSize: 16,
        fontWeight: 600,
        color: "var(--text)",
        letterSpacing: "-0.01em",
        cursor: "pointer",
        marginRight: "auto",
    },
    right: {
        display: "flex",
        alignItems: "center",
        gap: 4,
    },
    cta: {
        marginLeft: 8,
        height: 32,
        background: "var(--text)",
        border: "none",
        color: "var(--on-light)",
        padding: "0 14px",
        borderRadius: 6,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
    },
    hamburger: {
        background: "none",
        border: "1px solid var(--line-strong)",
        color: "var(--text-2)",
        padding: "6px 10px",
        borderRadius: 6,
        fontSize: 15,
        cursor: "pointer",
        fontFamily: "inherit",
        lineHeight: 1,
    },
    dropdown: {
        background: "rgba(11,13,20,0.98)",
        borderBottom: "1px solid var(--line-strong)",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backdropFilter: "blur(12px)",
    },
    dropdownItem: {
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--line)",
        color: "var(--text-2)",
        padding: "16px 28px",
        fontSize: 14,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
    },
};
