import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm]   = useState("");
    const [error, setError]       = useState(null);
    const [message, setMessage]   = useState(null);
    const [loading, setLoading]   = useState(false);
    const [ready, setReady]       = useState(false);

    // Supabase puts the recovery token in the URL hash.
    // onAuthStateChange fires with PASSWORD_RECOVERY once the client picks it up.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") setReady(true);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirm) { setError("Passwords don't match."); return; }
        if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }
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
            <div style={s.card}>
                <h2 style={s.title}>Set new password</h2>
                <p style={s.subtitle}>Enter a new password for your account.</p>

                {!ready ? (
                    <p style={s.waiting}>Verifying reset link…</p>
                ) : (
                    <form onSubmit={handleSubmit} style={s.form} noValidate>
                        <input
                            type="password"
                            placeholder="New password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={s.input}
                            onFocus={e => e.target.style.borderColor = "var(--accent-line)"}
                            onBlur={e => e.target.style.borderColor = "var(--line-strong)"}
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            style={s.input}
                            onFocus={e => e.target.style.borderColor = "var(--accent-line)"}
                            onBlur={e => e.target.style.borderColor = "var(--line-strong)"}
                        />
                        {error   && <p style={s.error}>{error}</p>}
                        {message && <p style={s.success}>{message}</p>}
                        <button type="submit" disabled={loading} style={s.btn}>
                            {loading ? "…" : "Update password"}
                        </button>
                    </form>
                )}
            </div>
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
        fontFamily: "var(--font)",
    },
    card: {
        width: 360,
        background: "var(--card)",
        border: "1px solid var(--line-strong)",
        borderRadius: 3,
        padding: "32px 28px",
        boxShadow: "var(--xp-shadow)",
    },
    title: {
        fontSize: 18, fontWeight: 600, color: "var(--text)",
        letterSpacing: "-0.4px", marginBottom: 6,
    },
    subtitle: {
        fontSize: 12, color: "var(--muted)", marginBottom: 20,
    },
    waiting: {
        fontSize: 12, color: "var(--text-2)",
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
        fontSize: 13, outline: "none",
        fontFamily: "inherit", transition: "border-color 0.15s",
    },
    btn: {
        background: "var(--accent)", border: "none",
        color: "var(--text)", height: 36, borderRadius: 3,
        fontSize: 13, fontWeight: 600, cursor: "pointer",
        marginTop: 4, fontFamily: "inherit",
    },
    error: {
        fontSize: 12, color: "var(--negative)", margin: 0,
    },
    success: {
        fontSize: 12, color: "#34d399", margin: 0,
    },
};
