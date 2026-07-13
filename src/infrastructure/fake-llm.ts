import type { LLM } from '../application/ports.js';

const FIRST_CITATION_PATTERN = /\[Art\.\s*(\d+º?)\]/;

/**
 * LLM fake de demonstracao (LLM=fake, padrao): nao depende de chave de API
 * nem de rede. Devolve uma resposta-template citando o artigo do topo do
 * contexto recuperado (o primeiro "[Art. N]" que aparece no prompt),
 * permitindo demonstrar o fluxo completo sem custo nem chave configurada.
 */
export class TemplateFakeLLM implements LLM {
  async generate(prompt: string): Promise<string> {
    const match = prompt.match(FIRST_CITATION_PATTERN);
    const article = match?.[1] ?? '1º';
    return `De acordo com o estatuto, [Art. ${article}] traz a informação aplicável a essa pergunta.`;
  }
}
