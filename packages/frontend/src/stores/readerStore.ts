import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontFamily = 'serif' | 'sans-serif' | 'monospace';

interface ReaderSettings {
  fontFamily: FontFamily;
  fontSize: number; // in pixels
  lineHeight: number; // multiplier (e.g., 1.5)
  maxWidth: number; // in pixels
}

interface ReaderState extends ReaderSettings {
  currentBookId: number | null;
  currentPosition: number;

  // Actions
  setFontFamily: (fontFamily: FontFamily) => void;
  setFontSize: (fontSize: number) => void;
  setLineHeight: (lineHeight: number) => void;
  setMaxWidth: (maxWidth: number) => void;
  setCurrentBook: (bookId: number) => void;
  setCurrentPosition: (position: number) => void;
  resetSettings: () => void;
}

const defaultSettings: ReaderSettings = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.6,
  maxWidth: 800,
};

export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      currentBookId: null,
      currentPosition: 0,

      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setMaxWidth: (maxWidth) => set({ maxWidth }),
      setCurrentBook: (bookId) => set({ currentBookId: bookId, currentPosition: 0 }),
      setCurrentPosition: (position) => set({ currentPosition: position }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'reader-storage',
    }
  )
);

// Helper to get font family CSS value
export const getFontFamilyCSS = (fontFamily: FontFamily): string => {
  switch (fontFamily) {
    case 'serif':
      return 'Georgia, "Times New Roman", serif';
    case 'sans-serif':
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    case 'monospace':
      return '"Courier New", Courier, monospace';
  }
};
