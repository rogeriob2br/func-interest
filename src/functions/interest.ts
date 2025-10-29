import { app, type HttpRequest, type HttpResponseInit } from '@azure/functions';
import { MongoClient } from 'mongodb';

app.http('Interest', {
  methods: ['POST'],
  route: 'interest',
  authLevel: 'anonymous',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    try {
      let body: any;
      try {
        body = await req.json() as any;
        console.log('Parsed body:', JSON.stringify(body));
      } catch (parseErr: any) {
        console.error('JSON parse error:', parseErr);
        return { status: 400, jsonBody: { error: 'INVALID_JSON', message: parseErr?.message } };
      }
      
      // validação mínima
      const persona = String(body?.persona || '').trim();
      const email = String(body?.email || '').trim();
      const consent = body?.consent === true;
      console.log('Validation:', { persona, email, consent });
      if (!persona || !email || !consent) {
        console.log('Validation failed');
        return { status: 400, jsonBody: { error: 'VALIDATION_ERROR', details: { persona: 'required', email: 'required', consent: 'must be true' } } };
      }

      const uri = process.env.MONGODB_URI as string;
      const dbName = process.env.MONGODB_DB || 'fristad';
      const collectionName = process.env.MONGODB_COLLECTION || 'interests';
      console.log('MongoDB config:', { uri: uri ? 'SET' : 'MISSING', dbName, collectionName });
      if (!uri) {
        console.log('MongoDB URI missing');
        return { status: 500, jsonBody: { error: 'INTERNAL_ERROR' } };
      }

      const doc = {
        persona,
        email,
        name: body?.name ? String(body.name).trim().slice(0, 120) : undefined,
        nostr: body?.nostr ? String(body.nostr).trim().slice(0, 128) : undefined,
        countries: body?.countries ? String(body.countries).trim().slice(0, 300) : undefined,
        propertyTitle: body?.propertyTitle ? String(body.propertyTitle).trim().slice(0, 120) : undefined,
        propertyLocation: body?.propertyLocation ? String(body.propertyLocation).trim().slice(0, 120) : undefined,
        propertySummary: body?.propertySummary ? String(body.propertySummary).trim().slice(0, 300) : undefined,
        consent: true,
        createdAt: new Date().toISOString(),
      };

      const client = new MongoClient(uri);
      try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected. Inserting document...');
        const col = client.db(dbName).collection(collectionName);
        const result = await col.insertOne(doc, { writeConcern: { w: 'majority' } });
        console.log('Inserted:', result.insertedId);
        return { status: 201, jsonBody: { id: String(result.insertedId), createdAt: doc.createdAt } };
      } finally {
        await client.close();
        console.log('MongoDB connection closed');
      }
    } catch (err: any) {
      console.error('Erro ao processar interest:', err);
      return { status: 500, jsonBody: { error: 'INTERNAL_ERROR', message: err?.message } };
    }
  }
});


