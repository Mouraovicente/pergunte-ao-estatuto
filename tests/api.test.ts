import { describe, expect, it } from 'vitest';
import { buildServer } from '../src/api.js';
import { ingest } from '../src/application/ingest.js';
import { MemoryVectorStore } from '../src/infrastructure/memory-store.js';
import { FakeEmbedder } from './helpers/fake-embedder.js';
import { FakeLLM } from './helpers/fake-llm.js';

const ESTATUTO = [
  'Art. 1º O objetivo da associacao e representar os moradores do bairro.',
  'Art. 2º Sao direitos dos associados votar e ser votado nas assembleias.',
].join('\n');

const DIMENSION = 2;
const QUESTION = 'Quais sao os direitos dos associados?';

async function buildTestApp(llmResponse: string) {
  const store = new MemoryVectorStore();
  const embedder = new FakeEmbedder(
    {
      'Art. 1º O objetivo da associacao e representar os moradores do bairro.': [1, 0],
      'Art. 2º Sao direitos dos associados votar e ser votado nas assembleias.': [0, 1],
      [QUESTION]: [0, 1],
    },
    DIMENSION,
  );
  await ingest(ESTATUTO, { embedder, store, sourceId: 'estatuto.md' });
  const llm = new FakeLLM(llmResponse);

  return buildServer({ embedder, store, llm });
}

describe('POST /ask', () => {
  it('retorna o formato esperado {answer, citations, refused} no caminho feliz', async () => {
    const app = await buildTestApp('Os associados podem votar. [Art. 2º]');

    const response = await app.inject({ method: 'POST', url: '/ask', payload: { question: QUESTION } });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual({
      answer: 'Os associados podem votar. [Art. 2º]',
      refused: false,
      citations: [{ article: '2º', excerpt: expect.any(String), score: expect.any(Number) }],
    });

    await app.close();
  });

  it('retorna refused=true e citations vazio quando a pergunta e recusada', async () => {
    const app = await buildTestApp('nao deveria ser usado');

    const response = await app.inject({
      method: 'POST',
      url: '/ask',
      payload: { question: 'pergunta totalmente fora do escopo do documento' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.refused).toBe(true);
    expect(body.citations).toEqual([]);
    expect(body.answer).toBe('Não encontrei base no documento para responder isso.');

    await app.close();
  });

  it('retorna 400 quando "question" nao e informado', async () => {
    const app = await buildTestApp('resposta qualquer');

    const response = await app.inject({ method: 'POST', url: '/ask', payload: {} });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
