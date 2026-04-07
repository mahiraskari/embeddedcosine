import { useEffect, useRef, useMemo, useState } from "react";
import Plotly from "plotly.js-dist-min";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewport, Html } from "@react-three/drei";
import { Delaunay } from "d3-delaunay";
import * as THREE from "three";

const DARK = "#0f0f0f";

// ── Shared hover tooltip ──────────────────────────────────────────────────────

function TooltipCard({ point }) {
    return (
        <div style={{
            background: "rgba(10, 10, 16, 0.97)",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            borderRadius: 8,
            padding: "6px 12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.75), 0 0 0 1px rgba(99,102,241,0.08)",
            pointerEvents: "none",
            userSelect: "none",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "#f0f0f8",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
            letterSpacing: "-0.01em",
        }}>
            {point.Name}
        </div>
    );
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)))
            .toString(16).padStart(2, "0");
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function getColors(points) {
    return points.map((_, i) => {
        // Golden-angle steps remapped to teal → blue → purple → magenta (200–360°)
        const hue = 200 + (i * 137.508) % 160;
        const sat = 80 + (i * 7919) % 15;  // 80–95 — vivid on dark bg
        const lit = 55 + (i * 6271) % 20;  // 55–75 — bright enough to see
        return hslToHex(hue, sat, lit);
    });
}

function useBounds(points) {
    return useMemo(() => {
        if (!points.length) return { cx: 0, cy: 0, cz: 0, span: 10 };
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
            if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
        }
        return {
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2,
            cz: (minZ + maxZ) / 2,
            span: Math.max(maxX - minX, maxY - minY, maxZ - minZ),
        };
    }, [points]);
}

// ── 3D: left-click FPS look ───────────────────────────────────────────────────
// Intercepts left mousedown before OrbitControls (capture phase) and rotates
// the camera's look direction while keeping the eye position fixed.
// The OrbitControls target is updated so right-click orbit stays in sync.

