import axios from 'axios';
import dns from 'dns';
import http from 'http';
import https from 'https';
import { env } from '../config/env';
import { prisma } from '../models';
import { AppError } from '../middleware/errorHandler';
import { assetService } from './asset.service';
import type { BookSearchParams, BookSearchResult, Book, BookContent } from '@gutenberg-reader/shared';

// Force IPv4 for DNS resolution (fixes timeout issues in Docker containers)
dns.setDefaultResultOrder('ipv4first');

// HTTP agents that force IPv4 (fixes timeout issues in Docker containers)
export const httpAgent = new http.Agent({ family: 4 });
export const httpsAgent = new https.Agent({ family: 4 });

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
      // Get book to access formats (needed for both cached and fresh content)
      const book = await this.getBookById(bookId);

      // Determine which URL to use
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

      // Determine actual format from URL
      const urlPath = contentUrl.split('/').pop() || '';
      const actualFormat =
        urlPath.endsWith('.html') ||
        urlPath.endsWith('.htm') ||
        urlPath.includes('.html.') ||
        urlPath.includes('.htm.') ||
        (contentUrl.includes('/ebooks/') && !contentUrl.includes('.txt.') && !contentUrl.includes('.epub'))
          ? 'html'
          : 'text';

      // Derive correct base URL for image resolution
      // Gutenberg's .html.images format stores images in /cache/epub/{id}/images/
      let imageBaseUrl = contentUrl;
      if (contentUrl.includes('.html.images')) {
        const match = contentUrl.match(/\/(\d+)\.html\.images$/);
        if (match) {
          imageBaseUrl = `https://www.gutenberg.org/cache/epub/${match[1]}/`;
        }
      } else if (contentUrl.includes('/ebooks/')) {
        imageBaseUrl = contentUrl.substring(0, contentUrl.lastIndexOf('/') + 1);
      }

      // Check if content is already cached in database
      const cachedBook = await prisma.book.findUnique({
        where: { id: bookId },
        select: {
          content: true,
          contentFormat: true,
          contentLength: true,
        },
      });

      // Return cached content if available and format matches
      if (cachedBook?.content && cachedBook?.contentFormat && cachedBook.contentFormat === actualFormat) {
        console.log(`Returning cached content for book ${bookId}`);
        let content = cachedBook.content;

        // Always process HTML content to ensure images are cached and URLs are rewritten
        if (actualFormat === 'html') {
          const result = await assetService.processContent(bookId, content, imageBaseUrl);
          content = result.content;

          // Update cache with processed content if different
          if (content !== cachedBook.content) {
            await prisma.book.update({
              where: { id: bookId },
              data: {
                content,
                contentLength: content.length,
                contentCachedAt: new Date(),
              },
            });
            console.log(`Updated cached content for book ${bookId} with processed images`);
          }
        }

        return {
          bookId,
          content,
          format: actualFormat,
          length: cachedBook.contentLength || cachedBook.content.length,
        };
      }

      // Content not cached, fetch from Project Gutenberg
      console.log(`Fetching content from Project Gutenberg for book ${bookId}`);

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

      let content = response.data;

      // Process HTML content to cache images locally
      let assetsCached = 0;
      if (actualFormat === 'html') {
        const result = await assetService.processContent(bookId, content, imageBaseUrl);
        content = result.content;
        assetsCached = result.assets.length;
      }

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

      console.log(`Cached content for book ${bookId} (${content.length} characters, ${assetsCached} assets)`);

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
    const book = await this.cacheBook(gutendexBook);
    return this.formatBook(book);
  }

  private async cacheBook(gutendexBook: GutendexBook) {
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
        metadata: gutendexBook as any,
      },
    });

    return book;
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
