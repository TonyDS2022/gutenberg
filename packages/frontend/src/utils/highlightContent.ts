import type { Annotation } from '@gutenberg-reader/shared';

interface HighlightRange {
  start: number;
  end: number;
  annotationIds: string[];
  color: string;
}

/**
 * Resolves overlapping annotations into non-overlapping ranges.
 * When annotations overlap, the most recently created annotation's color is used.
 */
export function resolveOverlappingAnnotations(annotations: Annotation[]): HighlightRange[] {
  if (annotations.length === 0) return [];

  type Event = { offset: number; type: 'start' | 'end'; annotation: Annotation };
  const events: Event[] = [];

  for (const a of annotations) {
    events.push({ offset: a.startOffset, type: 'start', annotation: a });
    events.push({ offset: a.endOffset, type: 'end', annotation: a });
  }

  // Sort by offset, with 'end' before 'start' at same offset to avoid zero-length ranges
  events.sort((a, b) => {
    if (a.offset !== b.offset) return a.offset - b.offset;
    return a.type === 'end' ? -1 : 1;
  });

  const ranges: HighlightRange[] = [];
  const activeAnnotations: Annotation[] = [];
  let lastOffset = 0;

  for (const event of events) {
    if (activeAnnotations.length > 0 && event.offset > lastOffset) {
      ranges.push({
        start: lastOffset,
        end: event.offset,
        annotationIds: activeAnnotations.map(a => a.id),
        color: getMostRecentColor(activeAnnotations),
      });
    }

    if (event.type === 'start') {
      activeAnnotations.push(event.annotation);
    } else {
      const idx = activeAnnotations.findIndex(a => a.id === event.annotation.id);
      if (idx >= 0) activeAnnotations.splice(idx, 1);
    }

    lastOffset = event.offset;
  }

  return ranges;
}

function getMostRecentColor(annotations: Annotation[]): string {
  return annotations.reduce((latest, a) => {
    const latestDate = new Date(latest.createdAt);
    const currentDate = new Date(a.createdAt);
    return currentDate > latestDate ? a : latest;
  }).color;
}

/**
 * Creates a mark element string with the annotation data attributes and styling.
 */
function createMarkOpen(annotationIds: string[], color: string): string {
  // Apply color with 40% opacity (66 in hex = ~40%)
  const backgroundColor = color + '66';
  return `<mark data-annotation-id="${annotationIds[0]}" data-annotation-ids="${annotationIds.join(',')}" style="background-color: ${backgroundColor};">`;
}

function createMarkClose(): string {
  return '</mark>';
}

/**
 * Escapes HTML special characters in text content.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Applies highlights to plain text content.
 * Returns HTML string with <mark> elements wrapping annotated text.
 */
export function applyHighlightsToText(content: string, annotations: Annotation[]): string {
  if (annotations.length === 0) {
    return escapeHtml(content);
  }

  const ranges = resolveOverlappingAnnotations(annotations);
  if (ranges.length === 0) {
    return escapeHtml(content);
  }

  // Build result by iterating through content
  let result = '';
  let lastIndex = 0;

  for (const range of ranges) {
    // Add unhighlighted text before this range
    if (range.start > lastIndex) {
      result += escapeHtml(content.slice(lastIndex, range.start));
    }

    // Add highlighted text
    const highlightedText = content.slice(range.start, range.end);
    result += createMarkOpen(range.annotationIds, range.color);
    result += escapeHtml(highlightedText);
    result += createMarkClose();

    lastIndex = range.end;
  }

  // Add remaining unhighlighted text
  if (lastIndex < content.length) {
    result += escapeHtml(content.slice(lastIndex));
  }

  return result;
}

interface TextNodeInfo {
  node: Text;
  startOffset: number;
  endOffset: number;
}

/**
 * Builds a map of text nodes with their character offsets.
 */
function buildTextNodeMap(root: Element): TextNodeInfo[] {
  const textNodes: TextNodeInfo[] = [];
  let currentOffset = 0;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node = walker.nextNode();

  while (node) {
    const length = node.textContent?.length || 0;
    if (length > 0) {
      textNodes.push({
        node: node as Text,
        startOffset: currentOffset,
        endOffset: currentOffset + length,
      });
      currentOffset += length;
    }
    node = walker.nextNode();
  }

  return textNodes;
}

/**
 * Wraps a range of text nodes with a mark element.
 * Handles ranges that span multiple text nodes.
 */
function wrapRangeInMark(
  doc: Document,
  textNodes: TextNodeInfo[],
  range: HighlightRange
): void {
  // Find all text nodes that intersect with this range
  const intersectingNodes = textNodes.filter(
    info => info.endOffset > range.start && info.startOffset < range.end
  );

  if (intersectingNodes.length === 0) return;

  // Process nodes in reverse order to preserve offsets
  for (let i = intersectingNodes.length - 1; i >= 0; i--) {
    const nodeInfo = intersectingNodes[i];
    const node = nodeInfo.node;

    // Calculate the portion of this text node that should be highlighted
    const nodeStart = Math.max(0, range.start - nodeInfo.startOffset);
    const nodeEnd = Math.min(node.length, range.end - nodeInfo.startOffset);

    if (nodeStart >= nodeEnd) continue;

    // Split the text node and wrap the middle part
    const textContent = node.textContent || '';

    // Create mark element
    const mark = doc.createElement('mark');
    mark.setAttribute('data-annotation-id', range.annotationIds[0]);
    mark.setAttribute('data-annotation-ids', range.annotationIds.join(','));
    mark.style.backgroundColor = range.color + '66';

    if (nodeStart === 0 && nodeEnd === node.length) {
      // Wrap the entire node
      node.parentNode?.insertBefore(mark, node);
      mark.appendChild(node);
    } else if (nodeStart === 0) {
      // Wrap from beginning
      const highlighted = node.splitText(nodeEnd);
      highlighted.parentNode?.insertBefore(node, highlighted);
      node.parentNode?.insertBefore(mark, node);
      mark.appendChild(node);
    } else if (nodeEnd === node.length) {
      // Wrap to end
      const highlighted = node.splitText(nodeStart);
      highlighted.parentNode?.insertBefore(mark, highlighted);
      mark.appendChild(highlighted);
    } else {
      // Wrap middle portion
      const middle = node.splitText(nodeStart);
      const after = middle.splitText(nodeEnd - nodeStart);
      middle.parentNode?.insertBefore(mark, middle);
      mark.appendChild(middle);
    }
  }
}

/**
 * Applies highlights to HTML content.
 * Parses the HTML, applies marks, and returns the modified HTML string.
 */
export function applyHighlightsToHtml(htmlContent: string, annotations: Annotation[]): string {
  if (annotations.length === 0) {
    return htmlContent;
  }

  const ranges = resolveOverlappingAnnotations(annotations);
  if (ranges.length === 0) {
    return htmlContent;
  }

  // Parse HTML into DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
  const root = doc.body.firstElementChild as Element;

  if (!root) {
    return htmlContent;
  }

  // Build text node map
  const textNodes = buildTextNodeMap(root);

  // Apply highlights in reverse order to preserve offsets
  const sortedRanges = [...ranges].sort((a, b) => b.start - a.start);

  for (const range of sortedRanges) {
    wrapRangeInMark(doc, textNodes, range);
  }

  return root.innerHTML;
}
