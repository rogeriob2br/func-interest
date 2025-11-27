import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// Detectar ambiente local
const IS_OFFLINE = process.env.IS_OFFLINE === 'true';

// Configurar DynamoDB client (apenas se não for offline)
let docClient: DynamoDBDocumentClient | null = null;
if (!IS_OFFLINE) {
  const client = new DynamoDBClient({});
  docClient = DynamoDBDocumentClient.from(client);
}

// Enums permitidos
const ALLOWED_NEEDS = ['wifi_fast', 'workspace', 'community', 'quiet', 'gym', 'kitchen', 'laundry', 'pets'];
const ALLOWED_ACCOMMODATION = ['private_room', 'apartment_studio', 'apartment_1_2br', 'house', 'coliving'];
const ALLOWED_BUDGET = ['under_500', '500-1000', '1000-1500', '1500-2000', '2000-3000', 'over_3000'];
const ALLOWED_DURATION = ['1-month', '2-3-months', '3-6-months', '6-12-months', '1-year-plus', 'flexible'];
const ALLOWED_LANGUAGES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'other'];

interface InterestPayload {
  persona: string;
  email: string;
  name: string;
  nostr?: string;
  cities: string[];
  needs?: string[];
  accommodationType: string;
  budget: string;
  duration: string;
  startDate?: string;
  languages: string[];
  bio?: string;
  consent: boolean;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidNostr(nostr: string): boolean {
  // Validação básica: deve começar com "npub1" e ter 59-64 caracteres no total (bech32)
  return /^npub1[a-z0-9]{54,}$/i.test(nostr) && nostr.length >= 59 && nostr.length <= 64;
}

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
        body: JSON.stringify({ error: 'Invalid JSON format' }),
      };
    }

    // ==========================================
    // VALIDAÇÕES
    // ==========================================

    // 1. Persona deve ser "nomade"
    if (body.persona !== 'nomade') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only nomade persona is accepted' }),
      };
    }

    // 2. Email
    if (!body.email || !isValidEmail(body.email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email' }),
      };
    }

    // 3. Name
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name is required (2-100 characters)' }),
      };
    }

    // 4. Cities (1-5 itens)
    if (!Array.isArray(body.cities) || body.cities.length === 0 || body.cities.length > 5) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cities must contain 1-5 items' }),
      };
    }

    // Validar que cada cidade é string não vazia
    if (!body.cities.every((c: any) => typeof c === 'string' && c.trim().length > 0)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'All cities must be non-empty strings' }),
      };
    }

    // 5. Needs (opcional, mas deve ser array)
    const needs = body.needs || [];
    if (!Array.isArray(needs)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Needs must be an array' }),
      };
    }

    // Validar needs: valores predefinidos ou com prefixo "outros:"
    const invalidNeeds = needs.filter((n: any) => 
      typeof n !== 'string' || (!ALLOWED_NEEDS.includes(n) && !n.startsWith('outros:'))
    );
    if (invalidNeeds.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid needs value' }),
      };
    }

    // 6. AccommodationType
    if (!body.accommodationType || !ALLOWED_ACCOMMODATION.includes(body.accommodationType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid accommodationType' }),
      };
    }

    // 7. Budget
    if (!body.budget || !ALLOWED_BUDGET.includes(body.budget)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid budget' }),
      };
    }

    // 8. Duration
    if (!body.duration || !ALLOWED_DURATION.includes(body.duration)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid duration' }),
      };
    }

    // 9. Languages (min 1)
    if (!Array.isArray(body.languages) || body.languages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one language is required' }),
      };
    }

    if (!body.languages.every((l: any) => ALLOWED_LANGUAGES.includes(l))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid language value' }),
      };
    }

    // 10. Consent
    if (body.consent !== true) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Consent is required' }),
      };
    }

    // 11. Nostr (opcional, validar formato se fornecido)
    if (body.nostr && !isValidNostr(body.nostr)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid Nostr public key format (expected npub1...)' }),
      };
    }

    // 12. Bio (opcional, max 280 chars)
    if (body.bio && (typeof body.bio !== 'string' || body.bio.length > 280)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Bio must be max 280 characters' }),
      };
    }

    // ==========================================
    // PREPARAR ITEM PARA SALVAR
    // ==========================================

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const item: any = {
      // Campos obrigatórios
      id,
      persona: body.persona,
      email: body.email.trim().toLowerCase(),
      name: body.name.trim(),
      cities: body.cities.map((c: string) => c.trim()),
      needs: needs,
      accommodationType: body.accommodationType,
      budget: body.budget,
      duration: body.duration,
      languages: body.languages,
      consent: true,
      
      // Metadata
      createdAt,
      source: 'web_form',
      version: 'v2_nomad_multistep',
      
      // Campos opcionais
      ...(body.nostr && { nostr: body.nostr.trim() }),
      ...(body.startDate && { startDate: body.startDate.trim() }),
      ...(body.bio && { bio: body.bio.trim() }),
      
      // Metadata adicional (se disponível no evento Lambda)
      ...(event.requestContext?.identity?.userAgent && { userAgent: event.requestContext.identity.userAgent }),
      ...(event.requestContext?.identity?.sourceIp && { ipAddress: event.requestContext.identity.sourceIp }),
    };

    console.log('Item to save:', { id, email: item.email, persona: item.persona });

    // ==========================================
    // SALVAR NO DYNAMO (ou mockar se offline)
    // ==========================================
    
    if (IS_OFFLINE) {
      console.log('🧪 OFFLINE MODE: Skipping DynamoDB save');
      console.log('Item would be saved:', JSON.stringify(item, null, 2));
    } else {
      const tableName = process.env.DYNAMODB_TABLE;
      if (!tableName) {
        console.error('DYNAMODB_TABLE environment variable not set');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Internal server error' }),
        };
      }

      console.log('Inserting item into DynamoDB:', { id, email: item.email, persona: item.persona });

      await docClient!.send(new PutCommand({
        TableName: tableName,
        Item: item,
      }));

      console.log('Item inserted successfully');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ id, createdAt }),
    };
    
  } catch (err: any) {
    console.error('Error processing interest:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
