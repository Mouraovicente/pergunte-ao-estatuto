import { chunkByArticle } from '../domain/chunker.js';
import type { Embedder, VectorStore, VectorStoreItem } from './ports.js';

export interface IngestDeps {
  embedder: Embedder;
  store: VectorStore;
  /** Identifica o documento de origem (ex.: caminho do arquivo). Usado para gerar ids estaveis por artigo. */
  sourceId: string;
}

export interface IngestResult {
  /** Quantidade de artigos (chunks) indexados a partir do documento. */
  chunks: number;
}

/**
 * Le um documento (.md/.txt ja carregado em memoria), divide por artigo,
 * gera o embedding de cada chunk e indexa no vector store.
 *
 * Idempotente: reingerir o mesmo `sourceId` substitui os chunks
 * existentes em vez de duplica-los, pois cada chunk recebe um id
 * estavel (`${sourceId}#${article}`).
 */
export async function ingest(rawText: string, deps: IngestDeps): Promise<IngestResult> {
  const { embedder, store, sourceId } = deps;

  const articleChunks = chunkByArticle(rawText);

  const items: VectorStoreItem[] = [];
  for (const chunk of articleChunks) {
    const embedding = await embedder.embed(chunk.text);
    items.push({
      id: `${sourceId}#${chunk.article}`,
      article: chunk.article,
      text: chunk.text,
      embedding,
    });
  }

  await store.upsert(items);

  return { chunks: items.length };
}
