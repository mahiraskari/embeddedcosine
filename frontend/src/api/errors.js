/*
 * Turn a failed request into a clear message for people, based on what actually happened.
 * Used everywhere the site talks to the backend so errors read the same way.
 */
export const OFFLINE_MESSAGE =
    "Can't reach the backend. Make sure it is running: open a terminal in backend/ and run  uvicorn main:app --reload";

export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
    // no response at all: the server is down, unreachable, or the connection dropped
    if (!err?.response) {
        if (err?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
        return OFFLINE_MESSAGE;
    }
    const { status, data } = err.response;
    const detail = typeof data?.detail === "string" ? data.detail : null;
    if (status === 429) return "Too many requests. Please wait a minute and try again.";
    if (status === 413) return detail || "That file is too large.";
    if (status >= 500)  return "The server had a problem handling that. Please try again in a moment.";
    return detail || fallback;
}
