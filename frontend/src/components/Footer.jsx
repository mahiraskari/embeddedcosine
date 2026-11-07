import { useNavigate } from "react-router-dom";

const LINKS = [
    { label: "GitHub",           href: "https://github.com/mahiraskari/embeddedcosine" },
    { label: "Run locally",      href: "https://github.com/mahiraskari/embeddedcosine/tree/local" },
    { label: "Find datasets",    href: "https://kaggle.com/datasets" },
];

export default function Footer() {
    const navigate = useNavigate();
    return (
        <footer className="site-footer">
            <span className="site-footer-logo" onClick={() => navigate("/")}>embeddedcosine</span>
            <nav className="site-footer-links" aria-label="Footer">
                <button className="site-footer-link" onClick={() => navigate("/#how-it-works")}>How it works</button>
                <button className="site-footer-link" onClick={() => navigate("/support")}>Support</button>
                {LINKS.map(l => (
                    <a key={l.label} className="site-footer-link" href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.label}
                    </a>
                ))}
            </nav>
        </footer>
    );
}
