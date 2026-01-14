import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { SearchPage } from '../pages/SearchPage';
import { ReaderPage } from '../pages/ReaderPage';
import { LibraryPage } from '../pages/LibraryPage';
import { StatsPage } from '../pages/StatsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/reader/:bookId" element={<ReaderPage />} />
      <Route path="/library" element={<LibraryPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
