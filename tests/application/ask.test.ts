import { describe, expect, it } from 'vitest';
import { ask, REFUSAL_MESSAGE } from '../../src/application/ask.js';
import { ingest } from '../../src/application/ingest.js';
import { MemoryVectorStore } from '../../src/infrastructure/memory-store.js';
import { FakeEmbedder } from '../helpers/fake-embedder.js';
import { FakeLLM } from '../helpers/fake-llm.js';

const ESTATUTO = [
  'Art. 1º O objetivo da associacao e representar os moradores do bairro.',
  'Art. 2º Sao direitos dos associados votar e ser votado nas assembleias.',
  'Art. 3º Sao deveres dos associados pagar a contribuicao mensal em dia.',
].join('\n');

const DIMENSION = 3;
const QUESTION_SOBRE_DIREITOS = 'Quais sao os direitos dos associados?';
const QUESTION_SEM_BASE = 'Qual e a previsao do tempo para amanha?';

async function setup(vectors: Record<string, number[]>) {
  const store = new MemoryVectorStore();
  const embedder = new FakeEmbedder(vectors, DIMENSION);
  await ingest(ESTATUTO, { embedder, store, sourceId: 'estatuto.md' });
  return { store, embedder };
}

describe('ask', () => {
  it('responde com citacao valida quando a base cobre a pergunta (happy path)', async () => {
    const { store, embedder } = await setup({
      'Art. 1º O objetivo da associacao e representar os moradores do bairro.': [1, 0, 0],
      'Art. 2º Sao direitos dos associados votar e ser votado nas assembleias.': [0, 1, 0],
      'Art. 3º Sao deveres dos associados pagar a contribuicao mensal em dia.': [0, 0, 1],
      [QUESTION_SOBRE_DIREITOS]: [0, 1, 0],
    });
    const llm = new FakeLLM('Os associados podem votar e ser votados nas assembleias. [Art. 2º]');

    const result = await ask(QUESTION_SOBRE_DIREITOS, { embedder, store, llm });

    expect(result.refused).toBe(false);
    expect(result.answer).toContain('[Art. 2º]');
    expect(result.citations).toEqual([
      expect.objectContaining({ article: '2º', score: expect.any(Number) }),
    ]);
    expect(llm.calls).toHaveLength(1);
  });

  it('recusa sem chamar o LLM quando o score maximo fica abaixo do threshold', async () => {
    const { store, embedder } = await setup({
      'Art. 1º O objetivo da associacao e representar os moradores do bairro.': [1, 0, 0],
      'Art. 2º Sao direitos dos associados votar e ser votado nas assembleias.': [0, 1, 0],
      'Art. 3º Sao deveres dos associados pagar a contribuicao mensal em dia.': [0, 0, 1],
      // QUESTION_SEM_BASE nao esta mapeada: cai no vetor neutro (fallback zero) do FakeEmbedder.
    });
    const llm = new FakeLLM('isso nunca deveria ser retornado');

    const result = await ask(QUESTION_SEM_BASE, { embedder, store, llm });

    expect(result.refused).toBe(true);
    expect(result.answer).toBe(REFUSAL_MESSAGE);
    expect(result.citations).toEqual([]);
    expect(llm.calls).toHaveLength(0);
  });

  it('recusa (fail-closed) quando o LLM cita um artigo fora do contexto recuperado', async () => {
    const { store, embedder } = await setup({
      'Art. 1º O objetivo da associacao e representar os moradores do bairro.': [1, 0, 0],
      'Art. 2º Sao direitos dos associados votar e ser votado nas assembleias.': [0, 1, 0],
      'Art. 3º Sao deveres dos associados pagar a contribuicao mensal em dia.': [0, 0, 1],
      [QUESTION_SOBRE_DIREITOS]: [0, 1, 0],
    });
    // Artigo 9º nao existe no estatuto e nao foi recuperado: citacao invalida.
    const llm = new FakeLLM('Isso esta previsto no [Art. 9º] do estatuto.');

    const result = await ask(QUESTION_SOBRE_DIREITOS, { embedder, store, llm });

    expect(result.refused).toBe(true);
    expect(result.answer).toBe(REFUSAL_MESSAGE);
    expect(result.citations).toEqual([]);
    expect(llm.calls).toHaveLength(1);
  });
});
