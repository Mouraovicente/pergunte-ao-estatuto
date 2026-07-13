import { describe, expect, it } from 'vitest';
import { cosineSimilarity } from '../../src/domain/similarity.js';

describe('cosineSimilarity', () => {
  it('retorna 1 para vetores identicos', () => {
    const vector = [0.5, 0.2, -0.3, 0.8];
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1, 10);
  });

  it('retorna 0 para vetores ortogonais', () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 10);
  });

  it('lanca erro quando os vetores tem dimensoes diferentes', () => {
    expect(() => cosineSimilarity([1, 0], [1, 0, 0])).toThrow();
  });

  it('retorna 0 quando algum vetor e nulo (evita divisao por zero)', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});
