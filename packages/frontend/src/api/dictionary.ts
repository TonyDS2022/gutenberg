import { apiClient } from './client';

export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  source: string;
}

export interface DictionaryLookupResult {
  word: string;
  definitions: DictionaryDefinition[];
  success: boolean;
  error?: string;
}

export interface DictionaryProvidersResponse {
  providers: string[];
  isConfigured: boolean;
}

export const dictionaryApi = {
  lookup: async (word: string): Promise<DictionaryLookupResult> => {
    const response = await apiClient.get(`/dictionary/${encodeURIComponent(word)}`);
    return response.data;
  },

  getProviders: async (): Promise<DictionaryProvidersResponse> => {
    const response = await apiClient.get('/dictionary');
    return response.data;
  },
};
