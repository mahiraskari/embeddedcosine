import { useSyncExternalStore } from "react";
import { taskbar } from "./mapTaskbarStore";

// XP-style taskbar showing minimized windows. Defaults to the map's; pass store + variant="page"
// for the one fixed along the bottom of normal pages.
export default function MapTaskbar({ store = taskbar, variant = "map" }) {
    const list = useSyncExternalStore(store.subscribe, store.snapshot);
    if (list.length === 0) return null;
    return (
        <div
            className={variant === "page" ? "page-taskbar" : "map-taskbar"}
            data-panel
            role="toolbar"
            aria-label="Minimized windows"
        >
            {list.map(item => (
                <button
                    key={item.key}
                    className="map-taskbar-item"
                    onClick={item.restore}
                    title={`Restore ${item.title}`}
                >
                    {item.title}
                </button>
            ))}
        </div>
    );
}
