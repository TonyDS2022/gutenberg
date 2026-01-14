import { useEffect, useRef, useState } from 'react';
import type { Annotation } from '@gutenberg-reader/shared';

interface HighlightTooltipProps {
  annotation: Annotation;
  position: { x: number; y: number };
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const HighlightTooltip = ({
  annotation,
  position,
  onMouseEnter,
  onMouseLeave,
}: HighlightTooltipProps) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltipHeight = tooltipRef.current.offsetHeight;
    const tooltipWidth = tooltipRef.current.offsetWidth;

    // Position above the highlight, centered on x
    let top = position.y - tooltipHeight - 8;
    let left = position.x - tooltipWidth / 2;

    // If not enough space above, position below
    if (top < 10) {
      top = position.y + 24;
    }

    // Keep within horizontal bounds
    if (left < 10) {
      left = 10;
    } else if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }

    setAdjustedPosition({ top, left });
  }, [position]);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 bg-card border rounded-lg shadow-lg w-72 pointer-events-auto overflow-hidden"
      style={{ top: `${adjustedPosition.top}px`, left: `${adjustedPosition.left}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Color indicator bar */}
      <div
        className="h-1"
        style={{ backgroundColor: annotation.color }}
      />

      <div className="p-3 space-y-2">
        {/* Selected text preview */}
        <p className="text-sm italic line-clamp-2 text-foreground">
          "{annotation.selectedText}"
        </p>

        {/* Note if present */}
        {annotation.note && (
          <p className="text-sm text-foreground border-l-2 pl-2" style={{ borderColor: annotation.color }}>
            {annotation.note}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>{formatDate(annotation.createdAt)}</span>
          {annotation.tags && annotation.tags.length > 0 && (
            <span className="truncate max-w-[120px]">
              {annotation.tags.join(', ')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
