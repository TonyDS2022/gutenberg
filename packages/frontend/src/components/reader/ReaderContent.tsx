import { useEffect, useRef, useMemo, forwardRef, useState, useCallback } from 'react';
import { useReaderStore, getFontFamilyCSS } from '../../stores/readerStore';
import { applyHighlightsToText, applyHighlightsToHtml } from '../../utils/highlightContent';
import { HighlightTooltip } from './HighlightTooltip';
import type { Annotation } from '@gutenberg-reader/shared';

// SVG placeholder for failed images
const PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
  <rect fill="#f3f4f6" width="200" height="150"/>
  <rect fill="#e5e7eb" x="10" y="10" width="180" height="130" rx="4"/>
  <path fill="#9ca3af" d="M85 55 L65 85 L95 85 Z M115 65 L95 95 L135 95 Z"/>
  <circle fill="#9ca3af" cx="130" cy="45" r="12"/>
  <text x="100" y="120" text-anchor="middle" fill="#6b7280" font-family="system-ui" font-size="11">Image unavailable</text>
</svg>
`)}`;

interface ReaderContentProps {
  content: string;
  format: 'text' | 'html';
  annotations?: Annotation[];
}

interface HoveredAnnotation {
  annotation: Annotation;
  position: { x: number; y: number };
}

export const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ content, format, annotations = [] }, forwardedRef) => {
    const { fontFamily, fontSize, lineHeight, maxWidth } = useReaderStore();
    const contentRef = useRef<HTMLDivElement>(null);
    const [hoveredAnnotation, setHoveredAnnotation] = useState<HoveredAnnotation | null>(null);
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const readerStyles = {
      fontFamily: getFontFamilyCSS(fontFamily),
      fontSize: `${fontSize}px`,
      lineHeight: `${lineHeight}`,
      maxWidth: `${maxWidth}px`,
    };

    // Apply highlights to content
    const highlightedContent = useMemo(() => {
      if (annotations.length === 0) {
        return format === 'html' ? content : content;
      }

      return format === 'html'
        ? applyHighlightsToHtml(content, annotations)
        : applyHighlightsToText(content, annotations);
    }, [content, format, annotations]);

    // Clear hide timeout
    const clearHideTimeout = useCallback(() => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }, []);

    // Schedule hiding the tooltip with a delay
    const scheduleHide = useCallback(() => {
      clearHideTimeout();
      hideTimeoutRef.current = setTimeout(() => {
        setHoveredAnnotation(null);
      }, 150);
    }, [clearHideTimeout]);

    // Handle hover events on mark elements
    useEffect(() => {
      const container = contentRef.current;
      if (!container) return;

      const handleMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'MARK' && target.dataset.annotationId) {
          const annotationId = target.dataset.annotationId;
          const annotation = annotations.find(a => a.id === annotationId);
          if (annotation) {
            clearHideTimeout();
            const rect = target.getBoundingClientRect();
            setHoveredAnnotation({
              annotation,
              position: { x: rect.left + rect.width / 2, y: rect.top },
            });
          }
        }
      };

      const handleMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'MARK') {
          scheduleHide();
        }
      };

      container.addEventListener('mouseover', handleMouseOver);
      container.addEventListener('mouseout', handleMouseOut);

      return () => {
        container.removeEventListener('mouseover', handleMouseOver);
        container.removeEventListener('mouseout', handleMouseOut);
        clearHideTimeout();
      };
    }, [annotations, clearHideTimeout, scheduleHide]);

    // Handle image load errors - replace with placeholder
    useEffect(() => {
      const container = contentRef.current;
      if (!container || format !== 'html') return;

      const handleImageError = (e: Event) => {
        const img = e.target as HTMLImageElement;
        if (img.src !== PLACEHOLDER_IMAGE) {
          img.src = PLACEHOLDER_IMAGE;
          img.alt = 'Image unavailable';
          img.style.maxWidth = '200px';
          img.style.opacity = '0.7';
        }
      };

      // Find all images and attach error handlers
      const images = container.querySelectorAll('img');
      images.forEach((img) => {
        img.addEventListener('error', handleImageError);
        // Also handle images that already failed before we attached the listener
        if (img.complete && img.naturalHeight === 0) {
          img.src = PLACEHOLDER_IMAGE;
          img.alt = 'Image unavailable';
          img.style.maxWidth = '200px';
          img.style.opacity = '0.7';
        }
      });

      return () => {
        images.forEach((img) => {
          img.removeEventListener('error', handleImageError);
        });
      };
    }, [highlightedContent, format]);

    // Handle scroll position restoration
    useEffect(() => {
      const savedPosition = sessionStorage.getItem('reader-scroll-position');
      if (savedPosition && contentRef.current) {
        contentRef.current.scrollTop = parseInt(savedPosition, 10);
      }

      // Save scroll position periodically
      const handleScroll = () => {
        if (contentRef.current) {
          sessionStorage.setItem(
            'reader-scroll-position',
            contentRef.current.scrollTop.toString()
          );
        }
      };

      const interval = setInterval(handleScroll, 2000);
      return () => clearInterval(interval);
    }, []);

    return (
      <>
        <div
          ref={contentRef}
          className="reader-content-wrapper overflow-y-auto"
          style={{ height: 'calc(100vh - 200px)' }}
        >
          <div
            ref={forwardedRef}
            className="reader-content mx-auto py-8 px-6 select-text"
            style={readerStyles}
          >
            {format === 'html' ? (
              <div
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
                className="prose prose-lg max-w-none select-text"
              />
            ) : (
              <pre
                className="whitespace-pre-wrap font-inherit select-text"
                style={{ fontFamily: 'inherit' }}
                dangerouslySetInnerHTML={{ __html: highlightedContent }}
              />
            )}
          </div>
        </div>

        {hoveredAnnotation && (
          <HighlightTooltip
            annotation={hoveredAnnotation.annotation}
            position={hoveredAnnotation.position}
            onMouseEnter={clearHideTimeout}
            onMouseLeave={scheduleHide}
          />
        )}
      </>
    );
  }
);

ReaderContent.displayName = 'ReaderContent';
