import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { dictionaryApi, DictionaryLookupResult } from '../../api/dictionary';
import type { TextSelection } from '../../hooks/useTextSelection';

interface AnnotationPopupProps {
  selection: TextSelection | null;
  onSave: (note: string, color: string, tags?: string[]) => void;
  onCancel: () => void;
}

const COLORS = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Orange', value: '#ff9800' },
];

// Special color for dictionary definitions
const DICTIONARY_COLOR = '#9c27b0'; // Purple

export const AnnotationPopup = ({ selection, onSave, onCancel }: AnnotationPopupProps) => {
  const [note, setNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  // Dictionary lookup state
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<DictionaryLookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Reset lookup state when selection changes
  useEffect(() => {
    setLookupResult(null);
    setLookupError(null);
  }, [selection?.text]);

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

  const handleLookup = async () => {
    if (!selection?.text) return;

    setIsLookingUp(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const result = await dictionaryApi.lookup(selection.text);
      setLookupResult(result);

      if (result.success && result.definitions.length > 0) {
        // Format definition for note field
        const def = result.definitions[0];
        let formattedNote = `${def.partOfSpeech}: ${def.definition}`;
        if (def.phonetic) {
          formattedNote = `/${def.phonetic}/ - ${formattedNote}`;
        }
        if (def.example) {
          formattedNote += `\nExample: "${def.example}"`;
        }
        setNote(formattedNote);
        setSelectedColor(DICTIONARY_COLOR);
      } else {
        setLookupError(result.error || 'No definition found');
      }
    } catch (error: any) {
      setLookupError(error.response?.data?.error || 'Failed to look up word');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = () => {
    // Add 'dictionary' tag if this was a successful lookup
    const tags = lookupResult?.success ? ['dictionary'] : undefined;
    onSave(note, selectedColor, tags);
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

        {/* Dictionary Lookup Button */}
        <div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleLookup}
            disabled={isLookingUp || !selection?.text}
            className="w-full"
          >
            {isLookingUp ? 'Looking up...' : 'Look up in Dictionary'}
          </Button>
        </div>

        {/* Dictionary Definition Result */}
        {lookupResult?.success && lookupResult.definitions.length > 0 && (
          <div className="bg-muted p-2 rounded text-sm">
            <p className="font-medium text-xs text-muted-foreground mb-1">
              Definition ({lookupResult.definitions[0].source})
            </p>
            <p className="text-foreground">{lookupResult.definitions[0].definition}</p>
            {lookupResult.definitions[0].phonetic && (
              <p className="text-xs text-muted-foreground mt-1">
                /{lookupResult.definitions[0].phonetic}/
              </p>
            )}
          </div>
        )}

        {/* Lookup Error */}
        {lookupError && (
          <div className="bg-destructive/10 text-destructive p-2 rounded text-sm">
            {lookupError}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Note {lookupResult?.success ? '(from definition)' : '(optional)'}
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
            {/* Dictionary color (shown when lookup is successful) */}
            {lookupResult?.success && (
              <button
                onClick={() => setSelectedColor(DICTIONARY_COLOR)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  selectedColor === DICTIONARY_COLOR
                    ? 'border-primary scale-110'
                    : 'border-border hover:scale-105'
                }`}
                style={{ backgroundColor: DICTIONARY_COLOR }}
                title="Dictionary"
                aria-label="Dictionary"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" size="sm" onClick={handleSave} className="flex-1">
            {lookupResult?.success ? 'Save Definition' : 'Save Highlight'}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
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
