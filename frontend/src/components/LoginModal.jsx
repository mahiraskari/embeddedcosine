import { useState } from "react";
import { supabase } from "../supabase";

const REDIRECT = window.location.origin;

export default function LoginModal({ onClose, onSuccess }) {
    const [mode, setMode]         = useState("signin");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    // a failed provider sign-in comes back as ?auth_error=… (see App.jsx)
    const [error, setError]       = useState(() => new URLSearchParams(window.location.search).get("auth_error"));
    const [message, setMessage]   = useState(null);
    const [loading, setLoading]   = useState(false);

    const switchMode = (m) => { setMode(m); setError(null); setMessage(null); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (!email.trim()) { setError("Enter your email address."); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError("That doesn't look like a valid email."); return; }
        if (mode !== "forgot" && !password) { setError("Enter your password."); return; }
        if (mode === "signup" && password.length < 6) { setError("Password must be at least 6 characters."); return; }

        setLoading(true);

        if (mode === "forgot") {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) setError(error.message);
            else setMessage("Check your email for a password reset link.");
            setLoading(false);
            return;
        }

        if (mode === "signup") {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (error) {
                setError(error.message);
            } else if (!data.user || data.user.identities?.length === 0) {
                setError("An account with this email already exists. Sign in instead.");
            } else {
                setMessage("Check your email to confirm your account, then sign in.");
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError(error.message);
            else onSuccess?.();
        }
        setLoading(false);
    };

    const signInWithProvider = async (provider) => {
        await supabase.auth.signInWithOAuth({
            provider,
            options: { redirectTo: REDIRECT },
        });
    };

    return (
        // Backdrop — only X button closes it
        <div style={s.backdrop}>
            <div style={s.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="login-title">
                {/* XP title bar */}
                <div style={s.titleBar}>
                    <span style={s.titleText}>
                        {mode === "signin" ? "sign_in.exe" : mode === "signup" ? "create_account.exe" : "reset_password.exe"}
                    </span>
                    <div className="xp-window-btns">
                        <span className="xp-title-btn" aria-hidden="true">—</span>
                        <span className="xp-title-btn" aria-hidden="true">□</span>
                        <span
                            className="xp-title-btn xp-title-btn--close"
                            role="button"
                            tabIndex={0}
                            aria-label="Close"
                            title="Close"
                            onClick={onClose}
                            onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClose())}
                        >✕</span>
                    </div>
                </div>

                <div style={s.body}>

                <h2 id="login-title" style={s.title}>
                    {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
                </h2>
                <p style={s.subtitle}>
                    {mode === "signin"  ? "Sign in to access your datasets."
                   : mode === "signup" ? "Create an account to start mapping your data."
                   : "Enter your email and we'll send you a reset link."}
                </p>
                {mode !== "forgot" && (
                    <p style={{ margin: "-12px 0 20px", fontSize: 14, color: "var(--muted)" }}>
                        Free account · up to 4 datasets · 25 MB per file
                    </p>
                )}

                {/* OAuth buttons — only on signin/signup */}
                {mode !== "forgot" && <>
                    <div style={s.oauthRow}>
                        <button style={s.oauthBtn} onClick={() => signInWithProvider("google")}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line-strong)"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Google
                        </button>
                        <button style={s.oauthBtn} onClick={() => signInWithProvider("github")}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line-strong)"}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#e2e2e2" style={{ flexShrink: 0 }}>
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                            </svg>
                            GitHub
                        </button>
                    </div>
                    <div style={s.divider}><span style={s.dividerText}>or</span></div>
                </>}

                <form onSubmit={handleSubmit} style={s.form} noValidate>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={s.input}
                        onFocus={e => e.target.style.borderColor = "var(--accent-line)"}
                        onBlur={e => e.target.style.borderColor = "var(--line-strong)"}
                    />
                    {mode !== "forgot" && (
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={s.input}
                            onFocus={e => e.target.style.borderColor = "var(--accent-line)"}
                            onBlur={e => e.target.style.borderColor = "var(--line-strong)"}
                        />
                    )}

                    {mode === "signin" && (
                        <span style={s.forgotLink} onClick={() => switchMode("forgot")}>
                            Forgot password?
                        </span>
                    )}

                    {error   && <p className="keep-case" style={s.error}>{error}</p>}
                    {message && <p style={s.success}>{message}</p>}

                    <button type="submit" disabled={loading} style={s.btn}>
                        {loading ? "…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                    </button>
                </form>

                <p style={s.toggle}>
                    {mode === "forgot" ? (
                        <>Remembered it? <span style={s.toggleLink} onClick={() => switchMode("signin")}>Sign in</span></>
                    ) : mode === "signin" ? (
                        <>Don't have an account? <span style={s.toggleLink} onClick={() => switchMode("signup")}>Sign up</span></>
                    ) : (
                        <>Already have an account? <span style={s.toggleLink} onClick={() => switchMode("signin")}>Sign in</span></>
                    )}
                </p>
                </div>
            </div>
        </div>
    );
}

