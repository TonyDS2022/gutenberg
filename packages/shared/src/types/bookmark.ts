export interface Bookmark {
  id: string;
  userId: string;
  bookId: number;
  position: number;
  positionType: 'offset' | 'page';
  chapter?: string | null;
  totalLength?: number | null;
  progressPercent: number;
  isFavorite: boolean;
  lastReadAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BookmarkCreateInput {
  bookId: number;
  position: number;
  positionType?: 'offset' | 'page';
  chapter?: string;
  totalLength?: number;
  progressPercent?: number;
  isFavorite?: boolean;
}

export interface BookmarkUpdateInput {
  position?: number;
  chapter?: string;
  progressPercent?: number;
  isFavorite?: boolean;
}

export interface BookmarkWithBook extends Bookmark {
  book: {
    id: number;
    title: string;
    authors: any;
    coverImage?: string | null;
  };
}
