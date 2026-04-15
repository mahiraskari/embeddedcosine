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
                style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#6366f1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "#fff",
                    cursor: "pointer", flexShrink: 0, overflow: "hidden",
                    border: open ? "2px solid #6366f1" : "2px solid transparent",
                    transition: "border-color 0.15s",
                }}
            >
                {avatarUrl
                    ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                    : displayName[0]?.toUpperCase()
                }
            </div>

            {/* Dropdown */}
            {open && (
                <div style={s.dropdown}>
                    {/* User info header */}
                    <div style={s.header}>
                        <div style={s.avatarLarge}>
                            {avatarUrl
                                ? <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} onError={e => { e.target.style.display = "none"; }} />
                                : <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{displayName[0]?.toUpperCase()}</span>
                            }
                        </div>
                        <div style={s.headerText}>
                            <span style={s.name}>{displayName}</span>
                            <span style={s.email}>{email}</span>
                        </div>
                    </div>

                    <div style={s.divider} />

                    {confirmSignOut ? (
                        <div style={s.confirmRow}>
                            <span style={{ fontSize: 11, color: "#555" }}>Are you sure?</span>
                            <button style={s.confirmYes} onClick={handleSignOut}>Sign out</button>
                            <button style={s.confirmNo} onClick={() => setConfirmSignOut(false)}>Cancel</button>
                        </div>
                    ) : (
                        <button style={{ ...s.menuItem, color: "#f87171" }} onClick={() => setConfirmSignOut(true)}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.06)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                            Sign out
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

const s = {
    dropdown: {
        position: "absolute", top: "calc(100% + 10px)", right: 0,
        width: 220,
        background: "#0c0c14",
        border: "1px solid #1a1a28",
        borderRadius: 3,
        boxShadow: "5px 5px 0px #000",
        zIndex: 200,
        fontFamily: '"Onest", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        overflow: "hidden",
    },
    header: {
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 14px 12px",
    },
    avatarLarge: {
        width: 36, height: 36, borderRadius: "50%",
        background: "#6366f1", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
    },
    headerText: {
        display: "flex", flexDirection: "column", gap: 2, minWidth: 0,
    },
    name: {
        fontSize: 13, fontWeight: 600, color: "#e2e2e2",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    },
    email: {
        fontSize: 10, color: "#3a3a4a",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    },
    divider: {
        height: 1, background: "#111",
    },
    menuItem: {
        display: "block", width: "100%", textAlign: "left",
        background: "transparent", border: "none",
        color: "#a0a0c0", fontSize: 12, padding: "10px 14px",
        cursor: "pointer", fontFamily: "inherit",
        transition: "background 0.1s",
    },
    confirmRow: {
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 14px",
    },
    confirmYes: {
        background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)",
        color: "#f87171", fontSize: 10, padding: "3px 8px",
        borderRadius: 2, cursor: "pointer", fontFamily: "inherit",
    },
    confirmNo: {
        background: "none", border: "1px solid #222",
        color: "#555", fontSize: 10, padding: "3px 8px",
        borderRadius: 2, cursor: "pointer", fontFamily: "inherit",
    },
};
