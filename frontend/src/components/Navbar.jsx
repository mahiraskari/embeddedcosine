import { useNavigate, useLocation } from "react-router-dom";

const LINKS = [
    { label: "About",   path: "/about" },
    { label: "Support", path: "/support" },
];

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav style={s.nav}>
            <span style={s.logo} onClick={() => navigate("/")}>embeddedcosine</span>

            <div style={s.right}>
                <button style={activeStyle(s.preview, location.pathname === "/")} onClick={() => navigate("/")}>Preview</button>
                {LINKS.map(({ label, path }) => (
                    <button key={label} style={activeStyle(s.link, location.pathname === path)} onClick={() => navigate(path)}>
                        {label}
                    </button>
                ))}
                <button style={s.cta} onClick={() => navigate("/datasets")}>
                    My datasets
                </button>
            </div>
        </nav>
    );
}

const activeStyle = (base, isActive) => isActive
    ? { ...base, color: "#fff", borderColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#fff", borderBottomStyle: "solid" }
    : base;

const s = {
    nav: {
        display: "flex",
        alignItems: "center",
        padding: "12px 28px",
        borderBottom: "1px solid #111",
        background: "rgba(5,5,10,0.95)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
    preview: {
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
};
