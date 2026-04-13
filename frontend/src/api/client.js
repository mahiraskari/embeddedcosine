import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
    baseURL: API_URL,
    timeout: 8000,
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
        timeout: 120000,
        onUploadProgress: (e) => {
            if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
        },
    });
    return response.data;
}

export async function configureDataset(name_col, embed_cols, project_name) {
    const response = await api.post("/dataset/configure", { name_col, embed_cols, project_name }, { timeout: 60000 });
    return response.data;
}

export async function computeSimilarity(nameA, nameB, demo = false, projectId = null) {
    const body = { name_a: nameA, name_b: nameB, demo };
    if (projectId) body.project_id = projectId;
    const response = await api.post("/search/similarity", body, { timeout: 15000 });
    return response.data;
}

export async function getPipelineStreamURL() {
    return `${API_URL}/dataset/pipeline/stream`;
}
