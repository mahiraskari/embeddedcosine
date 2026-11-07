import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import AccountMenu from "./AccountMenu";

/*
 * Header in three parts, with a hairline underneath aligned to the page content:
 *   left   — the page links (on narrow screens: MENU, which opens a Start-menu style XP window)
 *   centre — the logo and wordmark
 *   right  — sign in, plus the one action that matters (map your data / my datasets)
 */

const PAGES = [
    { label: "Home",          path: "/" },
    { label: "How it works",  path: "/#how-it-works" },
    { label: "Support",       path: "/support" },
];

const EXTERNAL = [
    { label: "GitHub",        href: "https://github.com/mahiraskari/embeddedcosine" },
    { label: "Run locally",   href: "https://github.com/mahiraskari/embeddedcosine/tree/local" },
];

const MenuIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h8" />
    </svg>
);

const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <path d="M4 4l10 10M14 4L4 14" />
    </svg>
);

// map pin over a folded map: "map your data"
const MapIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
        <path d="M1.5 3.5l4-1.5 5 2 4-1.5v10l-4 1.5-5-2-4 1.5z" />
        <path d="M5.5 2v10M10.5 4v10" />
    </svg>
);

// the project logo (same file as the favicon): two vectors from one origin and the angle
// between them, which is exactly what cosine similarity measures
const CosineMark = ({ size = 28 }) => (
    <img src="/logo.svg" width={size} height={size} alt="" aria-hidden="true" style={{ display: "block", borderRadius: 6 }} />
);

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [session, setSession] = useState(undefined);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
        return () => subscription.unsubscribe();
    }, []);

    // close the menu on outside click or Esc
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        const onKey  = (e) => { if (e.key === "Escape") setMenuOpen(false); };
        document.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [menuOpen]);

    const go = (path) => { navigate(path); setMenuOpen(false); };
    const isCurrent = (path) => path === "/" ? location.pathname === "/" && !location.hash : location.pathname + location.hash === path || location.pathname === path;

    return (
        <header className="site-nav">
            <div className="site-nav-inner">
                {/* left: page links, or MENU on narrow screens */}
                <div className="site-nav-left" ref={menuRef}>
                    <nav className="site-nav-links" aria-label="Main">
                        {PAGES.filter(p => p.path !== "/").map(p => (
                            <button
                                key={p.label}
                                className={`site-nav-action site-nav-link${isCurrent(p.path) ? " is-current" : ""}`}
                                aria-current={isCurrent(p.path) ? "page" : undefined}
                                onClick={() => go(p.path)}
                            >
                                <span className="site-nav-label">{p.label}</span>
                            </button>
                        ))}
                    </nav>
                    <button
                        className="site-nav-action site-nav-menu-btn"
                        onClick={() => setMenuOpen(o => !o)}
                        aria-expanded={menuOpen}
                        aria-haspopup="true"
                    >
                        {menuOpen ? <CloseIcon /> : <MenuIcon />}
                        <span className="site-nav-label">Menu</span>
                    </button>

                    {menuOpen && (
                        <div className="start-menu" role="menu">
                            <div className="start-menu-title">
                                <CosineMark />
                                <span>embeddedcosine</span>
                            </div>
                            <div className="start-menu-body">
                                <div className="start-menu-group">
                                    {PAGES.map(p => (
                                        <button
                                            key={p.label}
                                            role="menuitem"
                                            className={`start-menu-item${isCurrent(p.path) ? " is-current" : ""}`}
                                            onClick={() => go(p.path)}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="start-menu-group">
                                    {EXTERNAL.map(l => (
                                        <a key={l.label} role="menuitem" className="start-menu-item" href={l.href} target="_blank" rel="noopener noreferrer">
                                            {l.label}
                                            <span className="start-menu-ext" aria-hidden="true">↗</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                            <div className="start-menu-foot">
                                {session
                                    ? <button className="start-menu-item" role="menuitem" onClick={() => go("/datasets")}>My datasets</button>
                                    : <button className="start-menu-item" role="menuitem" onClick={() => go("/?login=true")}>Sign in</button>}
                            </div>
                        </div>
                    )}
                </div>

                {/* centre: wordmark */}
                <button className="site-nav-brand" onClick={() => go("/")} aria-label="embeddedcosine home">
                    <CosineMark />
                    <span>embeddedcosine</span>
                </button>

                {/* right: the main action */}
                <div className="site-nav-right">
                    {session === null && (
                        <button className="site-nav-action site-nav-signin" onClick={() => go("/?login=true")}>
                            <span className="site-nav-label">Sign in</span>
                        </button>
                    )}
                    {session !== undefined && (
                        <button className="site-nav-action site-nav-cta" onClick={() => go("/datasets")}>
                            <MapIcon />
                            <span className="site-nav-label">{session ? "My datasets" : "Map your data"}</span>
                        </button>
                    )}
                    {session && <AccountMenu session={session} />}
                </div>
            </div>
        </header>
    );
}
