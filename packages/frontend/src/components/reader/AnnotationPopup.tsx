import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { TextSelection } from '../../hooks/useTextSelection';

interface AnnotationPopupProps {
  selection: TextSelection | null;
  onSave: (note: string, color: string) => void;
  onCancel: () => void;
}

const COLORS = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Orange', value: '#ff9800' },
];

export const AnnotationPopup = ({ selection, onSave, onCancel }: AnnotationPopupProps) => {
  const [note, setNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selection || !selection.clientRect || !popupRef.current) return;

    const rect = selection.clientRect;
    const popupHeight = popupRef.current.offsetHeight;
    const popupWidth = popupRef.current.offsetWidth;

    // Position above the selection, centered
    let top = rect.top + window.scrollY - popupHeight - 10;
    let left = rect.left + window.scrollX + (rect.width / 2) - (popupWidth / 2);

    // Make sure popup stays within viewport
    if (top < window.scrollY) {
      // If not enough space above, position below
      top = rect.bottom + window.scrollY + 10;
    }

    if (left < 10) {
      left = 10;
    } else if (left + popupWidth > window.innerWidth - 10) {
      left = window.innerWidth - popupWidth - 10;
    }

    setPosition({ top, left });
  }, [selection]);

  const handleSave = () => {
    onSave(note, selectedColor);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  // Don't render if no valid selection
  if (!selection) return null;

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-card border rounded-lg shadow-lg p-4 w-80"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Selected Text
          </label>
          <p className="text-sm italic line-clamp-2">"{selection.text}"</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Note (optional)
          </label>
          <Input
            type="text"
            placeholder="Add your note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Highlight Color
          </label>
          <div className="flex gap-2">
            {COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setSelectedColor(color.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === color.value
                    ? 'border-primary scale-110'
                    : 'border-border hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
                aria-label={color.name}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={handleSave} className="flex-1">
            Save Highlight
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Press ⌘+Enter to save, Esc to cancel
        </p>
      </div>
    </div>
  );
};
