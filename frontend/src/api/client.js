import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8000",
    timeout: 8000,
});

export async function fetchMapPoints(dims = 2) {
    const response = await api.get(`/map/points?dims=${dims}`);
    return response.data;
}

export async function fetchDemoPoints(dims = 2) {
    const response = await api.get(`/demo/points?dims=${dims}`);
    return response.data;
}

export async function searchGames(query, k = 10, demo = false) {
    const response = await api.post("/search", { query, k, demo }, { timeout: 30000 });
    return response.data;
}

export async function fetchDatasetStatus() {
    const response = await api.get("/dataset/status");
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

export async function configureDataset(name_col, embed_cols) {
    const response = await api.post("/dataset/configure", { name_col, embed_cols });
    return response.data;
}

export const PIPELINE_STREAM_URL = "http://localhost:8000/dataset/pipeline/stream";
