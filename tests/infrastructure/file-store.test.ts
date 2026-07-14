import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileVectorStore } from '../../src/infrastructure/file-store.js';
import type { VectorStoreItem } from '../../src/application/ports.js';

const ITEMS: VectorStoreItem[] = [
  { id: 'doc#1º', article: '1º', text: 'Texto do artigo um.', embedding: [1, 0] },
  { id: 'doc#2º', article: '2º', text: 'Texto do artigo dois.', embedding: [0, 1] },
];

describe('FileVectorStore', () => {
  let dir: string;
  let indexPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'estatuto-store-'));
    indexPath = join(dir, 'index.json');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persiste em disco e outra instancia (outro "processo") le o mesmo indice', async () => {
    const writer = new FileVectorStore(indexPath);
    await writer.upsert(ITEMS);

    const reader = new FileVectorStore(indexPath);
    expect(await reader.size()).toBe(2);

    const results = await reader.query([1, 0], 1);
    expect(results).toHaveLength(1);
    expect(results[0].article).toBe('1º');
    expect(results[0].score).toBeCloseTo(1, 10);
  });

  it('reingestao com os mesmos ids substitui em vez de duplicar (idempotente entre instancias)', async () => {
    const first = new FileVectorStore(indexPath);
    await first.upsert(ITEMS);

    const second = new FileVectorStore(indexPath);
    await second.upsert(ITEMS);

    const third = new FileVectorStore(indexPath);
    expect(await third.size()).toBe(2);
  });

  it('comeca vazio quando o arquivo de indice ainda nao existe', async () => {
    const store = new FileVectorStore(join(dir, 'nao-existe.json'));
    expect(await store.size()).toBe(0);
    expect(await store.query([1, 0], 4)).toEqual([]);
  });

  it('query ordena por score decrescente e respeita o topK', async () => {
    const store = new FileVectorStore(indexPath);
    await store.upsert(ITEMS);

    const results = await store.query([0.9, 0.1], 2);
    expect(results.map((r) => r.article)).toEqual(['1º', '2º']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
