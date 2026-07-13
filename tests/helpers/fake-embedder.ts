import type { Embedder } from '../../src/application/ports.js';

/**
 * Embedder deterministico para testes: mapeia textos conhecidos para
 * vetores explicitos (controle total sobre a similaridade nos testes)
 * e cai para um vetor "neutro" (baixa similaridade com tudo) para
 * qualquer texto nao mapeado.
 */
export class FakeEmbedder implements Embedder {
  private readonly vectors: Map<string, number[]>;
  private readonly dimension: number;
  private readonly fallback: number[];

  constructor(vectors: Record<string, number[]>, dimension: number) {
    this.vectors = new Map(Object.entries(vectors));
    this.dimension = dimension;
    this.fallback = new Array(dimension).fill(0);
  }

  async embed(text: string): Promise<number[]> {
    const known = this.vectors.get(text);
    if (known) {
      if (known.length !== this.dimension) {
        throw new Error(`Vetor fake para "${text}" nao tem a dimensao esperada (${this.dimension}).`);
      }
      return known;
    }
    return this.fallback;
  }
}
