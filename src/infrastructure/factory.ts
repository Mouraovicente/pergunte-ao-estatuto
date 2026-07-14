import type { LLM, VectorStore } from '../application/ports.js';
import { FileVectorStore } from './file-store.js';
import { MemoryVectorStore } from './memory-store.js';
import { Neo4jVectorStore } from './neo4j-store.js';
import { OpenRouterLLM } from './openrouter.js';
import { TemplateFakeLLM } from './fake-llm.js';

export type EnvLike = Record<string, string | undefined>;

/**
 * Seleciona o VectorStore de acordo com a variavel de ambiente
 * VECTOR_STORE ("memory" | "file" | "neo4j"). Quando ela nao esta
 * definida, usa o `fallback` informado pelo ponto de entrada: a CLI
 * usa "file" (para que ingest e ask funcionem em processos separados)
 * e a API usa "memory" (processo unico, vive enquanto o servidor roda).
 */
export function createStore(env: EnvLike = process.env, fallback: 'memory' | 'file' = 'memory'): VectorStore {
  const kind = env.VECTOR_STORE ?? fallback;

  if (kind === 'neo4j') {
    return new Neo4jVectorStore({
      uri: env.NEO4J_URI,
      user: env.NEO4J_USER,
      password: env.NEO4J_PASSWORD,
    });
  }
  if (kind === 'file') {
    return new FileVectorStore(env.VECTOR_STORE_FILE);
  }
  return new MemoryVectorStore();
}

/**
 * Seleciona o LLM de acordo com a variavel de ambiente LLM
 * ("fake" | "openrouter"). Por padrao usa o fake de demonstracao, que
 * nao exige chave de API nem acesso a rede.
 */
export function createLLM(env: EnvLike = process.env): LLM {
  if (env.LLM === 'openrouter') {
    return new OpenRouterLLM({ apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL });
  }
  return new TemplateFakeLLM();
}
