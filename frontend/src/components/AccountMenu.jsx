import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

export default function AccountMenu({ session }) {
    const navigate    = useNavigate();
    const [open, setOpen]           = useState(false);
    const [confirmSignOut, setConfirmSignOut] = useState(false);
    const menuRef = useRef(null);

    const displayName = session?.user?.user_metadata?.full_name
        || session?.user?.email?.split("@")[0]
        || "Account";
    const email     = session?.user?.email ?? "";
    const avatarUrl = session?.user?.user_metadata?.avatar_url ?? null;

    // Close the dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
                setConfirmSignOut(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    return (
        <div ref={menuRef} style={{ position: "relative" }}>
            {/* Avatar button */}
            <div
                onClick={() => { setOpen(o => !o); setConfirmSignOut(false); }}
                role="button"
                tabIndex={0}
                aria-label="Account"
                aria-expanded={open}
                onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(o => !o))}
                style={{
                    width: 32, height: 32, borderRadius: 4,
                    background: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 600, color: "#fff",
                    cursor: "pointer", flexShrink: 0, overflow: "hidden",
                    border: open ? "2px solid var(--accent-text)" : "2px solid rgba(255,255,255,0.55)",
                }}
            >
                {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                    : displayName[0]?.toUpperCase()
                }
            </div>

            {/* Dropdown: an XP Start-menu panel (user on the blue band, Sign out in the bottom bar) */}
            {open && (
                <div style={s.dropdown} role="menu">
                    <div style={s.header}>
                        <div style={s.avatarLarge}>
                            {avatarUrl
                                ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                                : <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{displayName[0]?.toUpperCase()}</span>
                            }
                        </div>
                        <div className="keep-case" style={s.headerText}>
                            <span style={s.name}>{displayName}</span>
                            <span style={s.email}>{email}</span>
                        </div>
                    </div>

                    <div style={s.body}>
                        <button className="start-menu-item" role="menuitem" onClick={() => { setOpen(false); navigate("/datasets"); }}>
                            My datasets
                        </button>
                        <button className="start-menu-item" role="menuitem" onClick={() => { setOpen(false); navigate("/support"); }}>
                            Support
                        </button>
                    </div>

                    <div style={s.foot}>
                        {confirmSignOut ? (
                            <>
                                <span style={{ fontSize: 15, color: "var(--text-2)", marginRight: "auto" }}>Sign out?</span>
                                <button style={s.confirmNo} onClick={() => setConfirmSignOut(false)}>Cancel</button>
                                <button style={s.confirmYes} onClick={handleSignOut}>Sign out</button>
                            </>
                        ) : (
                            <button style={s.signOut} role="menuitem" onClick={() => setConfirmSignOut(true)}>
                                <span style={s.powerIcon} aria-hidden="true">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
                                        <path d="M6 1.5v4" />
                                        <path d="M3.4 3.2a3.8 3.8 0 1 0 5.2 0" />
                                    </svg>
                                </span>
                                Sign out
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

const s = {
    dropdown: {
        position: "absolute", top: "calc(100% + 12px)", right: 0,
        width: 280,
        background: "var(--card)",
        border: "1px solid #1e4ca8",
        borderRadius: "8px 8px 4px 4px",
        boxShadow: "var(--xp-shadow)",
        zIndex: 200,
        fontFamily: "var(--font)",
        overflow: "hidden",
    },
    header: {
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px",
        background: "var(--xp-title)",
    },
    avatarLarge: {
        width: 40, height: 40, borderRadius: 4,
        background: "var(--accent)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        border: "2px solid rgba(255,255,255,0.7)",
    },
    headerText: {
        display: "flex", flexDirection: "column", gap: 2, minWidth: 0,
    },
    name: {
        fontSize: 16, fontWeight: 600, color: "#fff",
        textShadow: "0 1px 0 rgba(0,0,0,0.35)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    },
    email: {
        fontSize: 14, color: "rgba(255,255,255,0.8)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    },
    body: {
        padding: "6px 0",
    },
    foot: {
        display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
        padding: "8px 10px",
        background: "var(--raised)",
        borderTop: "1px solid var(--line)",
    },
    signOut: {
        display: "inline-flex", alignItems: "center", gap: 8,
        height: 30, padding: "0 10px 0 6px", lineHeight: 1,
        background: "none", border: "1px solid transparent", borderRadius: 4,
        color: "var(--text-2)", fontSize: 15, cursor: "pointer", fontFamily: "inherit",
    },
    powerIcon: {
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 20, height: 20, borderRadius: 4, flexShrink: 0,
        background: "var(--xp-close)",
        border: "1px solid rgba(255,255,255,0.35)",
    },
    confirmYes: {
        height: 28, padding: "0 10px",
        background: "var(--xp-close)", border: "1px solid rgba(255,255,255,0.3)",
        color: "#fff", fontSize: 14, borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
    },
    confirmNo: {
        height: 28, padding: "0 10px",
        background: "none", border: "1px solid var(--line-strong)",
        color: "var(--text-2)", fontSize: 14, borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
    },
};
