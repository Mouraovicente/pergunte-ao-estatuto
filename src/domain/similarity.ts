/**
 * Similaridade de cosseno entre dois vetores de mesma dimensao.
 *
 * Modulo puro: usado tanto para ranquear chunks recuperados quanto para
 * decidir, em application/ask.ts, se a base cobre a pergunta.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vetores precisam ter a mesma dimensao para calcular a similaridade de cosseno.');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
