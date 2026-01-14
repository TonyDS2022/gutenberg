import { prisma } from '../models';
import { AppError } from '../middleware/errorHandler';
import type { Bookmark, BookmarkCreateInput, BookmarkUpdateInput } from '@gutenberg-reader/shared';

export class BookmarkService {
  async getUserBookmarks(userId: string): Promise<any[]> {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            authors: true,
            coverImage: true,
            languages: true,
          },
        },
      },
      orderBy: { lastReadAt: 'desc' },
    });

    return bookmarks;
  }

  async getBookmarkByUserAndBook(userId: string, bookId: number): Promise<Bookmark | null> {
    const bookmark = await prisma.bookmark.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
    });

    return bookmark;
  }

  async createOrUpdateBookmark(
    userId: string,
    data: BookmarkCreateInput
  ): Promise<Bookmark> {
    // Check if bookmark already exists
    const existing = await this.getBookmarkByUserAndBook(userId, data.bookId);

    if (existing) {
      // Update existing bookmark
      const updated = await prisma.bookmark.update({
        where: { id: existing.id },
        data: {
          position: data.position ?? existing.position,
          chapter: data.chapter ?? existing.chapter,
          progressPercent: data.progressPercent ?? existing.progressPercent,
          isFavorite: data.isFavorite ?? existing.isFavorite,
          lastReadAt: new Date(),
        },
      });
      return updated;
    }

    // Create new bookmark
    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        bookId: data.bookId,
        position: data.position || 0,
        positionType: data.positionType || 'offset',
        chapter: data.chapter,
        totalLength: data.totalLength,
        progressPercent: data.progressPercent || 0,
        isFavorite: data.isFavorite || false,
      },
    });

    return bookmark;
  }

  async updateBookmark(
    userId: string,
    bookmarkId: string,
    data: BookmarkUpdateInput
  ): Promise<Bookmark> {
    // Verify ownership
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new AppError(404, 'Bookmark not found');
    }

    if (bookmark.userId !== userId) {
      throw new AppError(403, 'Not authorized to update this bookmark');
    }

    // Update bookmark
    const updated = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        ...data,
        lastReadAt: new Date(),
      },
    });

    return updated;
  }

  async deleteBookmark(userId: string, bookmarkId: string): Promise<void> {
    // Verify ownership
    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new AppError(404, 'Bookmark not found');
    }

    if (bookmark.userId !== userId) {
      throw new AppError(403, 'Not authorized to delete this bookmark');
    }

    await prisma.bookmark.delete({
      where: { id: bookmarkId },
    });
  }

  async toggleFavorite(userId: string, bookId: number): Promise<Bookmark> {
    const bookmark = await this.getBookmarkByUserAndBook(userId, bookId);

    if (!bookmark) {
      // Create new bookmark as favorite
      return this.createOrUpdateBookmark(userId, {
        bookId,
        position: 0,
        isFavorite: true,
      });
    }

    // Toggle favorite status
    const updated = await prisma.bookmark.update({
      where: { id: bookmark.id },
      data: {
        isFavorite: !bookmark.isFavorite,
        lastReadAt: new Date(),
      },
    });

    return updated;
  }
}

export const bookmarkService = new BookmarkService();
