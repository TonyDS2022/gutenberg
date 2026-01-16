import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ReaderControls } from '../components/reader/ReaderControls';
import { ReaderContent } from '../components/reader/ReaderContent';
import { AnnotationPopup } from '../components/reader/AnnotationPopup';
import { AnnotationSidebar } from '../components/reader/AnnotationSidebar';
import { Button } from '../components/ui/Button';
import { booksApi } from '../api/books';
import { bookmarksApi } from '../api/bookmarks';
import { annotationsApi } from '../api/annotations';
import { sessionsApi } from '../api/sessions';
import { useAuthStore } from '../stores/authStore';
import { useTextSelection } from '../hooks/useTextSelection';
import type { Book, BookContent, Annotation, ReadingSession } from '@gutenberg-reader/shared';

export const ReaderPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [bookContent, setBookContent] = useState<BookContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotationPopup, setShowAnnotationPopup] = useState(false);
  const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(false);
  const [currentSession, setCurrentSession] = useState<ReadingSession | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const { isAuthenticated } = useAuthStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const closePopupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const isPageVisibleRef = useRef(true);

  // Text selection hook for annotations
  const { selection, clearSelection } = useTextSelection({
    containerRef: contentRef,
    originalContent: bookContent?.content || '',
    onSelectionChange: (sel) => {
      // Clear any pending close timeout
      if (closePopupTimeoutRef.current) {
        clearTimeout(closePopupTimeoutRef.current);
        closePopupTimeoutRef.current = null;
      }

      if (sel && isAuthenticated) {
        // Valid selection - show popup
        setShowAnnotationPopup(true);
      } else if (!sel) {
        // Selection cleared - delay closing popup to allow for adjustments
        closePopupTimeoutRef.current = setTimeout(() => {
          const hasActiveSelection = window.getSelection()?.toString().trim().length ?? 0;
          if (hasActiveSelection === 0) {
            setShowAnnotationPopup(false);
          }
        }, 300); // 300ms delay allows for selection adjustments
      }
    },
  });

  useEffect(() => {
    if (!bookId) return;

    const loadBook = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Load book metadata and content in parallel
        const [bookData, contentData] = await Promise.all([
          booksApi.getById(parseInt(bookId)),
          booksApi.getContent(parseInt(bookId), 'html'),
        ]);

        setBook(bookData);
        setBookContent(contentData);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load book');
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [bookId]);

  // Load bookmark status
  useEffect(() => {
    if (!bookId || !isAuthenticated) return;

    const loadBookmarkStatus = async () => {
      try {
        const bookmark = await bookmarksApi.getForBook(parseInt(bookId));
        setIsSaved(bookmark?.isFavorite || false);
      } catch (err) {
        console.error('Failed to load bookmark status:', err);
      }
    };

    loadBookmarkStatus();
  }, [bookId, isAuthenticated]);

  // Load annotations
  useEffect(() => {
    if (!bookId || !isAuthenticated) return;

    const loadAnnotations = async () => {
      try {
        const annotationsData = await annotationsApi.getByBook(parseInt(bookId));
        setAnnotations(annotationsData);
      } catch (err) {
        console.error('Failed to load annotations:', err);
      }
    };

    loadAnnotations();
  }, [bookId, isAuthenticated]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closePopupTimeoutRef.current) {
        clearTimeout(closePopupTimeoutRef.current);
      }
    };
  }, []);

  // Start reading session
  useEffect(() => {
    if (!bookId || !isAuthenticated || !bookContent) return;

    const startSession = async () => {
      try {
        const session = await sessionsApi.start({
          bookId: parseInt(bookId),
          startPosition: currentPosition,
        });
        setCurrentSession(session);
        sessionStartTimeRef.current = Date.now();
      } catch (err) {
        console.error('Failed to start session:', err);
      }
    };

    startSession();
  }, [bookId, isAuthenticated, bookContent]);

  // Page Visibility API - pause tracking when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;

      if (document.hidden && currentSession) {
        // Tab became hidden - save current progress
        sessionsApi.updateProgress(currentSession.id, currentPosition).catch(console.error);
      } else if (!document.hidden) {
        // Tab became visible - reset start time for accurate duration tracking
        sessionStartTimeRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSession, currentPosition]);

  // Periodic progress updates (every 30 seconds)
  useEffect(() => {
    if (!currentSession || !isPageVisibleRef.current) return;

    progressIntervalRef.current = setInterval(() => {
      if (isPageVisibleRef.current && currentSession) {
        sessionsApi.updateProgress(currentSession.id, currentPosition).catch(console.error);
      }
    }, 30000); // 30 seconds

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentSession, currentPosition]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (currentSession) {
        sessionsApi.end(currentSession.id, {
          endPosition: currentPosition,
          charactersRead: Math.max(0, currentPosition - currentSession.startPosition),
        }).catch(console.error);
      }
    };
  }, [currentSession, currentPosition]);

  // Track scroll position as reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current && bookContent) {
        const scrollTop = contentRef.current.querySelector('.reader-content-wrapper')?.scrollTop || 0;
        const contentLength = bookContent.content.length;
        // Estimate position based on scroll (rough approximation)
        const estimatedPosition = Math.floor((scrollTop / 1000) * contentLength * 0.01);
        setCurrentPosition(Math.min(estimatedPosition, contentLength));
      }
    };

    const scrollContainer = contentRef.current?.querySelector('.reader-content-wrapper');
    scrollContainer?.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer?.removeEventListener('scroll', handleScroll);
    };
  }, [bookContent]);

  const handleToggleBookmark = async () => {
    if (!bookId || !isAuthenticated) return;

    setIsSaving(true);
    try {
      await bookmarksApi.toggleFavorite(parseInt(bookId));
      setIsSaved(!isSaved);
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnnotation = async (note: string, color: string, tags?: string[]) => {
    if (!bookId || !selection) return;

    try {
      const newAnnotation = await annotationsApi.create({
        bookId: parseInt(bookId),
        selectedText: selection.text,
        startOffset: selection.startOffset,
        endOffset: selection.endOffset,
        note: note || undefined,
        color,
        tags: tags || [],
      });

      setAnnotations([...annotations, newAnnotation]);
      setShowAnnotationPopup(false);
      clearSelection();
    } catch (err) {
      console.error('Failed to save annotation:', err);
    }
  };

  const handleCancelAnnotation = () => {
    setShowAnnotationPopup(false);
    clearSelection();
  };

  const handleUpdateAnnotation = async (id: string, note: string, color: string) => {
    try {
      const updated = await annotationsApi.update(id, { note, color });
      setAnnotations(annotations.map((a) => (a.id === id ? updated : a)));
    } catch (err) {
      console.error('Failed to update annotation:', err);
    }
  };

  const handleDeleteAnnotation = async (id: string) => {
    try {
      await annotationsApi.delete(id);
      setAnnotations(annotations.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  };

  const handleJumpToAnnotation = (annotation: Annotation) => {
    // TODO: Implement scrolling to annotation position
    console.log('Jump to annotation:', annotation);
  };

  const getAuthorNames = (book: Book): string => {
    if (!book.authors || book.authors.length === 0) return 'Unknown Author';
    return book.authors.map((author) => author.name).join(', ');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-lg font-medium">Loading book...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !book || !bookContent) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-lg font-medium text-destructive">
              {error || 'Book not found'}
            </p>
            <Button onClick={() => navigate('/search')}>
              Back to Search
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with book info */}
      <div className="border-b bg-card sticky top-0 z-10 select-none">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/search">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold line-clamp-1">{book.title}</h1>
              <p className="text-sm text-muted-foreground">{getAuthorNames(book)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isAuthenticated && (
              <>
                <Button
                  variant={isSaved ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleBookmark}
                  disabled={isSaving}
                  title={isSaved ? 'Remove from library' : 'Save to library'}
                >
                  {isSaved ? '❤️ Saved' : '🤍 Save'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnnotationSidebar(true)}
                  title="View annotations"
                >
                  📝 Annotations ({annotations.length})
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowControls(!showControls)}
            >
              {showControls ? 'Hide' : 'Show'} Controls
            </Button>
          </div>
        </div>
      </div>

      {/* Main reader area */}
      <div className="container mx-auto px-4 py-6">
        <div className={showControls ? "grid lg:grid-cols-[1fr_300px] gap-6" : "flex justify-center"}>
          {/* Reader content */}
          <div>
            <ReaderContent
              ref={contentRef}
              content={bookContent.content}
              format={bookContent.format}
              annotations={annotations}
            />
          </div>

          {/* Reader controls sidebar */}
          {showControls && (
            <div className="lg:sticky lg:top-24 h-fit">
              <ReaderControls />
            </div>
          )}
        </div>
      </div>

      {/* Annotation Popup */}
      {showAnnotationPopup && (
        <AnnotationPopup
          selection={selection}
          onSave={handleSaveAnnotation}
          onCancel={handleCancelAnnotation}
        />
      )}

      {/* Annotation Sidebar */}
      <AnnotationSidebar
        annotations={annotations}
        isOpen={showAnnotationSidebar}
        onClose={() => setShowAnnotationSidebar(false)}
        onJumpTo={handleJumpToAnnotation}
        onUpdate={handleUpdateAnnotation}
        onDelete={handleDeleteAnnotation}
      />
    </div>
  );
};
