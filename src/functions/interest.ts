import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  };

  try {
    let body: any;
    
    // Parse JSON
    try {
      body = JSON.parse(event.body || '{}');
      console.log('Parsed body:', JSON.stringify(body));
    } catch (parseErr: any) {
      console.error('JSON parse error:', parseErr);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'INVALID_JSON', message: parseErr?.message }),
      };
    }
    
    // Validação mínima
    const persona = String(body?.persona || '').trim();
    const email = String(body?.email || '').trim();
    const consent = body?.consent === true;
    
    console.log('Validation:', { persona, email, consent });
    
    if (!persona || !email || !consent) {
      console.log('Validation failed');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'VALIDATION_ERROR',
          details: {
            persona: 'required',
            email: 'required',
            consent: 'must be true'
          }
        }),
      };
    }

    const tableName = process.env.DYNAMODB_TABLE;
    if (!tableName) {
      console.error('DYNAMODB_TABLE environment variable not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'INTERNAL_ERROR' }),
      };
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const item = {
      id,
      persona,
      email,
      name: body?.name ? String(body.name).trim().slice(0, 120) : undefined,
      nostr: body?.nostr ? String(body.nostr).trim().slice(0, 128) : undefined,
      countries: body?.countries ? String(body.countries).trim().slice(0, 300) : undefined,
      propertyTitle: body?.propertyTitle ? String(body.propertyTitle).trim().slice(0, 120) : undefined,
      propertyLocation: body?.propertyLocation ? String(body.propertyLocation).trim().slice(0, 120) : undefined,
      propertySummary: body?.propertySummary ? String(body.propertySummary).trim().slice(0, 300) : undefined,
      consent: true,
      createdAt,
    };

    // Remove campos undefined
    Object.keys(item).forEach(key => {
      if ((item as any)[key] === undefined) {
        delete (item as any)[key];
      }
    });

    console.log('Inserting item into DynamoDB:', { id, email });

    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: item,
    }));

    console.log('Item inserted successfully');

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ id, createdAt }),
    };
  } catch (err: any) {
    console.error('Error processing interest:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'INTERNAL_ERROR', message: err?.message }),
    };
  }
};


