import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from './routes';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

function App() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    // Load user if token exists
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // Apply theme class to root element
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'sepia');
    root.classList.add(theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
