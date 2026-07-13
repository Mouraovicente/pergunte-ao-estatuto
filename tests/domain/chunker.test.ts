import { describe, expect, it } from 'vitest';
import { chunkByArticle } from '../../src/domain/chunker.js';

describe('chunkByArticle', () => {
  it('divide o texto em um chunk por artigo', () => {
    const source = [
      'Art. 1º O objetivo desta associacao e representar o bairro.',
      'Art. 2º Sao direitos dos associados participar das assembleias.',
      'Art. 3º Sao deveres dos associados pagar a contribuicao mensal.',
    ].join('\n');

    const chunks = chunkByArticle(source);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].article).toBe('1º');
    expect(chunks[1].article).toBe('2º');
    expect(chunks[2].article).toBe('3º');
  });

  it('preserva o numero do artigo no formato "Art. 5º"', () => {
    const source = [
      'Art. 4º Texto do artigo quatro.',
      'Art. 5º Texto do artigo cinco, com detalhes importantes.',
    ].join('\n');

    const chunks = chunkByArticle(source);
    const artigoCinco = chunks.find((chunk) => chunk.article === '5º');

    expect(artigoCinco).toBeDefined();
    expect(artigoCinco?.text).toContain('artigo cinco');
  });

  it('ignora o preambulo anterior ao primeiro artigo', () => {
    const source = [
      'ESTATUTO DA ASSOCIACAO DE BAIRRO JARDIM DAS FLORES',
      'Preambulo com historico da fundacao da associacao.',
      '',
      'Art. 1º Disposicao inicial do estatuto.',
    ].join('\n');

    const chunks = chunkByArticle(source);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).not.toContain('Preambulo');
    expect(chunks[0].text).not.toContain('ESTATUTO DA ASSOCIACAO');
  });
});
