#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ask as askUseCase } from './application/ask.js';
import { ingest } from './application/ingest.js';
import { createLLM, createStore } from './infrastructure/factory.js';
import { XenovaEmbedder } from './infrastructure/embeddings.js';

function printUsage(): void {
  console.error('Uso:');
  console.error('  pergunte-ao-estatuto ingest <arquivo.md>');
  console.error('  pergunte-ao-estatuto ask "<pergunta>"');
}

/**
 * Ponto de entrada da CLI. Recebe os argumentos (sem o node/script) para
 * facilitar testes; usa o processo real (env, stdout) por padrao.
 *
 * Observacao importante: com VECTOR_STORE=memory (padrao), cada execucao
 * da CLI parte de um store vazio — `ingest` e `ask` nao compartilham
 * estado entre invocacoes distintas do processo. Para persistir entre
 * execucoes, use VECTOR_STORE=neo4j (ver docker-compose.yml) ou a API
 * HTTP (src/api.ts), que mantem o store vivo enquanto o servidor roda.
 */
export async function main(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;
  const embedder = new XenovaEmbedder();
  const store = createStore(process.env);

  if (command === 'ingest') {
    const filePath = rest[0];
    if (!filePath) {
      printUsage();
      process.exitCode = 1;
      return;
    }
    const content = await readFile(filePath, 'utf-8');
    const result = await ingest(content, { embedder, store, sourceId: filePath });
    console.log(`Ingeridos ${result.chunks} artigo(s) de "${filePath}".`);
    return;
  }

  if (command === 'ask') {
    const question = rest.join(' ').trim();
    if (!question) {
      printUsage();
      process.exitCode = 1;
      return;
    }
    const llm = createLLM(process.env);
    const result = await askUseCase(question, { embedder, store, llm });

    console.log(result.answer);
    if (!result.refused && result.citations.length > 0) {
      console.log('\nCitações:');
      for (const citation of result.citations) {
        console.log(`- [Art. ${citation.article}] (score: ${citation.score.toFixed(2)})`);
      }
    }
    return;
  }

  printUsage();
  process.exitCode = 1;
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
