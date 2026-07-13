import type { LLM } from '../../src/application/ports.js';

/**
 * LLM fake para testes: registra os prompts recebidos (para assertar que
 * o LLM nao foi chamado em caminhos de recusa) e responde com um texto
 * fixo ou computado a partir do prompt.
 */
export class FakeLLM implements LLM {
  public readonly calls: string[] = [];

  constructor(private readonly response: string | ((prompt: string) => string)) {}

  async generate(prompt: string): Promise<string> {
    this.calls.push(prompt);
    return typeof this.response === 'function' ? this.response(prompt) : this.response;
  }
}
