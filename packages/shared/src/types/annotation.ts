export interface Annotation {
  id: string;
  userId: string;
  bookId: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  startNode?: string | null;
  endNode?: string | null;
  context?: string | null;
  note?: string | null;
  color: string;
  tags: string[];
  chapter?: string | null;
  pageNumber?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AnnotationCreateInput {
  bookId: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  startNode?: string;
  endNode?: string;
  context?: string;
  note?: string;
  color?: string;
  tags?: string[];
  chapter?: string;
  pageNumber?: number;
}

export interface AnnotationUpdateInput {
  note?: string;
  color?: string;
  tags?: string[];
}

export interface AnnotationWithBook extends Annotation {
  book: {
    id: number;
    title: string;
    authors: any;
  };
}
