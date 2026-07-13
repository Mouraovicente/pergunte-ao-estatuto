import { cosineSimilarity } from '../domain/similarity.js';
import type { VectorStore, VectorStoreItem, VectorStoreResult } from '../application/ports.js';

/**
 * Vector store in-memory. Adapter padrao (VECTOR_STORE=memory): nao
 * persiste entre processos, mas nao exige nenhuma dependencia externa.
 */
export class MemoryVectorStore implements VectorStore {
  private readonly items = new Map<string, VectorStoreItem>();

  async upsert(items: VectorStoreItem[]): Promise<void> {
    for (const item of items) {
      // Chave por `id` garante que reingestao substitua o chunk existente
      // em vez de duplica-lo.
      this.items.set(item.id, item);
    }
  }

  async query(embedding: number[], topK: number): Promise<VectorStoreResult[]> {
    const scored: VectorStoreResult[] = [...this.items.values()].map((item) => ({
      id: item.id,
      article: item.article,
      text: item.text,
      score: cosineSimilarity(embedding, item.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async size(): Promise<number> {
    return this.items.size;
  }
}
