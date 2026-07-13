import type { LLM, VectorStore } from '../application/ports.js';
import { MemoryVectorStore } from './memory-store.js';
import { Neo4jVectorStore } from './neo4j-store.js';
import { OpenRouterLLM } from './openrouter.js';
import { TemplateFakeLLM } from './fake-llm.js';

export type EnvLike = Record<string, string | undefined>;

/**
 * Seleciona o VectorStore de acordo com a variavel de ambiente
 * VECTOR_STORE ("memory" | "neo4j"). Por padrao usa o store in-memory,
 * que nao exige nenhuma dependencia externa.
 */
export function createStore(env: EnvLike = process.env): VectorStore {
  if (env.VECTOR_STORE === 'neo4j') {
    return new Neo4jVectorStore({
      uri: env.NEO4J_URI,
      user: env.NEO4J_USER,
      password: env.NEO4J_PASSWORD,
    });
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
