import { apiClient } from './client';

export interface ParsedIncomeExpense {
  name: string;
  date: string | null;
  unit: string;
  quantity: number;
  amount: number;
  amountUsd: number | null;
  project: string;
  responsible: string;
  source: string;
}

export interface ParsedSmetaItem {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  category: string;
}

export interface ParsedMaterial {
  code: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface ParsedWorkVolume {
  rowNumber: number;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  itemType: 'WORK' | 'MACHINE' | 'MATERIAL' | 'OTHER';
}

export interface ParseResult<T> {
  success: boolean;
  type: string;
  count: number;
  data: T[];
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
}

const uploadFile = async <T>(
  endpoint: string,
  file: File,
  options?: { useAi?: boolean },
): Promise<ParseResult<T>> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.useAi) {
    formData.append('useAi', 'true');
  }

  const token = localStorage.getItem('accessToken');
  const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4001'}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Upload failed');
  }

  return response.json();
};

export const uploadApi = {
  /**
   * Auto-detect and parse Excel file
   */
  parse: (file: File) =>
    uploadFile<ParsedIncomeExpense | ParsedSmetaItem | ParsedMaterial>('/vendor/upload/parse', file),

  /**
   * Parse Income/Expense Excel
   */
  parseIncomeExpense: (file: File, useAi = false) =>
    uploadFile<ParsedIncomeExpense>('/vendor/upload/parse/income-expense', file, { useAi }),

  /**
   * Parse Smeta Items Excel
   */
  parseSmetaItems: (file: File, useAi = false) =>
    uploadFile<ParsedSmetaItem>('/vendor/upload/parse/smeta-items', file, { useAi }),

  /**
   * Parse Materials Excel
   */
  parseMaterials: (file: File) =>
    uploadFile<ParsedMaterial>('/vendor/upload/parse/materials', file),

  /**
   * Parse Work Volume Excel (ВЕДОМОСТЬ ОБЪЕМОВ РАБОТ)
   */
  parseWorkVolume: (file: File, useAi = false) =>
    uploadFile<ParsedWorkVolume>('/vendor/upload/parse/work-volume', file, { useAi }),

  /**
   * Import parsed smeta items
   */
  importSmetaItems: (smetaId: string, items: ParsedSmetaItem[]) =>
    apiClient<ImportResult>('/vendor/upload/import/smeta-items', {
      method: 'POST',
      body: JSON.stringify({ smetaId, items }),
    }),
};
