import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import XPWindow from "../components/XPWindow";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm]   = useState("");
    const [error, setError]       = useState(null);
    const [message, setMessage]   = useState(null);
    const [loading, setLoading]   = useState(false);
    const [ready, setReady]       = useState(false);
    const [expired, setExpired]   = useState(false);

    // Supabase puts the recovery token in the URL hash.
    // onAuthStateChange fires with PASSWORD_RECOVERY once the client picks it up.
    // If that never happens (opened directly, or the link is old), say so instead of waiting forever.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") setReady(true);
        });
        const timer = setTimeout(() => setExpired(true), 6000);
        return () => { subscription.unsubscribe(); clearTimeout(timer); };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) { setError("Passwords don't match."); return; }
        if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setError(error.message);
        } else {
            setMessage("Password updated. Redirecting…");
            setTimeout(() => navigate("/"), 1500);
        }
        setLoading(false);
    };

    return (
        <div style={s.page}>
            <XPWindow title="reset_password.exe" staticChrome style={{ width: "min(400px, calc(100vw - 32px))" }}>
                <h2 style={s.title}>Set a new password</h2>
                <p style={s.subtitle}>Enter a new password for your account.</p>

                {!ready ? (
                    expired ? (
                        <>
                            <p style={s.waiting}>
                                This reset link is invalid or has expired. Request a new one from the sign-in window
                                with "forgot password?".
                            </p>
                            <button style={s.btn} onClick={() => navigate("/?login=true")}>Back to sign in</button>
                        </>
                    ) : (
                        <p style={s.waiting}>Verifying reset link…</p>
                    )
                ) : (
                    <form onSubmit={handleSubmit} style={s.form} noValidate>
                        <input
                            type="password"
                            placeholder="New password (8+ characters)"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={s.input}
                            autoComplete="new-password"
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            style={s.input}
                            autoComplete="new-password"
                        />
                        {error   && <p className="keep-case" style={s.error}>{error}</p>}
                        {message && <p style={s.success}>{message}</p>}
                        <button type="submit" disabled={loading} style={s.btn}>
                            {loading ? "…" : "Update password"}
                        </button>
                    </form>
                )}
            </XPWindow>
        </div>
    );
}

const s = {
    page: {
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "var(--font)",
    },
    title: {
        fontSize: 20, fontWeight: 600, color: "var(--text)",
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 15, color: "var(--muted)", marginBottom: 20,
    },
    waiting: {
        fontSize: 15, color: "var(--text-2)", lineHeight: 1.55, marginBottom: 16,
    },
    form: {
        display: "flex", flexDirection: "column", gap: 10,
    },
    input: {
        background: "var(--bg-deep)",
        border: "1px solid var(--line-strong)",
        color: "var(--text)",
        padding: "0 12px",
        height: 40, borderRadius: 4,
        fontSize: 15, outline: "none",
        fontFamily: "inherit",
    },
    btn: {
        width: "100%",
        background: "var(--accent)", border: "none",
        color: "#fff", height: 40, borderRadius: 4,
        fontSize: 15, fontWeight: 600, cursor: "pointer",
        marginTop: 4, fontFamily: "inherit",
    },
    error: {
        fontSize: 14, color: "var(--negative)", margin: 0,
    },
    success: {
        fontSize: 14, color: "var(--positive)", margin: 0,
    },
};
