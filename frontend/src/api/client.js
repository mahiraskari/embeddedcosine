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

export async function configureDataset(name_col, text_col) {
    const response = await api.post("/dataset/configure", { name_col, text_col });
    return response.data;
}

export async function runPipeline() {
    const response = await api.post("/dataset/pipeline", {}, { timeout: 60 * 60 * 1000 });
    return response.data;
}
