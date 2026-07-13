import { describe, expect, it } from 'vitest';
import { TemplateFakeLLM } from '../../src/infrastructure/fake-llm.js';

describe('TemplateFakeLLM', () => {
  it('responde citando o primeiro artigo encontrado no prompt (topo do contexto)', async () => {
    const llm = new TemplateFakeLLM();
    const prompt = [
      'Trechos recuperados:',
      '[Art. 7º] Texto do artigo sete.',
      '',
      '[Art. 12] Texto do artigo doze.',
      '',
      'Pergunta: algo sobre o artigo sete?',
    ].join('\n');

    const answer = await llm.generate(prompt);

    expect(answer).toContain('[Art. 7º]');
  });

  it('nunca chama rede nem depende de chave de API (permite demo offline)', async () => {
    const llm = new TemplateFakeLLM();
    const answer = await llm.generate('[Art. 1º] qualquer trecho\n\nPergunta: teste');
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(0);
  });
});
