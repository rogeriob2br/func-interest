import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';

app.http('Health', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler: async (_req: HttpRequest): Promise<HttpResponseInit> => {
    return { status: 200, jsonBody: { ok: true, time: new Date().toISOString() } };
  }
});


