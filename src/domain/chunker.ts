/**
 * Divide o texto de um estatuto/regulamento em um chunk por artigo.
 *
 * Reconhece linhas que comecam com "Art." seguido do numero do artigo
 * (ex.: "Art. 1º", "Art. 10"), preservando o formato exato do numero.
 * Qualquer conteudo antes do primeiro artigo (preambulo, titulo, etc.)
 * e ignorado.
 *
 * Modulo puro: nao faz I/O nem depende de nenhuma infraestrutura.
 */

export interface ArticleChunk {
  /** Numero do artigo, no formato original (ex.: "1º", "10"). */
  article: string;
  /** Texto completo do artigo, incluindo a linha "Art. N ...". */
  text: string;
}

const ARTICLE_LINE = /^Art\.\s*(\d+º?)\.?\s*/;

export function chunkByArticle(source: string): ArticleChunk[] {
  const lines = source.split(/\r?\n/);
  const chunks: ArticleChunk[] = [];
  let current: { article: string; lines: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(ARTICLE_LINE);
    if (match) {
      if (current) {
        chunks.push(finalizeChunk(current));
      }
      current = { article: match[1], lines: [line.trim()] };
    } else if (current) {
      current.lines.push(line);
    }
    // Linhas antes do primeiro "Art." (preambulo) sao descartadas de proposito.
  }

  if (current) {
    chunks.push(finalizeChunk(current));
  }

  return chunks;
}

function finalizeChunk(current: { article: string; lines: string[] }): ArticleChunk {
  return {
    article: current.article,
    text: current.lines.join('\n').trim(),
  };
}
