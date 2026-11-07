/*
 * Shared store for page windows closed with ✕. A closed window waits on the bar at the
 * bottom of the screen (ClosedWindowsBar) until it is clicked to bring it back.
 * Leaving the page clears it (windows remove themselves when they unmount).
 */
let items = [];
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn());

export const closedWindows = {
    add(item) {
        items = [...items.filter(i => i.key !== item.key), item];
        emit();
    },
    remove(key) {
        if (!items.some(i => i.key === key)) return;
        items = items.filter(i => i.key !== key);
        emit();
    },
    subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
    snapshot() {
        return items;
    },
};
