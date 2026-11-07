import { useEffect, useId, useRef, useState } from "react";
import { pageTaskbar } from "./mapTaskbarStore";

/**
 * Shared XP-style window for normal pages.
 *  — "—" minimizes to the taskbar along the bottom of the screen (or runs onMinimize when given)
 *  — "□" maximizes: runs onMaximize when given (e.g. open the full map), otherwise the window fills
 *    the screen; ❐, Esc, a double-click on the title or clicking outside restores it
 *  — "✕" runs onClose when given
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
}) {
    const [minimized, setMinimized] = useState(false);
    const uid = useId();
    const taskKey = useRef(`page-${uid}`);
    const [maximized, setMaximized] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);

    const canDrag = draggable && typeof window !== "undefined" && window.innerWidth >= 900;
    const ownMaximize = !onMaximize;

    // Minimized windows wait on the page taskbar until restored; leaving the page clears them
    useEffect(() => {
        const key = taskKey.current;
        if (minimized) pageTaskbar.add({ key, title, restore: () => setMinimized(false) });
        else pageTaskbar.remove(key);
    }, [minimized, title]);
    useEffect(() => () => pageTaskbar.remove(taskKey.current), []);

    // Esc restores a maximized window
    useEffect(() => {
        if (!maximized) return;
        const onKey = (e) => { if (e.key === "Escape") setMaximized(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [maximized]);

    const toggleMaximize = () => {
        if (onMaximize) { onMaximize(); return; }
        setMaximized(m => !m);
    };

    const minimize = () => {
        setMaximized(false);
        if (onMinimize) { onMinimize(); return; }
        setMinimized(true);
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
            {maximized && !minimized && <div className="xp-backdrop" onClick={() => setMaximized(false)} aria-hidden="true" />}
            <section
                id={id}
                className={`xp-window${dragging ? " is-dragging" : ""}${moved ? " is-moved" : ""}${maximized ? " is-maximized" : ""} ${className}`}
                style={{ ...style, ...(moved ? { transform: `translate(${offset.x}px, ${offset.y}px)` } : null), ...(minimized ? { display: "none" } : null) }}
                aria-label={title}
            >
                <div
                    className={`xp-window-title${canDrag || maximized ? " is-draggable" : ""}`}
                    onMouseDown={onTitleMouseDown}
                    onDoubleClick={onTitleDoubleClick}
                >
                    <span className="xp-window-title-text">{title}</span>
                    <div className="xp-window-btns">
                        {collapsible
                            ? btn("Minimize", "—", minimize)
                            : <span className="xp-title-btn" aria-hidden="true">—</span>}
                        {btn(maximized ? "Restore size" : maximizeLabel, maximized ? "❐" : "□", toggleMaximize)}
                        {onClose
                            ? btn("Close", "✕", onClose, "xp-title-btn--close")
                            : <span className="xp-title-btn xp-title-btn--close" aria-hidden="true">✕</span>}
                    </div>
                </div>
                <div className={`xp-window-body ${bodyClassName}`}>{children}</div>
            </section>
        </>
    );
}
