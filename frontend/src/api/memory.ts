import apiClient from "./client";
import type { 
  MemorySearchResult 
} from "../types";

export const memoryApi = {
  getStats: async (): Promise<{ count: number }> => {
    const res = await apiClient.get("/agents/memory/stats");
    return res.data;
  },

  search: async (query: string): Promise<MemorySearchResult[]> => {
    const res = await apiClient.get("/agents/memory/search", {
      params: { q: query },
    });
    return res.data;
  },

  deleteAll: async (): Promise<void> => {
    await apiClient.delete("/agents/memory");
  },
};
