import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { statsApi, StatsSummary, TimeStats, BookStats } from '../api/stats';
import { useAuthStore } from '../stores/authStore';

type Period = 'day' | 'week' | 'month' | 'year';

export const StatsPage = () => {
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [bookStats, setBookStats] = useState<BookStats[]>([]);
  const [period, setPeriod] = useState<Period>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const loadStats = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [summaryData, timeData, booksData] = await Promise.all([
          statsApi.getSummary(),
          statsApi.getTimeStats(period),
          statsApi.getBookStats(10),
        ]);

        setSummary(summaryData);
        setTimeStats(timeData);
        setBookStats(booksData);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [isAuthenticated, navigate, period]);

  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) {
      return `${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (date: string): string => {
    const d = new Date(date);
    if (period === 'day') {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (period === 'week' || period === 'month') {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getAuthorNames = (authors: any[]): string => {
    if (!authors || authors.length === 0) return 'Unknown Author';
    return authors.map((author) => author.name).join(', ');
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !summary) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <p className="text-lg text-destructive">{error || 'Failed to load statistics'}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const maxReadingTime = timeStats
    ? Math.max(...timeStats.data.map((d) => d.readingTimeMs), 1)
    : 1;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reading Statistics</h1>
            <p className="text-muted-foreground mt-2">Track your reading progress and habits</p>
          </div>
          <Link to="/library">
            <Button variant="outline">View Library</Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Reading Time</CardDescription>
              <CardTitle className="text-3xl">
                {formatDuration(summary.totalReadingTimeMs)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Across {summary.totalSessions} sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Books Read</CardDescription>
              <CardTitle className="text-3xl">{summary.totalBooksRead}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {summary.totalBooksCompleted} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Session</CardDescription>
              <CardTitle className="text-3xl">
                {formatDuration(summary.averageSessionLengthMs)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Per reading session</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Current Streak</CardDescription>
              <CardTitle className="text-3xl">{summary.currentStreak}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Longest: {summary.longestStreak} days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Time-based Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reading Activity</CardTitle>
                <CardDescription>Time spent reading over the selected period</CardDescription>
              </div>
              <div className="flex space-x-2">
                {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={period === p ? 'default' : 'outline'}
                    onClick={() => setPeriod(p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {timeStats && timeStats.data.length > 0 ? (
              <div className="space-y-4">
                <div className="h-64 flex items-end justify-between space-x-2">
                  {timeStats.data.map((item, index) => {
                    const height = (item.readingTimeMs / maxReadingTime) * 100;
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center justify-end group"
                      >
                        <div
                          className="w-full bg-primary rounded-t transition-all hover:opacity-80 cursor-pointer relative"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`${formatDate(item.date)}: ${formatDuration(
                            item.readingTimeMs
                          )}`}
                        >
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {formatDuration(item.readingTimeMs)}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          {formatDate(item.date)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">No reading data for this period</p>
                  <Link to="/search" className="mt-4 inline-block">
                    <Button size="sm">Start Reading</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Read Books */}
        <Card>
          <CardHeader>
            <CardTitle>Most Read Books</CardTitle>
            <CardDescription>Your top books by reading time</CardDescription>
          </CardHeader>
          <CardContent>
            {bookStats.length > 0 ? (
              <div className="space-y-4">
                {bookStats.map((book, index) => (
                  <div
                    key={book.bookId}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/reader/${book.bookId}`}
                          className="font-medium hover:underline line-clamp-1"
                        >
                          {book.title}
                        </Link>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {getAuthorNames(book.authors)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold">{formatDuration(book.totalTimeMs)}</p>
                      <p className="text-xs text-muted-foreground">
                        {book.sessionsCount} sessions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No books read yet</p>
                <Link to="/search">
                  <Button>Discover Books</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty State for New Users */}
        {summary.totalSessions === 0 && (
          <Card className="bg-accent/50">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">📈</div>
              <h2 className="text-2xl font-semibold mb-2">Start Building Your Reading Stats</h2>
              <p className="text-muted-foreground mb-6">
                Your reading statistics will appear here once you start reading books
              </p>
              <Link to="/search">
                <Button size="lg">Browse Books</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};
