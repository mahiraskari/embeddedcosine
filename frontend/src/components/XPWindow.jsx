import { useEffect, useId, useState } from "react";
import { closedWindows } from "./closedWindows";

/**
 * Shared XP-style window for normal pages.
 *  — "—" rolls the window up so only its title bar shows; press it again to open it
 *  — "□" maximizes: runs onMaximize when given (e.g. open the full map), otherwise the window fills
 *    the screen; ❐, Esc, a double-click on the title or clicking outside restores it
 *  — "✕" runs onClose when given; otherwise it sends the window to the bar at the bottom
 *    of the screen, and clicking it there brings the window back
 *  — draggable windows move by a transform offset from their place in the layout;
 *    dragging a maximized window restores it first, like Windows
 */
export default function XPWindow({
    title,
    children,
    className = "",
    bodyClassName = "",
    style,
    onClose,
    onMinimize,
    onMaximize,
    maximizeLabel = "Maximize window",
    draggable = false,
    collapsible = true,
    id,
    staticChrome = false,     // title bar buttons are decoration only (e.g. the upload wizard)
}) {
    const [minimized, setMinimized] = useState(false);
    const [hidden, setHidden] = useState(false);
    const uid = useId();
    const closeKey = `win-${uid}`;

    // closed windows wait on the bottom bar until clicked; leaving the page clears them
    useEffect(() => {
        if (hidden) closedWindows.add({ key: closeKey, title, restore: () => setHidden(false) });
        else closedWindows.remove(closeKey);
    }, [hidden, title, closeKey]);
    useEffect(() => () => closedWindows.remove(closeKey), [closeKey]);

    const close = () => {
        if (onClose) { onClose(); return; }
        setMaximized(false);
        setHidden(true);
    };
    const [maximized, setMaximized] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);

    const canDrag = draggable && typeof window !== "undefined" && window.innerWidth >= 900;
    const ownMaximize = !onMaximize;

    // Esc restores a maximized window
    useEffect(() => {
        if (!maximized) return;
        const onKey = (e) => { if (e.key === "Escape") setMaximized(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [maximized]);

    const toggleMaximize = () => {
        if (onMaximize) { onMaximize(); return; }
        setMinimized(false);
        setMaximized(m => !m);
    };

    const minimize = () => {
        setMaximized(false);
        if (onMinimize) { onMinimize(); return; }
        setMinimized(m => !m);
    };

    const onTitleMouseDown = (e) => {
        if (e.button !== 0 || e.target.closest(".xp-title-btn")) return;
        if (!canDrag && !maximized) return;
        e.preventDefault();
        const wasMax = maximized;
        const start = { x: e.clientX, y: e.clientY, ox: wasMax ? 0 : offset.x, oy: wasMax ? 0 : offset.y };
        let restored = !wasMax;
        setDragging(true);
        const onMove = (ev) => {
            const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
            if (!restored) {
                // pulling a maximized window restores it, then it follows the cursor
                if (Math.abs(dx) + Math.abs(dy) < 6) return;
                restored = true;
                setMaximized(false);
                if (!canDrag) return;
            }
            if (canDrag) setOffset({ x: start.ox + dx, y: start.oy + dy });
        };
        const onUp = () => {
            setDragging(false);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    const onTitleDoubleClick = (e) => {
        if (e.target.closest(".xp-title-btn")) return;
        if (ownMaximize) toggleMaximize();
        else if (canDrag) setOffset({ x: 0, y: 0 });
    };

    const moved = !maximized && (offset.x !== 0 || offset.y !== 0);

    const btn = (label, glyph, onClick, extra = "") => (
        <span
            className={`xp-title-btn ${extra}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            title={label}
            onClick={onClick}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
        >{glyph}</span>
    );

    return (
        <>
            {maximized && !minimized && !hidden && <div className="xp-backdrop" onClick={() => setMaximized(false)} aria-hidden="true" />}
            <section
                id={id}
                className={`xp-window${minimized ? " is-rolled-up" : ""}${dragging ? " is-dragging" : ""}${moved ? " is-moved" : ""}${maximized ? " is-maximized" : ""} ${className}`}
                style={{ ...style, ...(moved ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : null), ...(hidden ? { display: "none" } : null) }}
                aria-label={title}
            >
                <div
                    className={`xp-window-title${!staticChrome && (canDrag || maximized) ? " is-draggable" : ""}`}
                    onMouseDown={staticChrome ? undefined : onTitleMouseDown}
                    onDoubleClick={staticChrome ? undefined : onTitleDoubleClick}
                >
                    <span className="xp-window-title-text">{title}</span>
                    {staticChrome ? (
                        <div className="xp-window-btns" aria-hidden="true">
                            <span className="xp-title-btn">—</span>
                            <span className="xp-title-btn">□</span>
                            <span className="xp-title-btn xp-title-btn--close">✕</span>
                        </div>
                    ) : (
                    <div className="xp-window-btns">
                        {collapsible
                            ? btn(minimized ? "Restore" : "Minimize", "—", minimize)
                            : <span className="xp-title-btn" aria-hidden="true">—</span>}
                        {btn(maximized ? "Restore size" : maximizeLabel, maximized ? "❐" : "□", toggleMaximize)}
                        {btn("Close", "✕", close, "xp-title-btn--close")}
                    </div>
                    )}
                </div>
                {!minimized && <div className={`xp-window-body ${bodyClassName}`}>{children}</div>}
            </section>
        </>
    );
}
