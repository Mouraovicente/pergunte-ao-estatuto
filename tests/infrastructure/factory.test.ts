import { describe, expect, it } from 'vitest';
import { createLLM, createStore } from '../../src/infrastructure/factory.js';
import { MemoryVectorStore } from '../../src/infrastructure/memory-store.js';
import { OpenRouterLLM } from '../../src/infrastructure/openrouter.js';
import { TemplateFakeLLM } from '../../src/infrastructure/fake-llm.js';

describe('createStore', () => {
  it('retorna MemoryVectorStore quando VECTOR_STORE nao esta definido', () => {
    expect(createStore({})).toBeInstanceOf(MemoryVectorStore);
  });

  it('retorna MemoryVectorStore quando VECTOR_STORE=memory', () => {
    expect(createStore({ VECTOR_STORE: 'memory' })).toBeInstanceOf(MemoryVectorStore);
  });
});

describe('createLLM', () => {
  it('retorna TemplateFakeLLM quando LLM nao esta definido (demo offline por padrao)', () => {
    expect(createLLM({})).toBeInstanceOf(TemplateFakeLLM);
  });

  it('retorna TemplateFakeLLM quando LLM=fake', () => {
    expect(createLLM({ LLM: 'fake' })).toBeInstanceOf(TemplateFakeLLM);
  });

  it('retorna OpenRouterLLM quando LLM=openrouter', () => {
    expect(createLLM({ LLM: 'openrouter', OPENROUTER_API_KEY: 'chave' })).toBeInstanceOf(OpenRouterLLM);
  });
});
