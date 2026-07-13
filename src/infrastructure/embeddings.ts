import { pipeline } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';
import type { Embedder } from '../application/ports.js';

const DEFAULT_MODEL = 'Xenova/all-MiniLM-L6-v2';

/**
 * Embedder local baseado em @xenova/transformers (roda inteiramente no
 * processo Node, sem chamadas de rede em tempo de inferencia — apenas o
 * download do modelo na primeira execucao, que fica em cache local).
 *
 * O pipeline e carregado de forma preguicosa (lazy) e reutilizado entre
 * chamadas, evitando recarregar o modelo a cada `embed`.
 */
export class XenovaEmbedder implements Embedder {
  private pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

  constructor(private readonly modelName: string = DEFAULT_MODEL) {}

  private getPipeline(): Promise<FeatureExtractionPipeline> {
    if (!this.pipelinePromise) {
      this.pipelinePromise = pipeline('feature-extraction', this.modelName);
    }
    return this.pipelinePromise;
  }

  async embed(text: string): Promise<number[]> {
    const extractor = await this.getPipeline();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as ArrayLike<number>);
  }
}
