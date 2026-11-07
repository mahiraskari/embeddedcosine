import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import XPWindow from "../components/XPWindow";

const REPO_URL   = "https://github.com/mahiraskari/embeddedcosine";
const ISSUES_URL = "https://github.com/mahiraskari/embeddedcosine/issues/new";
const TIP_URL    = "https://github.com/sponsors/mahiraskari";
const KOFI_URL   = "https://ko-fi.com/mahiraskari";

const TOWARD = [
    ["Server costs",  "Keeping the backend online and fast."],
    ["Model hosting", "Running the sentence-transformer and FAISS index."],
    ["New features",  "Better search, more dataset formats, improved visualisations."],
];

// Ways to help that cost nothing
const FREE_HELP = [
    { title: "Star it on GitHub",          desc: "It helps other people find the project.",                       href: REPO_URL,   cta: "Open GitHub" },
    { title: "Report a bug or idea",       desc: "Something broken, confusing, or missing? Open an issue.",       href: ISSUES_URL, cta: "Open an issue" },
    { title: "Contribute code",            desc: "It is open source. Fork it, improve it, and send a pull request.", href: REPO_URL, cta: "View the code" },
];

export default function SupportPage() {
    return (
        <div className="page">
            <Navbar />

            <main className="page-main">
                {/* same blue band as the home page */}
                <header className="landing-intro xp-welcome">
                    <div className="xp-welcome-inner">
                        <p className="landing-byline">Free and open source</p>
                        <h1 className="landing-title">Help keep embeddedcosine running</h1>
                        <p className="landing-lede">
                            embeddedcosine is free to use. If you find it useful or just think it is cool,
                            a tip helps pay for the servers and keeps the project improving. There are free
                            ways to help too.
                        </p>
                    </div>
                </header>

                <div className="support-grid">
                    <XPWindow title="tip.exe" className="support-tip">
                        <div className="prose support-prose">
                            <p>
                                Everything here runs on real servers, real compute, and real time.
                                If you have found value in it, a tip goes a long way.
                            </p>
                        </div>
                        <div className="support-tip-actions">
                            <a href={TIP_URL} target="_blank" rel="noopener noreferrer" className="btn btn-blue support-btn">
                                GitHub Sponsors
                            </a>
                            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="btn btn-kofi support-btn">
                                Ko-fi
                            </a>
                        </div>
                        <p className="support-note">No account needed. Any amount helps.</p>
                    </XPWindow>

                    <XPWindow title="breakdown_of_costs.txt" className="support-costs">
                        <p className="support-intro">Where tips go:</p>
                        <dl className="about-stack-list">
                            {TOWARD.map(([title, desc]) => (
                                <div key={title} className="about-stack-row support-row">
                                    <dt>{title}</dt>
                                    <dd>{desc}</dd>
                                </div>
                            ))}
                        </dl>
                    </XPWindow>

                    <XPWindow title="other_ways_to_help.txt" className="support-free">
                        <p className="support-intro">No money needed:</p>
                        <ul className="support-free-list">
                            {FREE_HELP.map(item => (
                                <li key={item.title} className="support-free-item">
                                    <div className="support-free-title">{item.title}</div>
                                    <div className="support-free-desc">{item.desc}</div>
                                    {item.href && (
                                        <a className="text-link support-free-link" href={item.href} target="_blank" rel="noopener noreferrer">
                                            {item.cta} ↗
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </XPWindow>
                </div>
            </main>

            <Footer />
        </div>
    );
}
