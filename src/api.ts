import Fastify, { type FastifyInstance } from 'fastify';
import { pathToFileURL } from 'node:url';
import { ask, type AskDeps } from './application/ask.js';
import { createLLM, createStore } from './infrastructure/factory.js';
import { XenovaEmbedder } from './infrastructure/embeddings.js';

interface AskRequestBody {
  question?: unknown;
}

/**
 * Constroi a instancia do Fastify com as dependencias injetadas (deps),
 * o que permite testar a API inteira com fakes deterministicos, sem
 * subir nenhum servidor de verdade nem tocar rede.
 */
export function buildServer(deps: AskDeps): FastifyInstance {
  const app = Fastify({ logger: false });

  app.post('/ask', async (request, reply) => {
    const body = request.body as AskRequestBody;
    const question = body?.question;

    if (typeof question !== 'string' || question.trim().length === 0) {
      reply.code(400);
      return { error: 'O campo "question" (string, não vazio) é obrigatório.' };
    }

    return ask(question, deps);
  });

  return app;
}

async function start(): Promise<void> {
  const embedder = new XenovaEmbedder();
  const store = createStore(process.env);
  const llm = createLLM(process.env);

  const app = buildServer({ embedder, store, llm });
  const port = Number(process.env.PORT ?? 3000);

  await app.listen({ port, host: '0.0.0.0' });
  console.log(`pergunte-ao-estatuto API ouvindo na porta ${port}`);
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  start().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