function FPSLook({ controlsRef }) {
    const { camera, gl } = useThree();

    useEffect(() => {
        const dom = gl.domElement;
        let dragging = false, lastX = 0, lastY = 0;

        const onDown = (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            dragging = true; lastX = e.clientX; lastY = e.clientY;
        };

        const onMove = (e) => {
            if (!dragging) return;
            const dx = e.clientX - lastX, dy = e.clientY - lastY;
            lastX = e.clientX; lastY = e.clientY;

            const fwd = new THREE.Vector3();
            camera.getWorldDirection(fwd);

            // Yaw: rotate around world Y-up axis (left/right)
            const worldUp = new THREE.Vector3(0, 1, 0);
            fwd.applyQuaternion(
                new THREE.Quaternion().setFromAxisAngle(worldUp, -dx * 0.004)
            );

            // Pitch: rotate around camera's right axis (up/down), clamp near poles
            const right = new THREE.Vector3().crossVectors(fwd, worldUp).normalize();
            const pitched = fwd.clone().applyQuaternion(
                new THREE.Quaternion().setFromAxisAngle(right, -dy * 0.004)
            );
            if (Math.abs(pitched.y) < 0.98) fwd.copy(pitched);
            fwd.normalize();

            const ctrl = controlsRef.current;
            if (ctrl) {
                const dist = camera.position.distanceTo(ctrl.target);
                ctrl.target.copy(camera.position).addScaledVector(fwd, dist);
                ctrl.update();
            }
        };

        const onUp = (e) => { if (e.button === 0) dragging = false; };

        dom.addEventListener("mousedown", onDown, true);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);

        return () => {
            dom.removeEventListener("mousedown", onDown, true);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [camera, gl, controlsRef]);

    return null;
}

// ── 3D: point cloud with hover tooltip ───────────────────────────────────────

function PointCloud({ points }) {
    const [hovered, setHovered] = useState(null);
    const hideTimer = useRef(null);
    const hexColors = useMemo(() => getColors(points), [points]);

    const [positions, colors] = useMemo(() => {
        const pos = new Float32Array(points.length * 3);
        const col = new Float32Array(points.length * 3);
        const c = new THREE.Color();
        points.forEach((p, i) => {
            pos[i * 3]     = p.x;
            pos[i * 3 + 1] = p.y;
            pos[i * 3 + 2] = p.z;
            c.set(hexColors[i]);
            col[i * 3]     = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        });
        return [pos, col];
    }, [points, hexColors]);

    const hoveredPoint = hovered !== null ? points[hovered] : null;

    return (
        <>
            <points
                onPointerMove={(e) => {
                    e.stopPropagation();
                    const idx = e.intersections[0]?.index;
                    if (idx !== undefined) {
                        clearTimeout(hideTimer.current);
                        setHovered(idx);
                    }
                }}
                onPointerOut={() => {
                    hideTimer.current = setTimeout(() => setHovered(null), 120);
                }}
            >
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                    <bufferAttribute attach="attributes-color"    args={[colors, 3]}    />
                </bufferGeometry>
                <pointsMaterial
                    size={4.5}
                    vertexColors
                    sizeAttenuation={false}
                    transparent
                    opacity={0.9}
                />
            </points>

            {hoveredPoint && (
                <Html
                    position={[hoveredPoint.x, hoveredPoint.y, hoveredPoint.z]}
                    center
                    style={{ pointerEvents: "none" }}
                    zIndexRange={[100, 0]}
                >
                    <div style={{ transform: "translateY(-115%) translateX(10px)" }}>
                        <TooltipCard point={hoveredPoint} />
                    </div>
                </Html>
            )}
        </>
    );
}

// ── 3D: double-click resets camera to initial position ────────────────────────

function CameraReset({ controlsRef, cx, cy, cz, d }) {
    const { camera, gl } = useThree();
    useEffect(() => {
        const handleDblClick = () => {
            camera.position.set(cx + d, cy + d, cz + d);
            if (controlsRef.current) {
                controlsRef.current.target.set(cx, cy, cz);
                controlsRef.current.update();
            }
        };
        gl.domElement.addEventListener("dblclick", handleDblClick);
        return () => gl.domElement.removeEventListener("dblclick", handleDblClick);
    }, [camera, gl, controlsRef, cx, cy, cz, d]);
    return null;
}

function Scene3D({ points }) {
    const { cx, cy, cz, span } = useBounds(points);
    const d = span * 0.75;
    const controlsRef = useRef();

    return (
        <Canvas
            camera={{ position: [cx + d, cy + d, cz + d], fov: 50, near: 0.01, far: 10000 }}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            raycaster={{ params: { Points: { threshold: span * 0.003 } } }}
            style={{ width: "100%", height: "100%" }}
        >
            <color attach="background" args={[DARK]} />
            <PointCloud points={points} />
            <OrbitControls
                ref={controlsRef}
                makeDefault
                target={[cx, cy, cz]}
                mouseButtons={{
                    LEFT:   THREE.MOUSE.PAN,
                    MIDDLE: THREE.MOUSE.DOLLY,
                    RIGHT:  THREE.MOUSE.ROTATE,
                }}
                enablePan={false}
                zoomSpeed={0.8}
                rotateSpeed={0.7}
            />
            <FPSLook controlsRef={controlsRef} />
            <CameraReset controlsRef={controlsRef} cx={cx} cy={cy} cz={cz} d={d} />
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                <GizmoViewport
                    axisColors={["#f87171", "#4ade80", "#60a5fa"]}
                    labelColor="#ffffff"
                />
            </GizmoHelper>
        </Canvas>
    );
}

// ── 2D: Plotly scattergl + Voronoi background ─────────────────────────────────

function Scene2D({ points, showVoronoi }) {
    const mainRef        = useRef(null);
    const voronoiRef     = useRef(null);
    const zoomCanvasRef  = useRef(null);
    const animRef        = useRef(null);
    const prevRangeRef   = useRef(null);
    const voronoiDataRef = useRef(null);
    const canvasSizeRef  = useRef({ w: 0, h: 0 }); // cached — updated by ResizeObserver only
    const dataBoundsRef  = useRef(null);
    const showVoronoiRef = useRef(true);
    const [hovered2D, setHovered2D]     = useState(null);
    const tooltipRef                    = useRef(null);

    const drawVoronoi = () => {
        if (!showVoronoiRef.current) return;
        const fl = mainRef.current?._fullLayout;
        const vc = voronoiRef.current;
        const vd = voronoiDataRef.current;
        if (!fl || !vc || !vd) return;

        const xa = fl.xaxis, ya = fl.yaxis;
        const x0 = xa._offset,      y0 = ya._offset;
        const x1 = x0 + xa._length, y1 = y0 + ya._length;
        const { w, h } = canvasSizeRef.current;

        if (vc.width !== w)  vc.width  = w;
        if (vc.height !== h) vc.height = h;

        const toX = (d) => x0 + (d - xa.range[0]) / (xa.range[1] - xa.range[0]) * xa._length;
        const toY = (d) => y0 + (1 - (d - ya.range[0]) / (ya.range[1] - ya.range[0])) * ya._length;

        const ctx = vc.getContext("2d");
        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, y0, x1 - x0, y1 - y0);
        ctx.clip();

        // Only draw cells whose seed is within/near the viewport — culls off-screen work
        const mx = (x1 - x0) * 0.3;
        const my = (y1 - y0) * 0.3;
        const { voronoi, hexColors } = vd;

        for (let i = 0; i < points.length; i++) {
            const px = toX(points[i].x);
            const py = toY(points[i].y);
            if (px < x0 - mx || px > x1 + mx || py < y0 - my || py > y1 + my) continue;

            const cell = voronoi.cellPolygon(i);
            if (!cell || cell.length < 3) continue;
            ctx.beginPath();
            ctx.moveTo(toX(cell[0][0]), toY(cell[0][1]));
            for (let j = 1; j < cell.length; j++) ctx.lineTo(toX(cell[j][0]), toY(cell[j][1]));
            ctx.closePath();
            ctx.fillStyle   = "rgba(99,102,241,0.07)";
            ctx.fill();
            ctx.strokeStyle = "rgba(165,180,252,0.55)";
            ctx.lineWidth   = 0.7;
            ctx.stroke();
        }
        ctx.restore();
    };

    // Keep ref in sync so drawVoronoi (called from rAF) sees current toggle state
    useEffect(() => {
        showVoronoiRef.current = showVoronoi;
        if (!showVoronoi) {
            const vc = voronoiRef.current;
            if (vc) vc.getContext("2d").clearRect(0, 0, vc.width, vc.height);
        } else {
            prevRangeRef.current = null; // force redraw on next rAF tick
        }
    }, [showVoronoi]);

    useEffect(() => {
        if (!mainRef.current || !points.length) return;

        const x      = points.map(p => p.x);
        const y      = points.map(p => p.y);
        const text   = points.map(p => p.Name);
        const colors = getColors(points);

        const minX = Math.min(...x), maxX = Math.max(...x);
        const minY = Math.min(...y), maxY = Math.max(...y);
        const padX = (maxX - minX) * 0.08, padY = (maxY - minY) * 0.08;

        // Max zoom-out boundary — slightly outside the data extent
        dataBoundsRef.current = {
            minX: minX - padX, maxX: maxX + padX,
            minY: minY - padY, maxY: maxY + padY,
        };

        // Build Voronoi once in data space with large padding so boundary cells
        // aren't artificially clipped before canvas clip takes over
        const vPadX = (maxX - minX) * 2, vPadY = (maxY - minY) * 2;
        const delaunay = Delaunay.from(points, p => p.x, p => p.y);
        const voronoi  = delaunay.voronoi([minX - vPadX, minY - vPadY, maxX + vPadX, maxY + vPadY]);
        voronoiDataRef.current = { voronoi, hexColors: colors };

        // Cache canvas dimensions via ResizeObserver — avoids getBoundingClientRect in hot path
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            canvasSizeRef.current = { w: Math.round(width), h: Math.round(height) };
        });
        ro.observe(mainRef.current);
        const r0 = mainRef.current.getBoundingClientRect();
        canvasSizeRef.current = { w: Math.round(r0.width), h: Math.round(r0.height) };

        const db = dataBoundsRef.current;

        // Block scroll-out before Plotly sees it (capture phase) — no snap-back spasm
        const onWheel = (e) => {
            if (e.deltaY <= 0) return;
            const fl = mainRef.current?._fullLayout;
            if (!fl || !db) return;
            const xa = fl.xaxis, ya = fl.yaxis;
            const atMax = (xa.range[1] - xa.range[0]) >= (db.maxX - db.minX) * 0.99
                       || (ya.range[1] - ya.range[0]) >= (db.maxY - db.minY) * 0.99;
            if (atMax) { e.stopPropagation(); e.preventDefault(); }
        };
        mainRef.current.addEventListener("wheel", onWheel, { passive: false, capture: true });

        Plotly.newPlot(mainRef.current, [{
            type: "scattergl",
            mode: "markers",
            x, y, text,
            hoverinfo: "none",
            marker: {
                size: 4,
                symbol: "square",
                opacity: 0.9,
                color: colors,
            },
        }], {
            autosize: true,
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor:  "rgba(0,0,0,0)",
            dragmode: "pan",
            // Pin initial range to data bounds so doubleClick "reset" snaps here, not to autorange
            xaxis: { showgrid: false, zeroline: false, showticklabels: false, showspikes: false, range: [db.minX, db.maxX] },
            yaxis: { showgrid: false, zeroline: false, showticklabels: false, showspikes: false, range: [db.minY, db.maxY] },
            margin: { l: 0, r: 0, t: 0, b: 0 },
        }, { displayModeBar: false, responsive: true, scrollZoom: true, doubleClick: "reset" });

        // Custom 2D tooltip via Plotly hover events + mouse tracking
        const onPlotlyHover = (data) => {
            const idx = data.points[0]?.pointIndex;
            if (idx !== undefined) setHovered2D(points[idx]);
        };
        const onPlotlyUnhover = () => setHovered2D(null);
        mainRef.current.on("plotly_hover",   onPlotlyHover);
        mainRef.current.on("plotly_unhover", onPlotlyUnhover);

        const onMouseMove = (e) => {
            if (!tooltipRef.current) return;
            const rect = mainRef.current.getBoundingClientRect();
            tooltipRef.current.style.left = `${e.clientX - rect.left + 18}px`;
            tooltipRef.current.style.top  = `${e.clientY - rect.top  - 14}px`;
        };
        mainRef.current.addEventListener("mousemove", onMouseMove);

        // rAF loop — redraws only when axis range actually changes
        const loop = () => {
            const fl = mainRef.current?._fullLayout;
            if (fl) {
                const xa = fl.xaxis, ya = fl.yaxis;
                const key = `${xa.range[0]},${xa.range[1]},${ya.range[0]},${ya.range[1]},${xa._length}`;
                if (key !== prevRangeRef.current) {
                    prevRangeRef.current = key;
                    drawVoronoi();
                }
            }
            animRef.current = requestAnimationFrame(loop);
        };
        animRef.current = requestAnimationFrame(loop);

        const zc = zoomCanvasRef.current;
        let zoomStart = null;

        const syncZoom = () => {
            if (!zc || !mainRef.current) return;
            const { w, h } = canvasSizeRef.current;
            zc.width = w; zc.height = h;
        };
        syncZoom();

        const onRightDown = (e) => {
            if (e.button !== 2) return;
            e.preventDefault();
            syncZoom();
            const r = mainRef.current.getBoundingClientRect();
            zoomStart = { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        const onRightMove = (e) => {
            if (!zoomStart || !(e.buttons & 2)) return;
            const r   = mainRef.current.getBoundingClientRect();
            const cur = { x: e.clientX - r.left, y: e.clientY - r.top };
            syncZoom();
            const ctx = zc.getContext("2d");
            ctx.clearRect(0, 0, zc.width, zc.height);
            const x0 = Math.min(zoomStart.x, cur.x), y0 = Math.min(zoomStart.y, cur.y);
            const bw = Math.abs(cur.x - zoomStart.x), bh = Math.abs(cur.y - zoomStart.y);
            ctx.fillStyle   = "rgba(99,102,241,0.08)";
            ctx.fillRect(x0, y0, bw, bh);
            ctx.strokeStyle = "#6366f1";
            ctx.lineWidth   = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(x0, y0, bw, bh);
        };

        const onRightUp = (e) => {
            if (!zoomStart || e.button !== 2) return;
            const r   = mainRef.current.getBoundingClientRect();
            const end = { x: e.clientX - r.left, y: e.clientY - r.top };
            if (zc) zc.getContext("2d").clearRect(0, 0, zc.width, zc.height);
            if (Math.abs(end.x - zoomStart.x) < 8 || Math.abs(end.y - zoomStart.y) < 8) {
                zoomStart = null; return;
            }
            const fl = mainRef.current._fullLayout;
            if (fl) {
                const xa = fl.xaxis, ya = fl.yaxis;
                const toX = (px) => xa.range[0] + (px - xa._offset) / xa._length * (xa.range[1] - xa.range[0]);
                const toY = (py) => ya.range[1] - (py - ya._offset) / ya._length * (ya.range[1] - ya.range[0]);
                Plotly.relayout(mainRef.current, {
                    "xaxis.range": [Math.min(toX(zoomStart.x), toX(end.x)), Math.max(toX(zoomStart.x), toX(end.x))],
                    "yaxis.range": [Math.min(toY(zoomStart.y), toY(end.y)), Math.max(toY(zoomStart.y), toY(end.y))],
                });
            }
            zoomStart = null;
        };

        const onContextMenu = (e) => e.preventDefault();
        mainRef.current.addEventListener("mousedown",   onRightDown);
        window.addEventListener("mousemove",  onRightMove);
        window.addEventListener("mouseup",    onRightUp);
        mainRef.current.addEventListener("contextmenu", onContextMenu);

        return () => {
            cancelAnimationFrame(animRef.current);
            ro.disconnect();
            if (mainRef.current) {
                mainRef.current.removeEventListener("mousedown",   onRightDown);
                mainRef.current.removeEventListener("contextmenu", onContextMenu);
                mainRef.current.removeEventListener("wheel",       onWheel, { capture: true });
                mainRef.current.removeEventListener("mousemove",   onMouseMove);
                Plotly.purge(mainRef.current);
            }
            window.removeEventListener("mousemove", onRightMove);
            window.removeEventListener("mouseup",   onRightUp);
        };
    }, [points]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative", background: DARK }}>
            <canvas ref={voronoiRef}    style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />
            <div   ref={mainRef}        style={{ position: "absolute", inset: 0, zIndex: 1 }} />
            <canvas ref={zoomCanvasRef} style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }} />
            <div ref={tooltipRef} style={{
                position: "absolute",
                zIndex: 20,
                pointerEvents: "none",
                display: hovered2D ? "block" : "none",
                left: 0,
                top: 0,
            }}>
                {hovered2D && <TooltipCard point={hovered2D} />}
            </div>
        </div>
    );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function MapView({ points, dims, showVoronoi }) {
    if (!points || points.length === 0) {
        return <div className="map-empty">No data loaded.</div>;
    }
    return dims === 3
        ? <Scene3D points={points} />
        : <Scene2D points={points} showVoronoi={showVoronoi} />;
}
