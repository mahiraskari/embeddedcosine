import { useState, useRef } from "react";
import { uploadDataset, configureDataset, getPipelineStreamURL } from "../api/client";
import { friendlyError } from "../api/errors";
import Navbar from "./Navbar";
import XPWindow from "./XPWindow";

const STEPS = ["Upload", "Configure", "Build"];


export default function SetupView({ onDone, onBack }) {
    const [step, setStep]           = useState(0);
    const [uploading, setUploading]       = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [building, setBuilding]   = useState(false);
    const [progress, setProgress]   = useState(0);
    const [stageLabel, setStageLabel] = useState("");
    const [error, setError]         = useState(null);
    const progressRef               = useRef(null);
    const esRef                     = useRef(null);
    const [uploadInfo, setUploadInfo] = useState(null);
    const [nameCol, setNameCol]     = useState("");
    const [embedCols, setEmbedCols] = useState([]);
    const [projectName, setProjectName] = useState("");
    const fileRef                   = useRef(null);

    const toggleEmbedCol = (col) => {
        setEmbedCols(prev =>
            prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
        );
    };

    // Build preview of combined embed text for a row
    const previewEmbedText = (row) => {
        const parts = embedCols
            .map(c => String(row[c] ?? "").trim())
            .filter(Boolean);
        return parts.join(" | ");
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError(null);
        setUploading(true);
        setUploadProgress(0);
        try {
            const data = await uploadDataset(file, setUploadProgress);
            setUploadInfo(data);
            // Try to find a "name" or "title" column for the display label — fall back to first column
            const cols = data.columns.map(c => String(c).toLowerCase());
            const nameGuess = data.columns[cols.findIndex(c =>
                c.includes("name") || c.includes("title"))] || data.columns[0];
            setNameCol(nameGuess);
            setEmbedCols([]);
            // Turn the filename into a readable project name (e.g. "my_dataset.csv" → "My Dataset")
            const defaultName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            setProjectName(defaultName);
            setStep(1);
        } catch (err) {
            setError(friendlyError(err, "Upload failed. Please try again."));
        }
        setUploading(false);
    };

    const handleConfigure = async () => {
        setError(null);
        if (embedCols.length === 0) {
            setError("Select at least one column to embed.");
            return;
        }
        try {
            await configureDataset(nameCol, embedCols, projectName.trim() || "Untitled");
            setStep(2);
        } catch (err) {
            setError(friendlyError(err, "Could not save those settings. Please try again."));
        }
    };

    const handleBuild = async () => {
        setError(null);
        setBuilding(true);
        setProgress(0);
        setStageLabel("Starting…");

        if (progressRef.current) clearInterval(progressRef.current);
        if (esRef.current) esRef.current.close();

        let streamUrl;
        try {
            streamUrl = await getPipelineStreamURL();
        } catch (err) {
            setError(friendlyError(err));
            setBuilding(false);
            return;
        }
        const es = new EventSource(streamUrl);
        esRef.current = es;

        // UMAP emits no sub-events, so the bar would freeze at 80% or 90% for several seconds.
        // This drifts it slowly toward the ceiling so there's visible feedback without lying about actual progress.
        const startDrift = (from, ceiling) => {
            if (progressRef.current) clearInterval(progressRef.current);
            let cur = from;
            progressRef.current = setInterval(() => {
                cur = Math.min(ceiling, cur + 0.06);
                setProgress(cur);
                if (cur >= ceiling) clearInterval(progressRef.current);
            }, 1000);
        };

        es.onmessage = (evt) => {
            const data = JSON.parse(evt.data);

            if (data.stage === "error") {
                es.close();
                if (progressRef.current) clearInterval(progressRef.current);
                setError(data.label);
                setBuilding(false);
                return;
            }

            // A real event arrived — cancel any drift ticker and snap to the true value
            if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
            setProgress(data.pct);
            setStageLabel(data.label);

            if (data.stage === "umap2d") startDrift(data.pct, 89);
            if (data.stage === "umap3d") startDrift(data.pct, 99);

            if (data.stage === "done") {
                es.close();
                setTimeout(() => onDone(data.project_id), 500);
            }
        };

        es.onerror = () => {
            es.close();
            if (progressRef.current) clearInterval(progressRef.current);
            setError("Building stopped. The server may be offline or restarting. Please try again in a few minutes.");
            setBuilding(false);
        };
    };

    return (
        <div className="page">
            <Navbar />
            <main className="page-main setup-main">
        <style>{`
            @keyframes sweep {
                0%   { transform: translateX(-150%); }
                100% { transform: translateX(350%); }
            }
        `}</style>
            <XPWindow
                title="new_dataset.exe"
                className="setup-window"
                staticChrome={building}
                collapsible={false}
                onClose={onBack}
            >
                <h1 style={styles.logo}>New dataset</h1>
                <p style={styles.sub}>Turn a CSV or JSON file into a map you can search by meaning.</p>

                {/* Step indicator */}
                <div style={styles.steps}>
                    {STEPS.map((label, i) => (
                        <div key={label} style={styles.stepRow}>
                            <div style={{
                                ...styles.stepDot,
                                background: i <= step ? "var(--accent)" : "var(--raised)",
                                border: `1px solid ${i <= step ? "var(--accent)" : "var(--line-strong)"}`,
                                color: i <= step ? "var(--text)" : "var(--text-2)",
                            }}>
                                {i < step ? "✓" : i + 1}
                            </div>
                            <span style={{ ...styles.stepLabel, color: i <= step ? "var(--text)" : "var(--text-2)" }}>
                                {label}
                            </span>
                            {i < STEPS.length - 1 && (
                                <div style={{ ...styles.stepLine, background: i < step ? "var(--accent)" : "var(--line-strong)" }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 0 — Upload */}
                {step === 0 && (
                    <div style={styles.section}>
                        <p style={styles.hint}>
                            Upload a CSV or JSON file to get started. Image, audio, and video URLs in columns are detected automatically.
                        </p>
                        <div
                            style={styles.dropzone}
                            onClick={() => fileRef.current.click()}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,.json"
                                style={{ display: "none" }}
                                onChange={handleUpload}
                            />
                            {uploading ? (
                                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={styles.dropText}>Uploading…</span>
                                        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{uploadProgress}%</span>
                                    </div>
                                    <div style={styles.progressTrack}>
                                        <div style={{ ...styles.progressBar, width: `${uploadProgress}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span style={styles.dropIcon}>↑</span>
                                    <span style={styles.dropText}>Click to upload CSV or JSON</span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 1 — Configure */}
                {step === 1 && uploadInfo && (
                    <div style={styles.section}>
                        <p style={styles.hint}>
                            <b style={{ color: "var(--accent-text-hover)" }}>{uploadInfo.filename}</b> — {uploadInfo.total_rows.toLocaleString()} rows, {uploadInfo.columns.length} columns
                        </p>

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Display name column</label>
                            <p style={styles.fieldHint}>The column shown as the point label (e.g. title, name)</p>
                            <select style={styles.select} value={nameCol} onChange={e => setNameCol(e.target.value)}>
                                {uploadInfo.columns.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Columns to embed</label>
                            <p style={styles.fieldHint}>Select one or more columns. They will be combined into a single embedding.</p>
                            <div style={styles.checkboxList}>
                                {uploadInfo.columns.map(c => {
                                    const mediaType = uploadInfo.media_cols?.[c];
                                    const isMedia = Boolean(mediaType);
                                    return (
                                        <label key={c} style={{
                                            ...styles.checkboxRow,
                                            opacity: isMedia ? 0.45 : 1,
                                            cursor: isMedia ? "not-allowed" : "pointer",
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={embedCols.includes(c)}
                                                onChange={() => !isMedia && toggleEmbedCol(c)}
                                                disabled={isMedia}
                                                style={{ ...styles.checkbox, cursor: isMedia ? "not-allowed" : "pointer" }}
                                            />
                                            <span style={{ color: embedCols.includes(c) ? "var(--accent-text-hover)" : "var(--text-2)", fontSize: 14, flex: 1 }}>{c}</span>
                                            {isMedia && (
                                                <span style={styles.mediaBadge}>{mediaType}</span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Preview */}
                        {embedCols.length > 0 && (
                        <div style={styles.previewBox}>
                            <p style={styles.previewTitle}>Preview — combined embed text</p>
                            {uploadInfo.preview.slice(0, 3).map((row, i) => {
                                const combined = previewEmbedText(row);
                                return (
                                    <div key={i} style={styles.previewRow}>
                                        <span style={styles.previewName}>{String(row[nameCol] ?? "—")}</span>
                                        <span style={styles.previewText}>
                                            {combined.slice(0, 160)}{combined.length > 160 ? "…" : ""}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        )}

                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>Project name</label>
                            <input
                                style={styles.nameInput}
                                type="text"
                                value={projectName}
                                onChange={e => setProjectName(e.target.value)}
                                placeholder="My project"
                            />
                        </div>

                        <button className="btn btn-blue" onClick={handleConfigure}>
                            Next
                        </button>
                    </div>
                )}

                {/* Step 2 — Build */}
                {step === 2 && (
                    <div style={styles.section}>
                        {building ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 12, color: "var(--text-2)" }}>{stageLabel}</span>
                                    <span style={{ fontSize: 12, color: "var(--text-2)", fontVariantNumeric: "tabular-nums" }}>
                                        {Math.round(progress)}%
                                    </span>
                                </div>
                                <div style={styles.progressTrack}>
                                    <div style={{ ...styles.progressBar, width: `${progress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <button className="btn btn-blue" onClick={handleBuild}>
                                Build map
                            </button>
                        )}
                    </div>
                )}

                {error && <p style={styles.error}>{error}</p>}

                {onBack && !building && (
                    <button onClick={onBack} className="btn btn-outline btn-sm" style={{ marginTop: 24 }}>← Back to datasets</button>
                )}
                {building && (
                    <button
                        onClick={() => {
                            if (esRef.current) esRef.current.close();
                            if (progressRef.current) clearInterval(progressRef.current);
                            onBack?.();
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ marginTop: 24 }}
                    >
                        Cancel
                    </button>
                )}
            </XPWindow>
            </main>
        </div>
    );
}

const styles = {
    overlay: {
        position: "fixed", inset: 0,
        background: "var(--bg-deep)",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    card: {
        background: "var(--card)",
        border: "1px solid var(--line-strong)",
        borderRadius: 2,
        padding: "40px 44px",
        width: 540,
    },
    logo: {
        fontSize: 20, fontWeight: 500, color: "var(--text)",
        marginBottom: 6,
    },
    sub: {
        fontSize: 16, color: "var(--text-2)", marginBottom: 32, lineHeight: 1.6,
    },
    steps: {
        display: "flex", alignItems: "center", marginBottom: 36, gap: 0,
    },
    stepRow: {
        display: "flex", alignItems: "center", gap: 8,
    },
    stepDot: {
        width: 24, height: 24, borderRadius: 2,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 600, flexShrink: 0,
    },
    stepLabel: {
        fontSize: 14, fontWeight: 500,
    },
    stepLine: {
        width: 32, height: 1, marginLeft: 8, marginRight: 8, flexShrink: 0,
    },
    section: {
        display: "flex", flexDirection: "column", gap: 16,
    },
    hint: {
        fontSize: 15, color: "var(--text-2)", lineHeight: 1.6,
    },
    limitNote: {
        fontSize: 12, color: "var(--text-2)", fontFamily: "var(--mono)",
    },
    dropzone: {
        border: "1px solid var(--line-strong)",
        borderRadius: 2,
        padding: "40px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        cursor: "pointer",
        transition: "border-color 0.15s",
    },
    dropIcon: {
        fontSize: 22, color: "var(--accent-text)",
    },
    dropText: {
        fontSize: 14, color: "var(--text-2)", letterSpacing: "0.01em",
    },
    fieldGroup: {
        display: "flex", flexDirection: "column", gap: 6,
    },
    label: {
        fontSize: 12, fontWeight: 600, color: "var(--accent-text)",
        
    },
    fieldHint: {
        fontSize: 12, color: "var(--muted)", marginBottom: 2,
    },
    select: {
        background: "var(--card)",
        border: "1px solid var(--line-strong)",
        color: "var(--text)",
        borderRadius: 2,
        padding: "7px 10px",
        fontSize: 14,
        outline: "none",
    },
    nameInput: {
        background: "var(--card)",
        border: "1px solid var(--line-strong)",
        color: "var(--text)",
        borderRadius: 2,
        padding: "7px 10px",
        fontSize: 14,
        outline: "none",
        fontFamily: "inherit",
        width: "100%",
    },
    checkboxList: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "var(--card)",
        border: "1px solid var(--line-strong)",
        borderRadius: 2,
        padding: "10px 12px",
        maxHeight: 180,
        overflowY: "auto",
    },
    checkboxRow: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
    },
    checkbox: {
        accentColor: "var(--accent)",
        width: 13,
        height: 13,
        cursor: "pointer",
    },
    mediaBadge: {
        fontSize: 12,
        fontWeight: 600,
        
       
        color: "var(--muted)",
        background: "var(--raised)",
        border: "1px solid var(--line-strong)",
        borderRadius: 2,
        padding: "1px 5px",
        flexShrink: 0,
    },
    previewBox: {
        background: "var(--card)",
        border: "1px solid var(--line-strong)",
        borderRadius: 2,
        padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 10,
    },
    previewTitle: {
        fontSize: 12, color: "var(--muted)", marginBottom: 4,
        fontWeight: 600,
    },
    previewRow: {
        display: "flex", flexDirection: "column", gap: 3,
        borderBottom: "1px solid #111120", paddingBottom: 8,
    },
    previewName: {
        fontSize: 14, fontWeight: 600, color: "var(--text)",
    },
    previewText: {
        fontSize: 12, color: "var(--text-2)", lineHeight: 1.5,
    },
    btn: {
        background: "var(--accent)",
        border: "none",
        color: "var(--text)",
        padding: "10px 22px",
        borderRadius: 2,
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: "0.03em",
        cursor: "pointer",
        transition: "background 0.15s",
        alignSelf: "flex-start",
    },
    progressTrack: {
        background: "var(--raised)",
        borderRadius: 0,
        height: 4,
        width: "100%",
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        background: "var(--accent)",
        transition: "width 0.4s ease",
    },
    progressIndeterminate: {
        height: "100%",
        width: "40%",
        background: "var(--accent)",
        animation: "sweep 1.4s ease-in-out infinite",
    },
    backBtn: {
        background: "none",
        border: "none",
        color: "var(--muted)",
        fontSize: 12,
        padding: "16px 0 0",
        cursor: "pointer",
        transition: "color 0.15s",
        alignSelf: "flex-start",
        letterSpacing: "0.02em",
    },
    error: {
        marginTop: 12,
        fontSize: 14,
        color: "var(--negative)",
        background: "var(--negative-soft)",
        border: "1px solid rgba(239,68,68,0.15)",
        borderRadius: 2,
        padding: "8px 12px",
    },
};
