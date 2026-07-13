import { describe, expect, it } from 'vitest';
import { extractCitedArticles, hasOnlyValidCitations } from '../../src/domain/citations.js';

describe('extractCitedArticles', () => {
  it('extrai todos os artigos citados no formato [Art. N]', () => {
    const answer = 'Os associados podem votar [Art. 2º] e devem pagar a contribuicao [Art. 3º].';
    expect(extractCitedArticles(answer)).toEqual(['2º', '3º']);
  });

  it('remove citacoes duplicadas', () => {
    const answer = 'Conforme [Art. 2º], e tambem [Art. 2º] mais adiante.';
    expect(extractCitedArticles(answer)).toEqual(['2º']);
  });

  it('retorna lista vazia quando nao ha nenhuma citacao', () => {
    expect(extractCitedArticles('Resposta sem nenhuma citacao de artigo.')).toEqual([]);
  });
});

describe('hasOnlyValidCitations', () => {
  const availableArticles = ['1º', '2º', '3º'];

  it('retorna true quando todos os artigos citados estao no contexto recuperado', () => {
    const answer = 'Isso e garantido pelo [Art. 2º].';
    expect(hasOnlyValidCitations(answer, availableArticles)).toBe(true);
  });

  it('retorna false (fail-closed) quando um artigo citado nao esta no contexto recuperado', () => {
    const answer = 'Isso esta previsto no [Art. 9º], que nao foi recuperado.';
    expect(hasOnlyValidCitations(answer, availableArticles)).toBe(false);
  });

  it('retorna false (fail-closed) quando a resposta nao cita nenhum artigo', () => {
    const answer = 'Essa e a resposta, sem citar nenhum artigo do estatuto.';
    expect(hasOnlyValidCitations(answer, availableArticles)).toBe(false);
  });
});
