import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeRecord(fields: Record<string, unknown>) {
  return { get: (key: string) => fields[key] };
}

const sessionRunMock = vi.fn();
const sessionCloseMock = vi.fn(async () => undefined);
const driverSessionMock = vi.fn(() => ({ run: sessionRunMock, close: sessionCloseMock }));
const driverCloseMock = vi.fn(async () => undefined);
const driverFactoryMock = vi.fn(() => ({ session: driverSessionMock, close: driverCloseMock }));
const authBasicMock = vi.fn((username: string, password: string) => ({ username, password }));

// neo4j-driver exigiria um banco de dados real (via Docker); nos testes ele
// e sempre mockado para manter a suite 100% offline.
vi.mock('neo4j-driver', () => ({
  default: { driver: driverFactoryMock, auth: { basic: authBasicMock } },
}));

const { Neo4jVectorStore } = await import('../../src/infrastructure/neo4j-store.js');

describe('Neo4jVectorStore', () => {
  beforeEach(() => {
    sessionRunMock.mockReset();
    sessionCloseMock.mockClear();
    driverSessionMock.mockClear();
    driverFactoryMock.mockClear();
    authBasicMock.mockClear();
  });

  it('autentica com neo4j.auth.basic e abre o driver com a URI configurada', () => {
    new Neo4jVectorStore({ uri: 'bolt://localhost:7687', user: 'neo4j', password: 'senha' });

    expect(authBasicMock).toHaveBeenCalledWith('neo4j', 'senha');
    expect(driverFactoryMock).toHaveBeenCalledWith('bolt://localhost:7687', { username: 'neo4j', password: 'senha' });
  });

  it('upsert grava cada chunk com MERGE por id e fecha a sessao', async () => {
    sessionRunMock.mockResolvedValue({ records: [] });
    const store = new Neo4jVectorStore({ uri: 'bolt://x', user: 'u', password: 'p' });

    await store.upsert([{ id: 'doc#1º', article: '1º', text: 'Texto do artigo um.', embedding: [1, 0] }]);

    expect(sessionRunMock).toHaveBeenCalledTimes(1);
    const [query, params] = sessionRunMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toMatch(/MERGE/);
    expect(params).toMatchObject({ id: 'doc#1º', article: '1º', text: 'Texto do artigo um.', embedding: [1, 0] });
    expect(sessionCloseMock).toHaveBeenCalledTimes(1);
  });

  it('query calcula similaridade de cosseno e retorna os topK mais similares', async () => {
    sessionRunMock.mockResolvedValue({
      records: [
        makeRecord({ id: 'a', article: '1º', text: 'texto 1', embedding: [1, 0] }),
        makeRecord({ id: 'b', article: '2º', text: 'texto 2', embedding: [0, 1] }),
      ],
    });
    const store = new Neo4jVectorStore({ uri: 'bolt://x', user: 'u', password: 'p' });

    const results = await store.query([1, 0], 1);

    expect(results).toHaveLength(1);
    expect(results[0].article).toBe('1º');
    expect(results[0].score).toBeCloseTo(1, 10);
  });

  it('size retorna a contagem de chunks armazenados', async () => {
    sessionRunMock.mockResolvedValue({ records: [makeRecord({ total: 7 })] });
    const store = new Neo4jVectorStore({ uri: 'bolt://x', user: 'u', password: 'p' });

    await expect(store.size()).resolves.toBe(7);
  });
});
