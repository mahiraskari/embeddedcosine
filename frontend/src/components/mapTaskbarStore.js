/*
 * Tiny shared stores for minimized windows. A window adds itself when minimized and removes
 * itself when restored, closed, or unmounted; a taskbar component shows what is waiting.
 *   taskbar      — floating windows over the map
 *   pageTaskbar  — XP windows and dataset cards on normal pages (shown along the bottom of the screen)
 */
function createTaskbarStore() {
    let items = [];
    const listeners = new Set();
    const emit = () => listeners.forEach(fn => fn());
    return {
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
}

export const taskbar = createTaskbarStore();
export const pageTaskbar = createTaskbarStore();
