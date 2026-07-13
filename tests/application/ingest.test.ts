import { describe, expect, it } from 'vitest';
import { ingest } from '../../src/application/ingest.js';
import { MemoryVectorStore } from '../../src/infrastructure/memory-store.js';
import { FakeEmbedder } from '../helpers/fake-embedder.js';

const ESTATUTO = [
  'Art. 1º Disposicao inicial do estatuto.',
  'Art. 2º Dos direitos dos associados.',
  'Art. 3º Dos deveres dos associados.',
].join('\n');

describe('ingest', () => {
  it('indexa um chunk por artigo do documento', async () => {
    const store = new MemoryVectorStore();
    const embedder = new FakeEmbedder({}, 4);

    const result = await ingest(ESTATUTO, { embedder, store, sourceId: 'estatuto.md' });

    expect(result.chunks).toBe(3);
    expect(await store.size()).toBe(3);
  });

  it('reingestao do mesmo documento e idempotente (nao duplica chunks)', async () => {
    const store = new MemoryVectorStore();
    const embedder = new FakeEmbedder({}, 4);
    const deps = { embedder, store, sourceId: 'estatuto.md' };

    await ingest(ESTATUTO, deps);
    await ingest(ESTATUTO, deps);

    expect(await store.size()).toBe(3);
  });

  it('documentos com sourceId diferentes nao se sobrescrevem', async () => {
    const store = new MemoryVectorStore();
    const embedder = new FakeEmbedder({}, 4);

    await ingest(ESTATUTO, { embedder, store, sourceId: 'a.md' });
    await ingest(ESTATUTO, { embedder, store, sourceId: 'b.md' });

    expect(await store.size()).toBe(6);
  });
});
