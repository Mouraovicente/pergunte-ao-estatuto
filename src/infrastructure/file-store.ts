import { readFile, writeFile } from 'node:fs/promises';
import { cosineSimilarity } from '../domain/similarity.js';
import type { VectorStore, VectorStoreItem, VectorStoreResult } from '../application/ports.js';

export const DEFAULT_INDEX_PATH = '.estatuto-index.json';

/**
 * Vector store persistido em um arquivo JSON (VECTOR_STORE=file). E o
 * padrao da CLI: permite rodar `ingest` e depois `ask` em processos
 * separados sem nenhuma dependencia externa (sem Docker, sem banco).
 *
 * - Leitura lazy: o arquivo so e lido no primeiro acesso.
 * - Escrita ao final de cada `upsert` (o ingest chama `upsert` uma vez).
 * - Reingestao substitui chunks com o mesmo id (idempotente), pois o
 *   indice e um mapa por id.
 */
export class FileVectorStore implements VectorStore {
  private items: Map<string, VectorStoreItem> | null = null;

  constructor(private readonly filePath: string = DEFAULT_INDEX_PATH) {}

  private async load(): Promise<Map<string, VectorStoreItem>> {
    if (this.items) {
      return this.items;
    }
    try {
      const raw = await readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as VectorStoreItem[];
      this.items = new Map(parsed.map((item) => [item.id, item]));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Arquivo ainda nao existe: indice comeca vazio.
        this.items = new Map();
      } else {
        throw error;
      }
    }
    return this.items;
  }

  private async persist(items: Map<string, VectorStoreItem>): Promise<void> {
    await writeFile(this.filePath, JSON.stringify([...items.values()]), 'utf-8');
  }

  async upsert(newItems: VectorStoreItem[]): Promise<void> {
    const items = await this.load();
    for (const item of newItems) {
      items.set(item.id, item);
    }
    await this.persist(items);
  }

  async query(embedding: number[], topK: number): Promise<VectorStoreResult[]> {
    const items = await this.load();
    const scored: VectorStoreResult[] = [...items.values()].map((item) => ({
      id: item.id,
      article: item.article,
      text: item.text,
      score: cosineSimilarity(embedding, item.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  async size(): Promise<number> {
    const items = await this.load();
    return items.size;
  }
}
