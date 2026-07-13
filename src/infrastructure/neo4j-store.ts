import neo4j, { type Driver } from 'neo4j-driver';
import { cosineSimilarity } from '../domain/similarity.js';
import type { VectorStore, VectorStoreItem, VectorStoreResult } from '../application/ports.js';

export interface Neo4jVectorStoreOptions {
  uri?: string;
  user?: string;
  password?: string;
}

/**
 * Vector store opcional baseado em Neo4j (VECTOR_STORE=neo4j). Persiste
 * cada chunk como um no `:Chunk` e calcula a similaridade de cosseno em
 * memoria apos buscar todos os nos — suficiente para o volume pequeno de
 * artigos de um estatuto. Requer uma instancia Neo4j (ver docker-compose.yml).
 */
export class Neo4jVectorStore implements VectorStore {
  private readonly driver: Driver;

  constructor(options: Neo4jVectorStoreOptions = {}) {
    const uri = options.uri ?? process.env.NEO4J_URI ?? 'bolt://localhost:7687';
    const user = options.user ?? process.env.NEO4J_USER ?? 'neo4j';
    const password = options.password ?? process.env.NEO4J_PASSWORD ?? 'password';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async upsert(items: VectorStoreItem[]): Promise<void> {
    const session = this.driver.session();
    try {
      for (const item of items) {
        await session.run(
          `MERGE (c:Chunk {id: $id})
           SET c.article = $article, c.text = $text, c.embedding = $embedding`,
          item,
        );
      }
    } finally {
      await session.close();
    }
  }

  async query(embedding: number[], topK: number): Promise<VectorStoreResult[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        'MATCH (c:Chunk) RETURN c.id AS id, c.article AS article, c.text AS text, c.embedding AS embedding',
      );

      const scored: VectorStoreResult[] = result.records.map((record) => ({
        id: record.get('id') as string,
        article: record.get('article') as string,
        text: record.get('text') as string,
        score: cosineSimilarity(embedding, record.get('embedding') as number[]),
      }));

      scored.sort((a, b) => b.score - a.score);
      return scored.slice(0, topK);
    } finally {
      await session.close();
    }
  }

  async size(): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run('MATCH (c:Chunk) RETURN count(c) AS total');
      return Number(result.records[0]?.get('total') ?? 0);
    } finally {
      await session.close();
    }
  }

  /** Encerra a conexao com o Neo4j. Util ao finalizar a aplicacao (CLI/API). */
  async close(): Promise<void> {
    await this.driver.close();
  }
}
