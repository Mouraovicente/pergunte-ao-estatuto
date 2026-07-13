import type { LLM } from '../application/ports.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export interface OpenRouterLLMOptions {
  apiKey?: string;
  model?: string;
}

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
}

/**
 * Adapter de geracao via OpenRouter (LLM=openrouter). Le a chave de API do
 * ambiente por padrao (OPENROUTER_API_KEY) e nunca chama a rede sem uma
 * chave configurada.
 */
export class OpenRouterLLM implements LLM {
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(options: OpenRouterLLMOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
    this.model = options.model ?? process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL;
  }

  async generate(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada. Defina a variável de ambiente ou use LLM=fake.');
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with status ${response.status}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    return data.choices?.[0]?.message?.content ?? '';
  }
}
