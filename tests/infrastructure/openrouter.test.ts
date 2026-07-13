import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenRouterLLM } from '../../src/infrastructure/openrouter.js';

describe('OpenRouterLLM', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lanca erro sem chamar a rede quando a API key nao esta configurada', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const llm = new OpenRouterLLM({ apiKey: undefined });

    await expect(llm.generate('pergunta qualquer')).rejects.toThrow(/OPENROUTER_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chama a API do OpenRouter com autenticacao e retorna o conteudo da resposta', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'Resposta com [Art. 2º].' } }] }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const llm = new OpenRouterLLM({ apiKey: 'chave-de-teste', model: 'openai/gpt-4o-mini' });
    const answer = await llm.generate('qual e a resposta?');

    expect(answer).toBe('Resposta com [Art. 2º].');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer chave-de-teste');

    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe('openai/gpt-4o-mini');
    expect(body.messages).toEqual([{ role: 'user', content: 'qual e a resposta?' }]);
  });

  it('lanca erro quando a API responde com status de falha', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const llm = new OpenRouterLLM({ apiKey: 'chave-de-teste' });

    await expect(llm.generate('pergunta')).rejects.toThrow(/500/);
  });
});
