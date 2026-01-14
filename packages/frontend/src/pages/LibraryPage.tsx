import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { bookmarksApi } from '../api/bookmarks';
import { useAuthStore } from '../stores/authStore';

export const LibraryPage = () => {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const loadBookmarks = async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await bookmarksApi.getAll();
        // Only show favorited books
        const favorites = data.filter((b) => b.isFavorite);
        setBookmarks(favorites);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load library');
      } finally {
        setIsLoading(false);
      }
    };

    loadBookmarks();
  }, [isAuthenticated, navigate]);

  const handleRemoveBookmark = async (bookmarkId: string, bookId: number) => {
    try {
      await bookmarksApi.toggleFavorite(bookId);
      setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    } catch (err) {
      console.error('Failed to remove bookmark:', err);
    }
  };

  const getAuthorNames = (authors: any[]): string => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    return authors.map((author) => author.name).join(', ');
  };

  const formatDate = (date: string | Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Library</h1>
            <p className="text-muted-foreground mt-2">
              {bookmarks.length} {bookmarks.length === 1 ? 'book' : 'books'} saved
            </p>
          </div>
          <Link to="/search">
            <Button>Browse Books</Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {bookmarks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-semibold mb-2">Your library is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start adding books to your library from the search page
            </p>
            <Link to="/search">
              <Button size="lg">Discover Books</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarks.map((bookmark) => (
              <Card key={bookmark.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-2">
                        {bookmark.book.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-1">
                        {getAuthorNames(bookmark.book.authors)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBookmark(bookmark.id, bookmark.bookId)}
                      title="Remove from library"
                      className="ml-2"
                    >
                      ❤️
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bookmark.progressPercent > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round(bookmark.progressPercent)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary rounded-full h-2 transition-all"
                          style={{ width: `${bookmark.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last read {formatDate(bookmark.lastReadAt)}</span>
                    <span>{bookmark.book.languages.join(', ').toUpperCase()}</span>
                  </div>
                  <Link to={`/reader/${bookmark.bookId}`}>
                    <Button size="sm" className="w-full">
                      {bookmark.progressPercent > 0 ? 'Continue Reading' : 'Start Reading'}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
