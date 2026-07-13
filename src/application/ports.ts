/**
 * Ports (interfaces) que a camada de aplicacao depende, mas nao implementa.
 * As implementacoes concretas vivem em src/infrastructure e nos testes
 * (fakes deterministicos), seguindo a regra de dependencia da clean
 * architecture: application nao conhece detalhes de infraestrutura.
 */

/** Gera o vetor de embedding de um texto. */
export interface Embedder {
  embed(text: string): Promise<number[]>;
}

/** Um chunk pronto para ser indexado no vector store. */
export interface VectorStoreItem {
  /** Identificador estavel do chunk (ex.: `${sourceId}#${article}`), usado para reingestao idempotente. */
  id: string;
  article: string;
  text: string;
  embedding: number[];
}

/** Resultado de uma busca por similaridade no vector store. */
export interface VectorStoreResult {
  id: string;
  article: string;
  text: string;
  score: number;
}

/** Armazena e recupera chunks por similaridade vetorial. */
export interface VectorStore {
  /** Insere ou substitui chunks existentes (mesmo `id`), garantindo reingestao idempotente. */
  upsert(items: VectorStoreItem[]): Promise<void>;
  /** Retorna os `topK` chunks mais similares ao vetor de consulta, ordenados por score decrescente. */
  query(embedding: number[], topK: number): Promise<VectorStoreResult[]>;
  /** Quantidade total de chunks armazenados (usado para verificar idempotencia). */
  size(): Promise<number>;
}

/** Gera texto a partir de um prompt (chamada ao LLM). */
export interface LLM {
  generate(prompt: string): Promise<string>;
}
