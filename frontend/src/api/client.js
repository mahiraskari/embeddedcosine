import axios from "axios";
import { supabase } from "../supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_URL,
    timeout: 8000,
});

// Attach the Supabase JWT to every request so the backend can verify the user.
// Demo endpoints ignore it if present; protected endpoints require it.
api.interceptors.request.use(async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
});

// If any request comes back 401, the session has expired — send the user back to login.
api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            window.location.href = "/?login=true";
        }
        return Promise.reject(err);
    }
);

export async function fetchDemoPoints(dims = 2) {
    const response = await api.get(`/demo/points?dims=${dims}`);
    return response.data;
}

export async function fetchProjectPoints(projectId, dims = 2) {
    const response = await api.get(`/map/points?project_id=${projectId}&dims=${dims}`);
    return response.data;
}

export async function searchGames(query, k = 10, demo = false, projectId = null) {
    const body = { query, k, demo };
    if (projectId) body.project_id = projectId;
    const response = await api.post("/search", body, { timeout: 30000 });
    return response.data;
}

export async function fetchProjects() {
    const response = await api.get("/projects");
    return response.data;
}

export async function renameProject(id, name) {
    const response = await api.patch(`/projects/${id}`, { name });
    return response.data;
}

export async function deleteProject(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
}

export async function fetchProjectPreview(id) {
    const response = await api.get(`/projects/${id}/preview`);
    return response.data;
}

export async function fetchProjectMeta(id) {
    const response = await api.get(`/projects/${id}/meta`);
    return response.data;
}

export async function fetchDemoMeta() {
    const response = await api.get("/demo/meta");
    return response.data;
}

export async function uploadDataset(file, onProgress) {
    const form = new FormData();
    form.append("file", file);
    const response = await api.post("/dataset/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
        onUploadProgress: (e) => {
            if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
        },
    });
    return response.data;
}

export async function configureDataset(name_col, embed_cols, project_name) {
    const response = await api.post("/dataset/configure", { name_col, embed_cols, project_name });
    return response.data;
}

export async function computeSimilarity(nameA, nameB, demo = false, projectId = null) {
    const body = { name_a: nameA, name_b: nameB, demo };
    if (projectId) body.project_id = projectId;
    const response = await api.post("/search/similarity", body, { timeout: 15000 });
    return response.data;
}

// EventSource doesn't support custom headers, so the token is passed as a query param for the SSE endpoint.
export async function getPipelineStreamURL() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? "";
    return `${API_URL}/dataset/pipeline/stream?token=${token}`;
}
