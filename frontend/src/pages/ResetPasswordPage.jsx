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
                            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                            onBlur={e => e.target.style.borderColor = "#1e1e2e"}
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            style={s.input}
                            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                            onBlur={e => e.target.style.borderColor = "#1e1e2e"}
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
        background: "#05050a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    card: {
        width: 360,
        background: "#0c0c14",
        border: "1px solid #1a1a28",
        borderRadius: 3,
        padding: "32px 28px",
        boxShadow: "5px 5px 0px #000",
    },
    title: {
        fontSize: 18, fontWeight: 700, color: "#fff",
        letterSpacing: "-0.4px", marginBottom: 6,
    },
    subtitle: {
        fontSize: 12, color: "#3a3a4a", marginBottom: 20,
    },
    waiting: {
        fontSize: 12, color: "#555",
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
};
