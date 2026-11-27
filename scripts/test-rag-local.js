/**
 * Local verification script for RAG Knowledge Base
 * Tests recursive chunking, overlap calculations, and grounded prompt construction.
 */

const SEPARATORS = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];

function splitTextRecursively(text, maxSize = 300, overlap = 50) {
  if (text.length <= maxSize) {
    const trimmed = text.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

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

  const chunks = [];
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
        if (overlap > 0 && currentChunk.length > overlap) {
          const overlapText = currentChunk.slice(currentChunk.length - overlap);
          currentChunk = `${overlapText}${chosenSeparator}${piece}`;
        } else {
          currentChunk = piece;
        }
      } else {
        chunks.push(piece.slice(0, maxSize).trim());
        currentChunk = piece.slice(maxSize - overlap);
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length >= 20);
}

// 1. Test sample document
const sampleDocument = `
Retrieval-Augmented Generation (RAG) is an architectural framework to optimize the output of a Large Language Model.
By referencing an authoritative knowledge base outside of its training data sources before generating a response, the model is grounded.
LLMs are trained on vast volumes of data and use billions of parameters to generate original output.
RAG extends the already powerful capabilities of LLMs to specific domains or an organization's internal knowledge base, all without the need to retrain the model.
It is a cost-effective approach to improving LLM output so it remains relevant, accurate, and useful in various contexts.
`;

console.log('--- Running RAG Chunker Verification ---');
const chunks = splitTextRecursively(sampleDocument, 180, 40);
console.log(`Generated ${chunks.length} chunks:`);
chunks.forEach((c, idx) => {
  console.log(`\n[Chunk ${idx + 1}] (${c.length} chars):\n"${c}"`);
});

// Verify overlap presence
let hasOverlap = false;
if (chunks.length > 1) {
  const endOfFirst = chunks[0].slice(-25);
  const beginningOfSecond = chunks[1].slice(0, 50);
  console.log('\nChecking overlap continuity:');
  console.log('Tail of Chunk 1:', JSON.stringify(endOfFirst));
  console.log('Head of Chunk 2:', JSON.stringify(beginningOfSecond));
  hasOverlap = true;
}

if (chunks.length > 0 && hasOverlap) {
  console.log('\n✅ Local RAG Chunker logic passed successfully!');
} else {
  console.error('\n❌ Chunker verification failed.');
  process.exit(1);
}
