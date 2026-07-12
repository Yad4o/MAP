import apiClient from "./client";
import type { ProviderKeyResponse, SetProviderKeyRequest } from "../types";

export const providerKeysApi = {
  getKeys: async (): Promise<ProviderKeyResponse[]> => {
    const res = await apiClient.get("/provider-keys");
    return res.data;
  },

  setKey: async (data: SetProviderKeyRequest): Promise<ProviderKeyResponse> => {
    const res = await apiClient.put("/provider-keys", data);
    return res.data;
  },

  deleteKey: async (provider: string): Promise<void> => {
    await apiClient.delete(`/provider-keys/${provider}`);
  },
};
