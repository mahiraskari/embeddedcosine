import { useState, useRef } from "react";
import { uploadDataset, configureDataset, getPipelineStreamURL } from "../api/client";

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
            setError(err.response?.data?.detail || err.message || "Upload failed — is the backend running?");
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
            setError(err.response?.data?.detail || "Configuration failed");
        }
    };

    const handleBuild = async () => {
        setError(null);
        setBuilding(true);
        setProgress(0);
        setStageLabel("Starting…");

        if (progressRef.current) clearInterval(progressRef.current);
        if (esRef.current) esRef.current.close();

        const streamUrl = await getPipelineStreamURL();
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
            setError("Pipeline failed — check the backend logs");
            setBuilding(false);
        };
    };

    return (
        <div style={styles.overlay}>
        <style>{`
            @keyframes sweep {
                0%   { transform: translateX(-150%); }
                100% { transform: translateX(350%); }
            }
        `}</style>
            <div style={styles.card}>
                <h1 style={styles.logo}>embeddedcosine</h1>
                <p style={styles.sub}>Turn any dataset into a semantic map</p>

                {/* Step indicator */}
                <div style={styles.steps}>
                    {STEPS.map((label, i) => (
                        <div key={label} style={styles.stepRow}>
                            <div style={{
                                ...styles.stepDot,
                                background: i <= step ? "#6366f1" : "#1e1e1e",
                                border: `1px solid ${i <= step ? "#6366f1" : "#333"}`,
                                color: i <= step ? "#fff" : "#555",
                            }}>
                                {i < step ? "✓" : i + 1}
                            </div>
                            <span style={{ ...styles.stepLabel, color: i <= step ? "#e2e2e2" : "#555" }}>
                                {label}
                            </span>
                            {i < STEPS.length - 1 && (
                                <div style={{ ...styles.stepLine, background: i < step ? "#6366f1" : "#222" }} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 0 — Upload */}
                {step === 0 && (
                    <div style={styles.section}>
                        <p style={styles.hint}>
                            Upload a CSV or JSON file to get started.
                        </p>
                        <p style={styles.limitNote}>25 MB file size limit.</p>
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
                                        <span style={{ fontSize: 11, color: "#555" }}>{uploadProgress}%</span>
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
                            <b style={{ color: "#a5b4fc" }}>{uploadInfo.filename}</b> — {uploadInfo.total_rows.toLocaleString()} rows, {uploadInfo.columns.length} columns
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
                                {uploadInfo.columns.map(c => (
                                    <label key={c} style={styles.checkboxRow}>
                                        <input
                                            type="checkbox"
                                            checked={embedCols.includes(c)}
                                            onChange={() => toggleEmbedCol(c)}
                                            style={styles.checkbox}
                                        />
                                        <span style={{ color: embedCols.includes(c) ? "#a5b4fc" : "#555", fontSize: 12 }}>{c}</span>
                                    </label>
                                ))}
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

                        <button style={styles.btn} onClick={handleConfigure}>
                            Confirm →
                        </button>
                    </div>
                )}

                {/* Step 2 — Build */}
                {step === 2 && (
                    <div style={styles.section}>
                        {building ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                    <span style={{ fontSize: 11, color: "#555" }}>{stageLabel}</span>
                                    <span style={{ fontSize: 11, color: "#444", fontVariantNumeric: "tabular-nums" }}>
                                        {Math.round(progress)}%
                                    </span>
                                </div>
                                <div style={styles.progressTrack}>
                                    <div style={{ ...styles.progressBar, width: `${progress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <button style={styles.btn} onClick={handleBuild}>
                                Build map →
                            </button>
                        )}
                    </div>
                )}

                {error && <p style={styles.error}>{error}</p>}

                {onBack && !building && (
                    <button onClick={onBack} style={styles.backBtn}>← Back</button>
                )}
                {building && (
                    <button
                        onClick={() => {
                            if (esRef.current) esRef.current.close();
                            if (progressRef.current) clearInterval(progressRef.current);
                            onBack?.();
                        }}
                        style={styles.backBtn}
                    >
                        ← Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: "fixed", inset: 0,
        background: "#07070d",
        display: "flex", alignItems: "center", justifyContent: "center",
    },
    card: {
        background: "#0c0c14",
        border: "1px solid #1e1e30",
        borderRadius: 2,
        padding: "40px 44px",
        width: 540,
    },
    logo: {
        fontSize: 20, fontWeight: 800, color: "#fff",
        letterSpacing: "-0.5px", marginBottom: 4,
        fontFamily: "monospace",
    },
    sub: {
        fontSize: 12, color: "#3a3a4a", marginBottom: 36,
        letterSpacing: "0.01em",
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
        fontSize: 11, fontWeight: 600, flexShrink: 0,
    },
    stepLabel: {
        fontSize: 12, fontWeight: 500,
    },
    stepLine: {
        width: 32, height: 1, marginLeft: 8, marginRight: 8, flexShrink: 0,
    },
    section: {
        display: "flex", flexDirection: "column", gap: 16,
    },
    hint: {
        fontSize: 13, color: "#888", lineHeight: 1.6,
    },
    limitNote: {
        fontSize: 11, color: "#555", fontFamily: "monospace",
    },
    dropzone: {
        border: "1px solid #1e1e30",
        borderRadius: 2,
        padding: "40px 24px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        cursor: "pointer",
        transition: "border-color 0.15s",
    },
    dropIcon: {
        fontSize: 22, color: "#6366f1",
    },
    dropText: {
        fontSize: 12, color: "#555", letterSpacing: "0.01em",
    },
    fieldGroup: {
        display: "flex", flexDirection: "column", gap: 6,
    },
    label: {
        fontSize: 11, fontWeight: 700, color: "#6366f1",
        letterSpacing: "0.08em", textTransform: "uppercase",
    },
    fieldHint: {
        fontSize: 11, color: "#3a3a4a", marginBottom: 2,
    },
    select: {
        background: "#08080f",
        border: "1px solid #1e1e30",
        color: "#c4c4d4",
        borderRadius: 2,
        padding: "7px 10px",
        fontSize: 12,
        outline: "none",
    },
    nameInput: {
        background: "#08080f",
        border: "1px solid #1e1e30",
        color: "#e2e2e2",
        borderRadius: 2,
        padding: "7px 10px",
        fontSize: 12,
        outline: "none",
        fontFamily: "inherit",
        width: "100%",
    },
    checkboxList: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: "#08080f",
        border: "1px solid #1e1e30",
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
        accentColor: "#6366f1",
        width: 13,
        height: 13,
        cursor: "pointer",
    },
    previewBox: {
        background: "#08080f",
        border: "1px solid #1a1a28",
        borderRadius: 2,
        padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 10,
    },
    previewTitle: {
        fontSize: 10, color: "#2a2a3a", marginBottom: 4,
        textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700,
    },
    previewRow: {
        display: "flex", flexDirection: "column", gap: 3,
        borderBottom: "1px solid #111120", paddingBottom: 8,
    },
    previewName: {
        fontSize: 12, fontWeight: 600, color: "#e2e2e2",
    },
    previewText: {
        fontSize: 11, color: "#444", lineHeight: 1.5,
    },
    btn: {
        background: "#6366f1",
        border: "none",
        color: "#fff",
        padding: "10px 22px",
        borderRadius: 2,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.03em",
        cursor: "pointer",
        transition: "background 0.15s",
        alignSelf: "flex-start",
    },
    progressTrack: {
        background: "#111120",
        borderRadius: 0,
        height: 4,
        width: "100%",
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        background: "#6366f1",
        transition: "width 0.4s ease",
    },
    progressIndeterminate: {
        height: "100%",
        width: "40%",
        background: "#6366f1",
        animation: "sweep 1.4s ease-in-out infinite",
    },
    backBtn: {
        background: "none",
        border: "none",
        color: "#2a2a3a",
        fontSize: 11,
        padding: "16px 0 0",
        cursor: "pointer",
        transition: "color 0.15s",
        alignSelf: "flex-start",
        letterSpacing: "0.02em",
    },
    error: {
        marginTop: 12,
        fontSize: 12,
        color: "#f87171",
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.15)",
        borderRadius: 2,
        padding: "8px 12px",
    },
};
