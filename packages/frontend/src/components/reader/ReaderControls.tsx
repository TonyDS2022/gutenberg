import { useReaderStore, getFontFamilyCSS, type FontFamily } from '../../stores/readerStore';
import { useThemeStore } from '../../stores/themeStore';
import { Button } from '../ui/Button';

export const ReaderControls = () => {
  const {
    fontFamily,
    fontSize,
    lineHeight,
    setFontFamily,
    setFontSize,
    setLineHeight,
  } = useReaderStore();

  const { theme, setTheme } = useThemeStore();

  const fontOptions: { value: FontFamily; label: string }[] = [
    { value: 'serif', label: 'Serif' },
    { value: 'sans-serif', label: 'Sans' },
    { value: 'monospace', label: 'Mono' },
  ];

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4 select-none">
      <h3 className="font-semibold text-sm">Reading Settings</h3>

      {/* Theme Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Theme</label>
        <div className="flex space-x-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('light')}
          >
            ☀️ Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('dark')}
          >
            🌙 Dark
          </Button>
          <Button
            variant={theme === 'sepia' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('sepia')}
          >
            📜 Sepia
          </Button>
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Font Family</label>
        <div className="flex space-x-2">
          {fontOptions.map((option) => (
            <Button
              key={option.value}
              variant={fontFamily === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFontFamily(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Font Size: {fontSize}px
        </label>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFontSize(Math.max(12, fontSize - 2))}
            disabled={fontSize <= 12}
          >
            A-
          </Button>
          <input
            type="range"
            min="12"
            max="32"
            step="2"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFontSize(Math.min(32, fontSize + 2))}
            disabled={fontSize >= 32}
          >
            A+
          </Button>
        </div>
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Line Spacing: {lineHeight.toFixed(1)}
        </label>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLineHeight(Math.max(1.0, lineHeight - 0.2))}
            disabled={lineHeight <= 1.0}
          >
            -
          </Button>
          <input
            type="range"
            min="1.0"
            max="2.5"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLineHeight(Math.min(2.5, lineHeight + 0.2))}
            disabled={lineHeight >= 2.5}
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
};
