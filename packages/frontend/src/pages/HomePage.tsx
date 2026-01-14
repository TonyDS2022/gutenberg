import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

export const HomePage = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4 py-12">
          <h1 className="text-5xl font-bold">Welcome to Gutenberg Reader</h1>
          <p className="text-xl text-muted-foreground">
            Read 70,000+ public domain books with a beautiful, customizable interface
          </p>
          <div className="flex justify-center space-x-4 pt-4">
            {isAuthenticated ? (
              <Link to="/search">
                <Button size="lg">Browse Books</Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>📖 Read</CardTitle>
              <CardDescription>Browse thousands of classic books</CardDescription>
            </CardHeader>
            <CardContent>
              Search and read from Project Gutenberg's vast collection of public domain literature.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>✏️ Annotate</CardTitle>
              <CardDescription>Highlight and take notes</CardDescription>
            </CardHeader>
            <CardContent>
              Add highlights, notes, and bookmarks as you read. Your annotations are saved automatically.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📊 Track</CardTitle>
              <CardDescription>Monitor your reading progress</CardDescription>
            </CardHeader>
            <CardContent>
              View reading statistics, track your progress, and see your reading history.
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-2">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="font-semibold">Customizable Themes</h3>
                <p className="text-sm text-muted-foreground">
                  Choose between light, dark, and sepia reading modes
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-2xl">🔤</span>
              <div>
                <h3 className="font-semibold">Font Controls</h3>
                <p className="text-sm text-muted-foreground">
                  Adjust font family, size, and line spacing
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-2xl">🔖</span>
              <div>
                <h3 className="font-semibold">Bookmarks</h3>
                <p className="text-sm text-muted-foreground">
                  Save your reading position and favorite books
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-2xl">📈</span>
              <div>
                <h3 className="font-semibold">Reading Stats</h3>
                <p className="text-sm text-muted-foreground">
                  Track time spent reading and books completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};
