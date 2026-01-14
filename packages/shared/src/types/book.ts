export interface BookAuthor {
  name: string;
  birth_year?: number | null;
  death_year?: number | null;
}

export interface BookFormats {
  [mimeType: string]: string; // mime type to URL mapping
}

export interface Book {
  id: number; // Gutenberg ID
  title: string;
  authors: BookAuthor[];
  subjects?: string[] | null;
  languages: string[];
  formats: BookFormats;
  downloadCount?: number | null;
  coverImage?: string | null;
  metadata?: any;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BookSearchParams {
  search?: string;
  author?: string;
  title?: string;
  languages?: string; // comma-separated language codes
  topic?: string;
  page?: number;
  pageSize?: number;
}

export interface BookSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: Book[];
}

export interface BookContent {
  bookId: number;
  content: string;
  format: 'text' | 'html';
  length: number;
}
