import { getKnowledgeContext } from './knowledge';

describe('getKnowledgeContext (embebido)', () => {
  it('concatena los archivos pedidos con encabezado por archivo', () => {
    const ctx = getKnowledgeContext(['about.md']);
    expect(ctx).toContain('--- about.md ---');
    expect(ctx.length).toBeGreaterThan(0);
  });

  it('corta a maxLen', () => {
    const ctx = getKnowledgeContext(['about.md'], 20);
    expect(ctx.length).toBeLessThanOrEqual(20);
  });

  it('usa los 5 archivos por defecto', () => {
    const ctx = getKnowledgeContext();
    expect(ctx).toContain('--- about.md ---');
    expect(ctx).toContain('--- faq.md ---');
  });
});
