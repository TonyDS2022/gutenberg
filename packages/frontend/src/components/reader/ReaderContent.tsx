import { useEffect, useRef, useMemo, forwardRef } from 'react';
import { useReaderStore, getFontFamilyCSS } from '../../stores/readerStore';
import type { Annotation } from '@gutenberg-reader/shared';

interface ReaderContentProps {
  content: string;
  format: 'text' | 'html';
  annotations?: Annotation[];
}

export const ReaderContent = forwardRef<HTMLDivElement, ReaderContentProps>(
  ({ content, format, annotations = [] }, forwardedRef) => {
    const { fontFamily, fontSize, lineHeight, maxWidth } = useReaderStore();
    const contentRef = useRef<HTMLDivElement>(null);

  const readerStyles = {
    fontFamily: getFontFamilyCSS(fontFamily),
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}`,
    maxWidth: `${maxWidth}px`,
  };

  // Note: Visual highlights are temporarily disabled to ensure text selection works correctly
  // Annotations are still saved and visible in the sidebar
  // TODO: Implement non-intrusive highlighting using canvas overlay or similar technique

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
            dangerouslySetInnerHTML={{ __html: content }}
            className="prose prose-lg max-w-none select-text"
          />
        ) : (
          <pre
            className="whitespace-pre-wrap font-inherit select-text"
            style={{ fontFamily: 'inherit' }}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  );
});

ReaderContent.displayName = 'ReaderContent';
