import axios from "axios";
import { supabase } from "../supabase";

const api = axios.create({
    baseURL: "http://localhost:8000",
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
    return `http://localhost:8000/dataset/pipeline/stream?token=${token}`;
}
