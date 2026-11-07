import { useSyncExternalStore } from "react";
import { closedWindows } from "./closedWindows";

// XP-style bar along the bottom of the screen holding windows closed with ✕; click one to reopen it
export default function ClosedWindowsBar() {
    const list = useSyncExternalStore(closedWindows.subscribe, closedWindows.snapshot);
    if (list.length === 0) return null;
    return (
        <div className="page-taskbar" role="toolbar" aria-label="Closed windows">
            {list.map(item => (
                <button key={item.key} className="page-taskbar-item" onClick={item.restore} title={`Reopen ${item.title}`}>
                    {item.title}
                </button>
            ))}
        </div>
    );
}
