import apiClient from "./client";
import type { 
  ApiKeyResponse, 
  CreateApiKeyRequest, 
  NewApiKeyResponse 
} from "../types";

export const apiKeysApi = {
  getKeys: async (): Promise<ApiKeyResponse[]> => {
    const res = await apiClient.get("/api-keys");
    return res.data;
  },

  createKey: async (data: CreateApiKeyRequest): Promise<NewApiKeyResponse> => {
    const res = await apiClient.post("/api-keys", data);
    return res.data;
  },

  revokeKey: async (id: string): Promise<void> => {
    await apiClient.delete(`/api-keys/${id}`);
  },
};
