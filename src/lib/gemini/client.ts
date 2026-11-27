import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in environment variables.');
  }
  return new GoogleGenerativeAI(apiKey || 'placeholder-key');
}

// Available Flash models in order of preference
const FLASH_MODELS = [
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite',
];

/**
 * Generates chat completion with automatic fallback across available Flash models.
 */
export async function generateGroundedResponse(prompt: string): Promise<string> {
  const genAI = getGenAI();
  const configuredModel = process.env.GEMINI_CHAT_MODEL;
  const modelsToTry = configuredModel ? [configuredModel, ...FLASH_MODELS] : FLASH_MODELS;

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text() || 'No response generated.';
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${modelName} failed (${err.message}), trying fallback...`);
    }
  }

  throw lastError || new Error('All Gemini chat models failed.');
}

/**
 * Returns the Gemini Embedding model.
 * Uses gemini-embedding-001 (or custom from env) constrained to 768 dimensions for pgvector.
 */
export function getEmbeddingModel() {
  const genAI = getGenAI();
  const modelName = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
  return genAI.getGenerativeModel({
    model: modelName,
  });
}

/**
 * Generates a 768-dimensional embedding vector for a single string.
 */
export async function createEmbedding(text: string, title?: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await model.embedContent({
    content: {
      role: 'user',
      parts: [{ text }],
    },
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title,
    outputDimensionality: 768,
  } as any);

  return result.embedding.values;
}

/**
 * Generates an embedding for a user query.
 * RETRIEVAL_QUERY taskType optimizes embedding vector for question similarity matching.
 */
export async function createQueryEmbedding(query: string): Promise<number[]> {
  const model = getEmbeddingModel();
  const result = await model.embedContent({
    content: {
      role: 'user',
      parts: [{ text: query }],
    },
    taskType: TaskType.RETRIEVAL_QUERY,
    outputDimensionality: 768,
  } as any);

  return result.embedding.values;
}

/**
 * Batch generates embeddings for an array of document chunks.
 * Uses gemini-embedding-001 with outputDimensionality: 768.
 */
export async function createBatchEmbeddings(
  chunks: { text: string; title?: string }[]
): Promise<number[][]> {
  const model = getEmbeddingModel();
  const batchSize = 30;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    try {
      const result = await model.batchEmbedContents({
        requests: batch.map((item) => ({
          content: {
            role: 'user',
            parts: [{ text: item.text }],
          },
          taskType: TaskType.RETRIEVAL_DOCUMENT,
          title: item.title,
          outputDimensionality: 768,
        } as any)),
      });

      for (const item of result.embeddings) {
        allEmbeddings.push(item.values);
      }
    } catch (batchErr) {
      console.warn('batchEmbedContents failed, falling back to parallel embedContent:', batchErr);
      const individualResults = await Promise.all(
        batch.map((item) => createEmbedding(item.text, item.title))
      );
      allEmbeddings.push(...individualResults);
    }
  }

  return allEmbeddings;
}
