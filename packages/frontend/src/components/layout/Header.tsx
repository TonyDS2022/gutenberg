import { Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Button } from '../ui/Button';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleLogout = async () => {
    await logout();
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return '☀️';
      case 'dark':
        return '🌙';
      case 'sepia':
        return '📜';
    }
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-xl font-bold">
            📚 Gutenberg Reader
          </Link>
          {isAuthenticated && (
            <nav className="flex space-x-4">
              <Link to="/search" className="text-sm hover:text-primary">
                Search
              </Link>
              <Link to="/library" className="text-sm hover:text-primary">
                My Library
              </Link>
              <Link to="/stats" className="text-sm hover:text-primary">
                Statistics
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            title={`Current theme: ${theme}`}
          >
            {getThemeIcon()}
          </Button>

          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {user?.username}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
