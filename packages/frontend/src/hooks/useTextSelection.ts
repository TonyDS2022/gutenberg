import { useState, useEffect, useCallback, useRef, RefObject } from 'react';

export interface TextSelection {
  text: string;
  startOffset: number;
  endOffset: number;
  clientRect: DOMRect | null;
}

interface UseTextSelectionOptions {
  containerRef: RefObject<HTMLElement>;
  originalContent: string;
  onSelectionChange?: (selection: TextSelection | null) => void;
}

export const useTextSelection = ({ containerRef, originalContent, onSelectionChange }: UseTextSelectionOptions) => {
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const isDraggingRef = useRef(false);
  const lastSelectionRef = useRef<TextSelection | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const calculateOffset = useCallback((node: Node, offset: number): number => {
    if (!containerRef.current) return 0;

    let totalOffset = 0;
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode: Node | null = walker.nextNode();

    while (currentNode) {
      if (currentNode === node) {
        return totalOffset + offset;
      }
      totalOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    return totalOffset;
  }, [containerRef]);

  const processSelection = useCallback(() => {
    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.isCollapsed || !containerRef.current) {
      // Only clear if not currently dragging
      if (!isDraggingRef.current) {
        lastSelectionRef.current = null;
        setSelection(null);
        onSelectionChange?.(null);
      }
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (selectedText.length === 0) {
      if (!isDraggingRef.current) {
        lastSelectionRef.current = null;
        setSelection(null);
        onSelectionChange?.(null);
      }
      return;
    }

    // Check if selection is within the container
    const range = windowSelection.getRangeAt(0);

    // Verify both start and end of selection are within the container
    if (!containerRef.current.contains(range.startContainer) ||
        !containerRef.current.contains(range.endContainer)) {
      return; // Silently ignore selections outside container
    }

    // Additional check: make sure the selection didn't leak outside
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    // Get bounding rectangle for positioning popup
    const clientRect = range.getBoundingClientRect();

    // Calculate offsets using TreeWalker
    const startOffset = calculateOffset(range.startContainer, range.startOffset);
    const endOffset = calculateOffset(range.endContainer, range.endOffset);

    // Sanity check on offsets
    if (startOffset < 0 || endOffset < 0 || startOffset >= endOffset) {
      return;
    }

    const textSelection: TextSelection = {
      text: selectedText,
      startOffset,
      endOffset,
      clientRect,
    };

    // Only update if selection actually changed
    const hasChanged = !lastSelectionRef.current ||
      lastSelectionRef.current.text !== textSelection.text ||
      lastSelectionRef.current.startOffset !== textSelection.startOffset ||
      lastSelectionRef.current.endOffset !== textSelection.endOffset;

    if (hasChanged) {
      lastSelectionRef.current = textSelection;
      setSelection(textSelection);
      onSelectionChange?.(textSelection);
    }
  }, [containerRef, calculateOffset, onSelectionChange]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Check if mousedown is within the content area
      if (containerRef.current?.contains(e.target as Node)) {
        isDraggingRef.current = true;
      }
    };

    const handleMouseUp = () => {
      const wasDragging = isDraggingRef.current;
      isDraggingRef.current = false;

      // Only process selection after drag completes
      if (wasDragging) {
        setTimeout(() => {
          processSelection();
        }, 10);
      }
    };

    const handleMouseMove = () => {
      // During drag, throttle updates to avoid flickering
      if (isDraggingRef.current && !throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          processSelection();
          throttleTimerRef.current = null;
        }, 100); // Update at most every 100ms during drag
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Clear selection if clicking outside content area
      if (!isDraggingRef.current && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const windowSelection = window.getSelection();
        if (windowSelection && !windowSelection.isCollapsed) {
          // Don't clear if there's still a valid selection
          const range = windowSelection.getRangeAt(0);
          if (!containerRef.current.contains(range.commonAncestorContainer)) {
            lastSelectionRef.current = null;
            setSelection(null);
            onSelectionChange?.(null);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClickOutside);

      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [processSelection, containerRef, onSelectionChange]);

  return {
    selection,
    clearSelection,
  };
};
