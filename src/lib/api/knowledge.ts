import { apiClient } from './client';

export interface KnowledgeDocument {
  documentId: string;
  source: string;
  documentType: string;
  chunkCount: number;
  createdAt: string;
}

export interface SearchResult {
  content: string;
  documentType: string;
  source: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
}

export interface IngestionResult {
  documentId: string;
  source: string;
  documentType: string;
  chunksCreated: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

export const knowledgeApi = {
  upload: async (file: File): Promise<IngestionResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('accessToken');
    const res = await fetch(`${API_URL}/vendor/knowledge/upload`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(err.message || 'Upload failed');
    }

    return res.json();
  },

  getDocuments: () =>
    apiClient<KnowledgeDocument[]>('/vendor/knowledge', { method: 'GET' }),

  deleteDocument: (documentId: string) =>
    apiClient<{ success: boolean }>(`/vendor/knowledge/${documentId}`, { method: 'DELETE' }),

  search: (q: string) =>
    apiClient<SearchResult[]>(`/vendor/knowledge/search?q=${encodeURIComponent(q)}`, { method: 'GET' }),

  getStats: () =>
    apiClient<KnowledgeStats>('/vendor/knowledge/stats', { method: 'GET' }),
};
