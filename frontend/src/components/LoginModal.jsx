import { useState } from "react";
import { supabase } from "../supabase";

const REDIRECT = window.location.origin;

export default function LoginModal({ onClose, onSuccess }) {
    const [mode, setMode]         = useState("signin");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState(null);
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
            <div style={s.card} onClick={e => e.stopPropagation()}>
                <button style={s.closeBtn} onClick={onClose}
                    onMouseEnter={e => e.target.style.color = "#a5b4fc"}
                    onMouseLeave={e => e.target.style.color = "#333"}
                >✕</button>

                <h2 style={s.title}>
                    {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
                </h2>
                <p style={s.subtitle}>
                    {mode === "signin"  ? "Sign in to access your datasets."
                   : mode === "signup" ? "Create an account to start mapping your data."
                   : "Enter your email and we'll send you a reset link."}
                </p>

                {/* OAuth buttons — only on signin/signup */}
                {mode !== "forgot" && <>
                    <div style={s.oauthRow}>
                        <button style={s.oauthBtn} onClick={() => signInWithProvider("google")}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e2e"}
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
                            onMouseEnter={e => e.currentTarget.style.borderColor = "#6366f1"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e2e"}
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
                        onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                        onBlur={e => e.target.style.borderColor = "#1e1e2e"}
                    />
                    {mode !== "forgot" && (
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={s.input}
                            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                            onBlur={e => e.target.style.borderColor = "#1e1e2e"}
                        />
                    )}

                    {mode === "signin" && (
                        <span style={s.forgotLink} onClick={() => switchMode("forgot")}>
                            Forgot password?
                        </span>
                    )}

                    {error   && <p style={s.error}>{error}</p>}
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
        width: 360,
        background: "#0c0c14",
        border: "1px solid #1a1a28",
        borderRadius: 3,
        padding: "32px 28px",
        boxShadow: "5px 5px 0px #000",
        position: "relative",
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    closeBtn: {
        position: "absolute", top: 10, right: 12,
        background: "none", border: "none",
        color: "#444", fontSize: 18, cursor: "pointer",
        lineHeight: 1, transition: "color 0.12s",
        padding: "4px 6px",
    },
    title: {
        fontSize: 18, fontWeight: 700, color: "#fff",
        letterSpacing: "-0.4px", marginBottom: 6,
    },
    subtitle: {
        fontSize: 12, color: "#3a3a4a", marginBottom: 20,
    },
    oauthRow: {
        display: "flex", gap: 8, marginBottom: 16,
    },
    oauthBtn: {
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: "#07070d", border: "1px solid #1e1e2e",
        color: "#a0a0c0", fontSize: 12, fontWeight: 500,
        height: 36, borderRadius: 3, cursor: "pointer",
        fontFamily: "inherit", transition: "border-color 0.15s",
    },
    divider: {
        display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
        // Lines on either side of "or"
        background: "linear-gradient(#2a2a3a, #2a2a3a) left center / calc(50% - 16px) 1px no-repeat, linear-gradient(#2a2a3a, #2a2a3a) right center / calc(50% - 16px) 1px no-repeat",
    },
    dividerText: {
        fontSize: 11, color: "#2a2a3a",
        margin: "0 auto",
    },
    form: {
        display: "flex", flexDirection: "column", gap: 10,
    },
    input: {
        background: "#07070d",
        border: "1px solid #1e1e2e",
        color: "#e2e2e2",
        padding: "0 12px",
        height: 36, borderRadius: 3,
        fontSize: 13, outline: "none",
        fontFamily: "inherit", transition: "border-color 0.15s",
    },
    btn: {
        background: "#6366f1", border: "none",
        color: "#fff", height: 36, borderRadius: 3,
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        marginTop: 4, fontFamily: "inherit",
    },
    error: {
        fontSize: 12, color: "#f87171", margin: 0,
    },
    success: {
        fontSize: 12, color: "#34d399", margin: 0,
    },
    toggle: {
        fontSize: 12, color: "#3a3a4a", marginTop: 20, textAlign: "center",
    },
    toggleLink: {
        color: "#6366f1", cursor: "pointer",
    },
    forgotLink: {
        fontSize: 11, color: "#3a3a4a", cursor: "pointer",
        alignSelf: "flex-end", marginTop: -4,
        transition: "color 0.15s",
    },
};
