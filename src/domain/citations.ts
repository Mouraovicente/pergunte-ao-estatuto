/**
 * Extracao e validacao de citacoes de artigo (formato "[Art. N]") em uma
 * resposta gerada pelo LLM. Modulo puro: e a base do guard fail-closed
 * usado em application/ask.ts para nunca deixar passar uma citacao que
 * nao esteja no contexto efetivamente recuperado.
 */

const CITATION_PATTERN = /\[Art\.\s*(\d+º?)\]/g;

/** Retorna, sem duplicatas, os numeros de artigo citados no formato "[Art. N]". */
export function extractCitedArticles(answer: string): string[] {
  const cited = new Set<string>();
  for (const match of answer.matchAll(CITATION_PATTERN)) {
    cited.add(match[1]);
  }
  return [...cited];
}

/**
 * Valida se a resposta cita pelo menos um artigo e se todos os artigos
 * citados pertencem ao conjunto de artigos efetivamente recuperados.
 *
 * Fail-closed: uma resposta sem nenhuma citacao, ou que cite qualquer
 * artigo fora do contexto recuperado, e considerada invalida.
 */
export function hasOnlyValidCitations(answer: string, availableArticles: readonly string[]): boolean {
  const cited = extractCitedArticles(answer);
  if (cited.length === 0) {
    return false;
  }
  return cited.every((article) => availableArticles.includes(article));
}
