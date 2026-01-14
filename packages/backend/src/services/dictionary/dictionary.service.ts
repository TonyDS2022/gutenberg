import type { DictionaryProvider, DictionaryLookupResult } from './dictionary.interface';
import { MerriamWebsterProvider } from './merriam-webster.provider';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

class DictionaryService {
  private providers: Map<string, DictionaryProvider> = new Map();
  private defaultProvider: string;

  constructor() {
    // Register providers based on available API keys
    if (env.MERRIAM_WEBSTER_API_KEY) {
      this.providers.set('merriam-webster', new MerriamWebsterProvider(env.MERRIAM_WEBSTER_API_KEY));
    }

    // Set default provider from env or fallback
    this.defaultProvider = env.DICTIONARY_PROVIDER || 'merriam-webster';
  }

  async lookup(word: string, providerName?: string): Promise<DictionaryLookupResult> {
    const provider = this.providers.get(providerName || this.defaultProvider);

    if (!provider) {
      throw new AppError(503, 'Dictionary service not configured. Please set MERRIAM_WEBSTER_API_KEY.');
    }

    // Normalize word: trim and lowercase for lookup
    const normalizedWord = word.trim().toLowerCase();

    if (!normalizedWord || normalizedWord.length === 0) {
      return {
        word,
        definitions: [],
        success: false,
        error: 'Empty word provided',
      };
    }

    // Only lookup single words (take first word if multiple)
    const singleWord = normalizedWord.split(/\s+/)[0].replace(/[^a-zA-Z'-]/g, '');

    if (!singleWord) {
      return {
        word,
        definitions: [],
        success: false,
        error: 'No valid word found in selection',
      };
    }

    return provider.lookup(singleWord);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isConfigured(): boolean {
    return this.providers.size > 0;
  }
}

export const dictionaryService = new DictionaryService();
