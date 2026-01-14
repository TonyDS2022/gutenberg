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

export interface DictionaryProvider {
  name: string;
  lookup(word: string): Promise<DictionaryLookupResult>;
}
