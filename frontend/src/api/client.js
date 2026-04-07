import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8000",
});

export async function fetchMapPoints(dims = 2) {
    const response = await api.get(`/map/points?dims=${dims}`);
    return response.data;
}
