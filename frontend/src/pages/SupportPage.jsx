import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import XPWindow from "../components/XPWindow";

const TIP_URL = "https://github.com/sponsors/mahiraskari";
const KOFI_URL = "https://ko-fi.com/mahiraskari";

const TOWARD = [
    ["Server costs",  "Keeping the backend online and fast."],
    ["Model hosting", "Running the sentence-transformer and FAISS index."],
    ["New features",  "Better search, more dataset formats, improved visualisations."],
];

export default function SupportPage() {
    return (
        <div className="page">
            <Navbar />

            <main className="page-main">
                <header style={{ marginBottom: 24 }}>
                    <h1 className="page-title">Support embeddedcosine</h1>
                    <p className="page-sub">
                        embeddedcosine is free to use. If you find it useful or just think it's cool,
                        a tip helps keep the servers running and the project improving.
                    </p>
                </header>

                <div className="support-grid">
                    <XPWindow title="tip.exe" draggable>
                        <div className="prose">
                            <p>
                                Everything here runs on real servers, real compute, and real time.
                                If you've found value in it, a tip goes a long way.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "20px 0 12px" }}>
                            <a href={TIP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-blue">
                                GitHub Sponsors
                            </a>
                            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="btn btn-kofi">
                                Ko-fi
                            </a>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>No account needed. Any amount helps.</p>
                    </XPWindow>

                    <XPWindow title="breakdown_of_costs.txt" draggable>
                        <dl className="about-stack-list">
                            {TOWARD.map(([title, desc]) => (
                                <div key={title} className="about-stack-row support-row">
                                    <dt>{title}</dt>
                                    <dd>{desc}</dd>
                                </div>
                            ))}
                        </dl>
                    </XPWindow>
                </div>
            </main>

            <Footer />
        </div>
    );
}
