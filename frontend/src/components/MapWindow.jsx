import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { closedWindows } from "./closedWindows";

// Shared stacking order so the window you touch last sits on top
let topZ = 60;

// Where each window was last left (by id), so reopening or switching content never makes it jump
const memory = {};

const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

/**
 * Floating XP window used over the map (details, compare, controls, results).
 *  — drag by the title bar, double-click it to maximize / restore;
 *    dragging a maximized window restores it under the cursor, like Windows
 *  — resize from any edge or corner (the dotted grip marks the bottom-right corner)
 *  — "—" rolls the window up to its title bar (press again to open), "□" fills the map,
 *    "✕" sends it to the bar at the bottom of the screen (click it there to bring it back)
 *  — when revealKey changes (new point clicked, new search) a hidden window comes back by itself
 *  — when the content needs more room (details -> compare) it widens in place,
 *    and goes back to its previous width when the content shrinks again
 * Position and size are kept inside the parent (the map container).
 */
export default function MapWindow({
    title,
    titleExtra,
    children,
    defaultWidth = 380,
    defaultHeight = 460,
    minWidth = 260,
    minHeight = 160,
    anchor = "left",          // "left" | "right" | "center" — where it first opens
    offset = { x: 16, y: 16 },
    id,                       // windows with an id remember their position and size
    revealKey,                // change this to bring a window back from the bottom bar
}) {
    const ref = useRef(null);
    const [pos, setPos]             = useState({ x: offset.x, y: offset.y });
    const [size, setSize]           = useState({ w: defaultWidth, h: defaultHeight });
    const [minimized, setMinimized] = useState(false);
    const [hidden, setHidden]       = useState(false);
    const uid = useId();
    const closeKey = `map-${uid}`;
    const [maximized, setMaximized] = useState(false);
    const [z, setZ]                 = useState(() => ++topZ);
    const action  = useRef(null);
    const baseW   = useRef(null);   // width before the window widened for bigger content
    const lastDef = useRef(defaultWidth);
    const initialPos = useRef(pos);  // the placeholder position before the window is placed
    const sizeRef = useRef(size);
    useEffect(() => { sizeRef.current = size; }, [size]);

    const parentBox = () => {
        const p = ref.current?.offsetParent;
        return { w: p?.clientWidth ?? window.innerWidth, h: p?.clientHeight ?? window.innerHeight };
    };

    // First open: restore where this window was left, otherwise place it by its anchor
    useLayoutEffect(() => {
        const { w: pw, h: ph } = parentBox();
        const saved = id && memory[id];
        if (saved) {
            let w = saved.size.w;
            if (defaultWidth > saved.forWidth) { baseW.current = w; w = Math.max(w, defaultWidth); }
            else if (defaultWidth < saved.forWidth) { w = saved.baseW ?? defaultWidth; }
            else { baseW.current = saved.baseW; }
            w = Math.min(w, pw - 16);
            const restored = {
                pos:  { x: Math.max(0, Math.min(saved.pos.x, pw - w - 8)), y: Math.max(0, Math.min(saved.pos.y, ph - 40)) },
                size: { w, h: Math.min(saved.size.h, ph - 16) },
            };
            setSize(restored.size);
            setPos(restored.pos);
            setMaximized(saved.maximized);
            memory[id] = { ...saved, ...restored, forWidth: defaultWidth, baseW: baseW.current };
            return;
        }
        const w = Math.min(defaultWidth, pw - 32);
        const h = Math.min(defaultHeight, ph - 32);
        setSize({ w, h });
        const x = anchor === "right" ? Math.max(16, pw - w - offset.x)
                : anchor === "center" ? Math.max(16, Math.round((pw - w) / 2))
                : offset.x;
        setPos({ x, y: offset.y });
        if (id) memory[id] = { pos: { x, y: offset.y }, size: { w, h }, maximized: false, forWidth: defaultWidth, baseW: null };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Content changed size (details <-> compare): widen in place, or go back to the earlier width
    useEffect(() => {
        const prev = lastDef.current;
        lastDef.current = defaultWidth;
        if (prev === defaultWidth) return;
        const { w: pw } = parentBox();
        if (defaultWidth > prev) {
            setSize(sz => {
                if (sz.w >= defaultWidth) return sz;
                baseW.current = sz.w;
                const w = Math.min(defaultWidth, pw - 16);
                setPos(p => ({ ...p, x: Math.max(8, Math.min(p.x, pw - w - 8)) }));
                return { ...sz, w };
            });
        } else {
            const back = baseW.current;
            baseW.current = null;
            if (back) setSize(sz => ({ ...sz, w: Math.max(minWidth, back) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultWidth]);

    // ✕ parks the window on the bottom bar; clicking it there (or new content) brings it back
    useEffect(() => {
        if (hidden) closedWindows.add({ key: closeKey, title, restore: () => { setHidden(false); setZ(++topZ); } });
        else closedWindows.remove(closeKey);
    }, [hidden, title, closeKey]);
    useEffect(() => () => closedWindows.remove(closeKey), [closeKey]);
    const lastReveal = useRef(revealKey);
    useEffect(() => {
        if (lastReveal.current === revealKey) return;
        lastReveal.current = revealKey;
        setHidden(false);
        setZ(++topZ);
    }, [revealKey]);

    // Remember the latest placement
    useEffect(() => {
        if (!id || pos === initialPos.current) return;   // not placed yet, so nothing worth remembering
        memory[id] = { pos, size, maximized, forWidth: defaultWidth, baseW: baseW.current };
    }, [id, pos, size, maximized, defaultWidth]);

    useEffect(() => {
        const onMove = (e) => {
            const a = action.current;
            if (!a) return;
            const dx = e.clientX - a.startX, dy = e.clientY - a.startY;
            const { w: pw, h: ph } = parentBox();
            if (a.type === "unmax") {
                // pulling a maximized window: once it moves a few pixels, restore it under the cursor
                if (Math.abs(dx) + Math.abs(dy) < 6) return;
                const rect = ref.current?.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
                const w = sizeRef.current.w;
                const x = Math.min(Math.max(0, e.clientX - rect.left - a.ratio * w), Math.max(0, pw - 80));
                const y = Math.min(Math.max(0, e.clientY - rect.top - 15), Math.max(0, ph - 30));
                setMaximized(false);
                setPos({ x, y });
                action.current = { type: "move", startX: e.clientX, startY: e.clientY, x, y };
                return;
            }
            if (a.type === "move") {
                setPos({
                    x: Math.min(Math.max(0, a.x + dx), Math.max(0, pw - 80)),
                    y: Math.min(Math.max(0, a.y + dy), Math.max(0, ph - 30)),
                });
                return;
            }
            // resize from an edge / corner, keeping the window inside the map
            let { x, y, w, h } = a;
            if (a.dir.includes("e")) w = Math.min(Math.max(minWidth, a.w + dx), pw - a.x);
            if (a.dir.includes("s")) h = Math.min(Math.max(minHeight, a.h + dy), ph - a.y);
            if (a.dir.includes("w")) {
                const nx = Math.min(Math.max(0, a.x + dx), a.x + a.w - minWidth);
                w = a.w + (a.x - nx); x = nx;
            }
            if (a.dir.includes("n")) {
                const ny = Math.min(Math.max(0, a.y + dy), a.y + a.h - minHeight);
                h = a.h + (a.y - ny); y = ny;
            }
            baseW.current = null;   // the user picked a size, so keep it
            setPos({ x, y });
            setSize({ w, h });
        };
        const onUp = () => { action.current = null; document.body.style.userSelect = ""; document.body.style.cursor = ""; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bringToFront = () => { if (z !== topZ) setZ(++topZ); };

    const startMove = (e) => {
        if (e.button !== 0 || e.target.closest(".xp-title-btn")) return;
        e.preventDefault();
        document.body.style.userSelect = "none";
        if (maximized) {
            const r = ref.current.getBoundingClientRect();
            action.current = { type: "unmax", startX: e.clientX, startY: e.clientY, ratio: (e.clientX - r.left) / r.width };
            return;
        }
        action.current = { type: "move", startX: e.clientX, startY: e.clientY, x: pos.x, y: pos.y };
    };

    const startResize = (dir) => (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        bringToFront();
        document.body.style.userSelect = "none";
        document.body.style.cursor = getComputedStyle(e.currentTarget).cursor;
        action.current = { type: "resize", dir, startX: e.clientX, startY: e.clientY, x: pos.x, y: pos.y, w: size.w, h: size.h };
    };

    const box = maximized
        ? { left: 8, top: 8, width: "calc(100% - 16px)", height: "calc(100% - 16px)" }
        : { left: pos.x, top: pos.y, width: size.w, height: size.h };

    const btn = (label, glyph, onClick, extra = "") => (
        <span
            className={`xp-title-btn ${extra}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            title={label}
            onMouseDown={e => e.stopPropagation()}
            onClick={onClick}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick())}
        >{glyph}</span>
    );

    const resizable = !maximized && !minimized;

    return (
        <div
            ref={ref}
            data-panel
            className={`map-window${maximized ? " is-maximized" : ""}`}
            style={{ ...box, zIndex: z, ...(minimized ? { height: "auto" } : null), ...(hidden ? { display: "none" } : null) }}
            onMouseDown={bringToFront}
        >
            <div
                data-drag-handle
                className="map-window-title"
                onMouseDown={startMove}
                onDoubleClick={e => { if (!e.target.closest(".xp-title-btn")) { setMinimized(false); setMaximized(m => !m); } }}
            >
                <span className="map-window-title-text">{title}</span>
                {titleExtra}
                <div className="xp-window-btns" style={{ marginLeft: "auto" }}>
                    {btn(minimized ? "Restore" : "Minimize", "—", () => setMinimized(m => !m))}
                    {btn(maximized ? "Restore size" : "Maximize", maximized ? "❐" : "□", () => { setMinimized(false); setMaximized(m => !m); })}
                    {btn("Close", "✕", () => { setMaximized(false); setHidden(true); }, "xp-title-btn--close")}
                </div>
            </div>
            {!minimized && <>
                <div className="map-window-body">{children}</div>
                {/* XP status strip, which holds the resize grip clear of any scrollbar */}
                <div className="map-window-status">
                    {resizable && <div className="map-window-grip" onMouseDown={startResize("se")} title="Drag to resize" aria-hidden="true" />}
                </div>
            </>}
            {resizable && EDGES.map(d => (
                <div key={d} className={`map-window-edge map-window-edge--${d}`} onMouseDown={startResize(d)} aria-hidden="true" />
            ))}
        </div>
    );
}
