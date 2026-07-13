import { extractCitedArticles, hasOnlyValidCitations } from '../domain/citations.js';
import type { Embedder, LLM, VectorStore, VectorStoreResult } from './ports.js';

export const REFUSAL_MESSAGE = 'Não encontrei base no documento para responder isso.';

/** Similaridade minima do melhor trecho recuperado para tentar responder. Abaixo disso, recusa sem chamar o LLM. */
export const DEFAULT_SCORE_THRESHOLD = 0.35;

/** Quantidade de trechos recuperados para compor o contexto do prompt. */
export const DEFAULT_TOP_K = 4;

export interface AskDeps {
  embedder: Embedder;
  store: VectorStore;
  llm: LLM;
  /** Similaridade minima do melhor trecho para tentar responder (default: DEFAULT_SCORE_THRESHOLD). */
  scoreThreshold?: number;
  /** Quantos trechos recuperar do vector store (default: DEFAULT_TOP_K). */
  topK?: number;
}

export interface Citation {
  article: string;
  excerpt: string;
  score: number;
}

export interface AskResult {
  answer: string;
  citations: Citation[];
  refused: boolean;
}

function buildPrompt(question: string, context: VectorStoreResult[]): string {
  const trechos = context.map((chunk) => `[Art. ${chunk.article}] ${chunk.text}`).join('\n\n');
  return [
    'Voce e um assistente que responde perguntas exclusivamente com base nos trechos do estatuto abaixo.',
    'Regras obrigatorias:',
    '- Cite o artigo entre colchetes, no formato [Art. N], em toda afirmacao que fizer.',
    '- Nao invente nem infira informacoes que nao estejam explicitamente nos trechos.',
    '- Se os trechos nao permitirem responder com seguranca, diga isso claramente.',
    '',
    'Trechos recuperados:',
    trechos,
    '',
    `Pergunta: ${question}`,
  ].join('\n');
}

function refusal(): AskResult {
  return { answer: REFUSAL_MESSAGE, citations: [], refused: true };
}

/**
 * Caso de uso principal: responde a uma pergunta com base nos trechos
 * recuperados, citando o artigo em cada afirmacao, ou recusa quando a
 * base nao cobre a pergunta (fail-closed).
 */
export async function ask(question: string, deps: AskDeps): Promise<AskResult> {
  const { embedder, store, llm, scoreThreshold = DEFAULT_SCORE_THRESHOLD, topK = DEFAULT_TOP_K } = deps;

  const questionEmbedding = await embedder.embed(question);
  const retrieved = await store.query(questionEmbedding, topK);
  const maxScore = retrieved.reduce((max, chunk) => Math.max(max, chunk.score), 0);

  if (retrieved.length === 0 || maxScore < scoreThreshold) {
    // Base insuficiente: recusa sem sequer chamar o LLM.
    return refusal();
  }

  const prompt = buildPrompt(question, retrieved);
  const answer = await llm.generate(prompt);

  const availableArticles = retrieved.map((chunk) => chunk.article);
  if (!hasOnlyValidCitations(answer, availableArticles)) {
    // O LLM citou um artigo fora do contexto (ou nao citou nenhum): recusa, fail-closed.
    return refusal();
  }

  const citedArticles = extractCitedArticles(answer);
  const citations: Citation[] = retrieved
    .filter((chunk) => citedArticles.includes(chunk.article))
    .map((chunk) => ({ article: chunk.article, excerpt: chunk.text, score: chunk.score }));

  return { answer, citations, refused: false };
}
