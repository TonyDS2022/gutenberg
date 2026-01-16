import axios from 'axios';
import dns from 'dns';
import http from 'http';
import https from 'https';
import { env } from '../config/env';
import { prisma } from '../models';
import { AppError } from '../middleware/errorHandler';
import type { BookSearchParams, BookSearchResult, Book, BookContent } from '@gutenberg-reader/shared';

// Force IPv4 for DNS resolution (fixes timeout issues in Docker containers)
dns.setDefaultResultOrder('ipv4first');

// Create HTTP agents that force IPv4
const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

interface GutendexBook {
  id: number;
  title: string;
  authors: Array<{
    name: string;
    birth_year?: number | null;
    death_year?: number | null;
  }>;
  subjects: string[];
  languages: string[];
  formats: { [key: string]: string };
  download_count: number;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

export class GutenbergService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.GUTENDEX_API_URL;
  }

  async searchBooks(params: BookSearchParams): Promise<BookSearchResult> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      if (params.search) queryParams.append('search', params.search);
      if (params.author) queryParams.append('search', params.author);
      if (params.title) queryParams.append('search', params.title);
      if (params.languages) queryParams.append('languages', params.languages);
      if (params.topic) queryParams.append('topic', params.topic);
      if (params.page) queryParams.append('page', params.page.toString());

      // Fetch from Gutendex API
      const response = await axios.get<GutendexResponse>(
        `${this.baseUrl}/books?${queryParams.toString()}`
      );

      // Transform and cache books in our database
      const books: Book[] = await Promise.all(
        response.data.results.map((gutendexBook) => this.transformAndCacheBook(gutendexBook))
      );

      return {
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        results: books,
      };
    } catch (error) {
      console.error('Error searching books:', error);
      throw new AppError(500, 'Failed to search books');
    }
  }

  async getBookById(bookId: number): Promise<Book> {
    try {
      // Check if book exists in our database
      let book = await prisma.book.findUnique({
        where: { id: bookId },
      });

      if (book) {
        return this.formatBook(book);
      }

      // Fetch from Gutendex API
      const response = await axios.get<GutendexBook>(
        `${this.baseUrl}/books/${bookId}`
      );

      // Cache in database
      book = await this.cacheBook(response.data);

      return this.formatBook(book);
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new AppError(404, 'Book not found');
      }
      console.error('Error fetching book:', error);
      throw new AppError(500, 'Failed to fetch book');
    }
  }

  async getBookContent(bookId: number, format: 'text' | 'html' = 'text'): Promise<BookContent> {
    try {
      // Check if content is already cached in database
      const cachedBook = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
          content: true,
          contentFormat: true,
          contentLength: true,
        },
      });

      // Return cached content if available
      if (cachedBook?.content && cachedBook?.contentFormat) {
        console.log(`Returning cached content for book ${bookId}`);
        return {
          bookId,
          content: cachedBook.content,
          format: cachedBook.contentFormat as 'text' | 'html',
          length: cachedBook.contentLength || cachedBook.content.length,
        };
      }

      // Content not cached, fetch from Project Gutenberg
      console.log(`Fetching content from Project Gutenberg for book ${bookId}`);

      // Get book to access formats
      const book = await this.getBookById(bookId);

      // Determine which URL to fetch from
      let contentUrl: string | null = null;

      if (format === 'html') {
        // Prefer HTML format
        contentUrl =
          book.formats['text/html'] ||
          book.formats['text/html; charset=utf-8'] ||
          book.formats['text/plain; charset=utf-8'] ||
          book.formats['text/plain; charset=us-ascii'] ||
          book.formats['text/plain'];
      } else {
        // Prefer plain text format
        contentUrl =
          book.formats['text/plain; charset=utf-8'] ||
          book.formats['text/plain; charset=us-ascii'] ||
          book.formats['text/plain'] ||
          book.formats['text/html; charset=utf-8'] ||
          book.formats['text/html'];
      }

      if (!contentUrl) {
        throw new AppError(404, 'No suitable text format available for this book');
      }

      // Fetch content from Project Gutenberg
      const response = await axios.get<string>(contentUrl, {
        responseType: 'text',
        timeout: 30000, // 30 second timeout for large books
        maxRedirects: 10, // Follow redirects
        httpAgent,  // Force IPv4 (fixes Docker networking issues)
        httpsAgent, // Force IPv4 for HTTPS
        headers: {
          'User-Agent': 'Gutenberg-Reader/1.0 (educational project)',
        },
      });

      const content = response.data;

      // Determine actual format from Content-Type or URL
      const actualFormat = contentUrl.includes('.html') ? 'html' : 'text';

      // Cache the content in database for future use
      await prisma.book.update({
        where: { id: bookId },
        data: {
          content,
          contentFormat: actualFormat,
          contentLength: content.length,
          contentCachedAt: new Date(),
        },
      });

      console.log(`Cached content for book ${bookId} (${content.length} characters)`);

      return {
        bookId,
        content,
        format: actualFormat,
        length: content.length,
      };
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }

      // Handle specific error types
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        console.error('Timeout fetching book content:', error.message);
        throw new AppError(504, 'Content fetch timed out. The external server may be slow or unreachable. Please try again later.');
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error('Network error fetching book content:', error.message);
        throw new AppError(502, 'Unable to reach external content server. Please check network connectivity.');
      }

      console.error('Error fetching book content:', error);
      throw new AppError(500, 'Failed to fetch book content');
    }
  }

  private async transformAndCacheBook(gutendexBook: GutendexBook): Promise<Book> {
    // Check if already cached
    const existing = await prisma.book.findUnique({
      where: { id: gutendexBook.id },
    });

    if (existing) {
      return this.formatBook(existing);
    }

    // Cache new book
    return this.cacheBook(gutendexBook);
  }

  private async cacheBook(gutendexBook: GutendexBook): Promise<Book> {
    // Extract cover image URL if available
    const coverImage =
      gutendexBook.formats['image/jpeg'] ||
      gutendexBook.formats['image/png'] ||
      null;

    const book = await prisma.book.create({
      data: {
        id: gutendexBook.id,
        title: gutendexBook.title,
        authors: gutendexBook.authors,
        subjects: gutendexBook.subjects,
        languages: gutendexBook.languages,
        formats: gutendexBook.formats,
        downloadCount: gutendexBook.download_count,
        coverImage,
        metadata: gutendexBook,
      },
    });

    return this.formatBook(book);
  }

  private formatBook(book: any): Book {
    return {
      id: book.id,
      title: book.title,
      authors: book.authors,
      subjects: book.subjects,
      languages: book.languages,
      formats: book.formats,
      downloadCount: book.downloadCount,
      coverImage: book.coverImage,
      metadata: book.metadata,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }
}

export const gutenbergService = new GutenbergService();
