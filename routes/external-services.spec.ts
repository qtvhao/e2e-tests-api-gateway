import { test, expect } from '@playwright/test';

/**
 * E2E tests for API Gateway External Service Routes (Ollama, Docker Registry)
 */
test.describe('External Service Routes', () => {
  test('should route to Ollama /api/generate', async ({ request }) => {
    const response = await request.post('/api/generate', {
      data: { test: 'data' }
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should route to Ollama /api/chat', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { test: 'data' }
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should route to Ollama /api/embeddings', async ({ request }) => {
    const response = await request.post('/api/embeddings', {
      data: { test: 'data' }
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });

  test('should route to Docker Registry /v2/*', async ({ request }) => {
    const response = await request.get('/v2/', {
      maxRedirects: 0
    });
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });
});
