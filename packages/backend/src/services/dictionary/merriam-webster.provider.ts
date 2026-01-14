import axios from 'axios';
import type { DictionaryProvider, DictionaryLookupResult, DictionaryDefinition } from './dictionary.interface';

export class MerriamWebsterProvider implements DictionaryProvider {
  name = 'merriam-webster';
  private apiKey: string;
  private baseUrl = 'https://dictionaryapi.com/api/v3/references/collegiate/json';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async lookup(word: string): Promise<DictionaryLookupResult> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${encodeURIComponent(word)}?key=${this.apiKey}`
      );

      const data = response.data;

      // Merriam-Webster returns an array of strings if word not found (suggestions)
      if (data.length === 0) {
        return {
          word,
          definitions: [],
          success: false,
          error: 'Word not found',
        };
      }

      if (typeof data[0] === 'string') {
        // API returned suggestions instead of definitions
        const suggestions = data.slice(0, 5).join(', ');
        return {
          word,
          definitions: [],
          success: false,
          error: `Word not found. Did you mean: ${suggestions}?`,
        };
      }

      // Parse definitions from Merriam-Webster response
      const definitions: DictionaryDefinition[] = [];

      for (const entry of data.slice(0, 3)) {
        const partOfSpeech = entry.fl || 'unknown';
        const phonetic = entry.hwi?.prs?.[0]?.mw;

        // shortdef contains simplified definitions
        const shortDefs = entry.shortdef || [];

        for (const def of shortDefs.slice(0, 2)) {
          definitions.push({
            word,
            partOfSpeech,
            definition: def,
            phonetic,
            source: this.name,
          });
        }

        // Try to extract an example from the full definition structure
        if (definitions.length > 0 && entry.def?.[0]?.sseq?.[0]?.[0]?.[1]?.dt) {
          const dt = entry.def[0].sseq[0][0][1].dt;
          for (const item of dt) {
            if (Array.isArray(item) && item[0] === 'vis' && item[1]?.[0]?.t) {
              // Clean up the example text (remove markup)
              const example = item[1][0].t
                .replace(/\{it\}/g, '')
                .replace(/\{\/it\}/g, '')
                .replace(/\{[^}]+\}/g, '');
              definitions[0].example = example;
              break;
            }
          }
        }
      }

      return {
        word,
        definitions,
        success: definitions.length > 0,
        error: definitions.length === 0 ? 'No definitions found' : undefined,
      };
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return {
            word,
            definitions: [],
            success: false,
            error: 'Word not found',
          };
        }
        if (error.response?.status === 401 || error.response?.status === 403) {
          return {
            word,
            definitions: [],
            success: false,
            error: 'Invalid API key',
          };
        }
      }

      return {
        word,
        definitions: [],
        success: false,
        error: error.message || 'Failed to fetch definition',
      };
    }
  }
}
