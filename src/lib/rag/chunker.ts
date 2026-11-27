/**
 * Text Chunking Engine
 * Recursively splits document text into semantic chunks while maintaining overlap
 * so sentences crossing boundaries do not lose contextual meaning.
 */

export interface ChunkOptions {
  maxChunkSize?: number; // Target chunk size in characters (default: 1000 ~ 200 tokens)
  chunkOverlap?: number; // Overlap size in characters (default: 150 ~ 30 tokens)
}

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface ChunkResult {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_OVERLAP = 150;
const SEPARATORS = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];

/**
 * Splits raw text recursively using natural text separators.
 */
function splitTextRecursively(
  text: string,
  maxSize: number,
  overlap: number
): string[] {
  if (text.length <= maxSize) {
    const trimmed = text.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  // Find the highest-priority separator present in text
  let chosenSeparator = '';
  for (const sep of SEPARATORS) {
    if (text.includes(sep)) {
      chosenSeparator = sep;
      break;
    }
  }

  const splits = chosenSeparator
    ? text.split(chosenSeparator)
    : text.match(new RegExp(`.{1,${maxSize}}`, 'g')) || [];

  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < splits.length; i++) {
    const piece = splits[i].trim();
    if (!piece) continue;

    const candidate = currentChunk
      ? `${currentChunk}${chosenSeparator}${piece}`
      : piece;

    if (candidate.length <= maxSize) {
      currentChunk = candidate;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        // Calculate overlap tail from currentChunk
        if (overlap > 0 && currentChunk.length > overlap) {
          const overlapText = currentChunk.slice(currentChunk.length - overlap);
          currentChunk = `${overlapText}${chosenSeparator}${piece}`;
        } else {
          currentChunk = piece;
        }
      } else {
        // Piece itself exceeds maxSize, forcefully split or push
        chunks.push(piece.slice(0, maxSize).trim());
        currentChunk = piece.slice(maxSize - overlap);
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length >= 20); // Filter out trivial fragments
}

/**
 * Takes page-by-page extracted text and generates ordered chunks tagged with their source page number.
 */
export function chunkDocumentPages(
  pages: PageText[],
  options: ChunkOptions = {}
): ChunkResult[] {
  const maxSize = options.maxChunkSize || DEFAULT_MAX_SIZE;
  const overlap = options.chunkOverlap || DEFAULT_OVERLAP;

  const results: ChunkResult[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const pageChunks = splitTextRecursively(page.text, maxSize, overlap);
    for (const chunkText of pageChunks) {
      results.push({
        content: chunkText,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
      });
    }
  }

  return results;
}

/**
 * Chunks a single raw string (e.g. from a TXT file).
 */
export function chunkPlainText(
  rawText: string,
  options: ChunkOptions = {}
): ChunkResult[] {
  return chunkDocumentPages(
    [
      {
        pageNumber: 1,
        text: rawText,
      },
    ],
    options
  );
}
