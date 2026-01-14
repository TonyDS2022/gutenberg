import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Loading, LoadingSpinner } from '../components/ui/Loading';
import { booksApi } from '../api/books';
import { bookmarksApi } from '../api/bookmarks';
import { useAuthStore } from '../stores/authStore';
import type { Book } from '@gutenberg-reader/shared';

export const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [savedBookIds, setSavedBookIds] = useState<Set<number>>(new Set());
  const [savingBookId, setSavingBookId] = useState<number | null>(null);
  const { isAuthenticated } = useAuthStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const result = await booksApi.search({ search: searchQuery });
      setBooks(result.results);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search books');
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAuthorNames = (book: Book): string => {
    if (!book.authors || book.authors.length === 0) return 'Unknown Author';
    return book.authors.map((author) => author.name).join(', ');
  };

  const handleToggleBookmark = async (bookId: number) => {
    if (!isAuthenticated) return;

    setSavingBookId(bookId);
    try {
      await bookmarksApi.toggleFavorite(bookId);
      setSavedBookIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(bookId)) {
          newSet.delete(bookId);
        } else {
          newSet.add(bookId);
        }
        return newSet;
      });
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    } finally {
      setSavingBookId(null);
    }
  };

  // Load saved books when authenticated
  useEffect(() => {
    if (isAuthenticated && books.length > 0) {
      const loadBookmarks = async () => {
        try {
          const bookmarks = await bookmarksApi.getAll();
          const bookmarkIds = new Set(
            bookmarks.filter((b) => b.isFavorite).map((b) => b.bookId)
          );
          setSavedBookIds(bookmarkIds);
        } catch (err) {
          console.error('Failed to load bookmarks:', err);
        }
      };
      loadBookmarks();
    }
  }, [isAuthenticated, books.length]);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Search Books</h1>
          <p className="text-muted-foreground">
            Browse from 70,000+ public domain books from Project Gutenberg
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Search by title, author, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoadingSpinner className="mr-2" />}
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="py-12 flex justify-center">
            <Loading text="Searching books..." />
          </div>
        )}

        {!isLoading && hasSearched && books.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No books found. Try a different search term.</p>
          </div>
        )}

        {!isLoading && books.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              Found {books.length} books
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <Card key={book.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                    <CardDescription className="line-clamp-1">
                      {getAuthorNames(book)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {book.subjects && book.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {book.subjects.slice(0, 2).map((subject, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 bg-secondary rounded-full"
                          >
                            {subject.split('--')[0].trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        {book.languages.join(', ').toUpperCase()}
                      </span>
                      <div className="flex items-center space-x-2">
                        {isAuthenticated && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleBookmark(book.id)}
                            disabled={savingBookId === book.id}
                            title={savedBookIds.has(book.id) ? 'Remove from library' : 'Save to library'}
                          >
                            {savedBookIds.has(book.id) ? '❤️' : '🤍'}
                          </Button>
                        )}
                        <Link to={`/reader/${book.id}`}>
                          <Button size="sm">Read</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {!hasSearched && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Enter a search term to find books
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('shakespeare');
                  handleSearch({ preventDefault: () => {} } as React.FormEvent);
                }}
              >
                Shakespeare
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('pride and prejudice');
                  handleSearch({ preventDefault: () => {} } as React.FormEvent);
                }}
              >
                Pride and Prejudice
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('dickens');
                  handleSearch({ preventDefault: () => {} } as React.FormEvent);
                }}
              >
                Dickens
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};