const s = {
    backdrop: {
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
    },
    card: {
        width: "min(380px, calc(100vw - 32px))",
        background: "var(--card)",
        border: "1px solid #1e4ca8",
        borderRadius: "8px 8px 4px 4px",
        overflow: "hidden",
        boxShadow: "var(--xp-shadow)",
        position: "relative",
        fontFamily: "var(--font)",
    },
    titleBar: {
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        minHeight: 30, padding: "4px 4px 4px 10px",
        background: "var(--xp-title)", userSelect: "none",
    },
    titleText: {
        fontFamily: "var(--mono)", fontSize: 14, fontWeight: 500, color: "#fff",
        textShadow: "0 1px 0 rgba(0,0,0,0.35)",
    },
    body: {
        padding: "24px 28px 28px",
    },
    title: {
        fontSize: 18, fontWeight: 600, color: "var(--text)",
        letterSpacing: "-0.4px", marginBottom: 6,
    },
    subtitle: {
        fontSize: 14, color: "var(--muted)", marginBottom: 20,
    },
    oauthRow: {
        display: "flex", gap: 8, marginBottom: 16,
    },
    oauthBtn: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: "var(--bg-deep)", border: "1px solid var(--line-strong)",
        color: "var(--text-2)", fontSize: 14, fontWeight: 500,
        height: 36, borderRadius: 3, cursor: "pointer",
        fontFamily: "inherit", transition: "border-color 0.15s",
    },
    divider: {
        display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        // Lines on either side of "or"
        background: "linear-gradient(var(--line-strong), var(--line-strong)) left center / calc(50% - 16px) 1px no-repeat, linear-gradient(var(--line-strong), var(--line-strong)) right center / calc(50% - 16px) 1px no-repeat",
    },
    dividerText: {
        fontSize: 12, color: "var(--muted)",
        margin: "0 auto",
    },
    form: {
        display: "flex", flexDirection: "column", gap: 10,
    },
    input: {
        background: "var(--bg-deep)",
        border: "1px solid var(--line-strong)",
        color: "var(--text)",
        padding: "0 12px",
        height: 36, borderRadius: 3,
        fontSize: 15, outline: "none",
        fontFamily: "inherit", transition: "border-color 0.15s",
    },
    btn: {
        background: "var(--accent)", border: "none",
        color: "#fff", height: 36, borderRadius: 4,
        fontSize: 15, fontWeight: 600, cursor: "pointer",
        marginTop: 4, fontFamily: "inherit",
    },
    error: {
        fontSize: 14, color: "var(--negative)", margin: 0,
    },
    success: {
        fontSize: 14, color: "var(--positive)", margin: 0,
    },
    toggle: {
        fontSize: 14, color: "var(--muted)", marginTop: 20, textAlign: "center",
    },
    toggleLink: {
        color: "var(--accent-text)", cursor: "pointer",
    },
    forgotLink: {
        fontSize: 12, color: "var(--muted)", cursor: "pointer",
        alignSelf: "flex-end", marginTop: -4,
        transition: "color 0.15s",
    },
};
