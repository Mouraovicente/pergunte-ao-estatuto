import { beforeEach, describe, expect, it, vi } from 'vitest';

const extractorMock = vi.fn(async () => ({ data: Float32Array.from([0.1, 0.2, 0.3]) }));
const pipelineMock = vi.fn(async () => extractorMock);

// @xenova/transformers baixaria um modelo real da internet; nos testes ele e
// sempre mockado para manter a suite 100% offline e deterministica.
vi.mock('@xenova/transformers', () => ({
  pipeline: pipelineMock,
}));

const { XenovaEmbedder } = await import('../../src/infrastructure/embeddings.js');

describe('XenovaEmbedder', () => {
  beforeEach(() => {
    pipelineMock.mockClear();
    extractorMock.mockClear();
  });

  it('carrega o pipeline de feature-extraction com o modelo padrao', async () => {
    const embedder = new XenovaEmbedder();

    await embedder.embed('algum texto do estatuto');

    expect(pipelineMock).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  });

  it('reutiliza o pipeline carregado entre chamadas (nao recarrega o modelo)', async () => {
    const embedder = new XenovaEmbedder();

    await embedder.embed('primeiro texto');
    await embedder.embed('segundo texto');

    expect(pipelineMock).toHaveBeenCalledTimes(1);
    expect(extractorMock).toHaveBeenCalledTimes(2);
  });

  it('converte a saida do pipeline (tensor) em um array de numeros', async () => {
    const embedder = new XenovaEmbedder();

    const result = await embedder.embed('texto qualquer');

    expect(result).toHaveLength(3);
    result.forEach((value, index) => expect(value).toBeCloseTo([0.1, 0.2, 0.3][index], 5));
    expect(extractorMock).toHaveBeenCalledWith('texto qualquer', { pooling: 'mean', normalize: true });
  });
});
