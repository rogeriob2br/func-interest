# func-interest - AWS Lambda API

API Serverless para registrar interesse de usuários (nômades, anfitriões, árbitros) usando AWS Lambda e DynamoDB.

## ✅ Features

- ✅ **AWS Lambda**: Funções serverless com Node.js 20
- ✅ **DynamoDB**: Banco de dados NoSQL gerenciado
- ✅ **Serverless Framework**: Deploy e gerenciamento simplificado
- ✅ **TypeScript**: Type safety e melhor developer experience
- ✅ **Validação**: persona, email, consent obrigatórios
- ✅ **CORS**: Configurado para permitir requisições cross-origin

## 🚀 Como rodar local

```bash
cd /home/rogerio/agora/fristad/tecnologia/backend/func-interest
npm install
npm run build

# Simular localmente (requer serverless-offline)
npm run local
```

Endpoints locais (com serverless-offline):
- `POST http://localhost:3000/interest`
- `GET http://localhost:3000/health`

## 📦 Estrutura

```
func-interest/
├── src/
│   └── functions/
│       ├── interest.ts    # POST /interest (valida + grava DynamoDB)
│       └── health.ts      # GET /health
├── .github/
│   └── workflows/
│       └── deploy-aws.yml # GitHub Actions para deploy
├── serverless.yml         # Configuração Serverless Framework
├── package.json
└── tsconfig.json
```

##  Endpoints

### POST /interest

**Body:**
```json
{
  "persona": "nomade|anfitriao|arbitro",
  "email": "user@example.com",
  "consent": true,
  "name": "Nome (opcional)",
  "nostr": "npub... (opcional)",
  "countries": "Países de interesse (opcional, para nômades)",
  "propertyTitle": "Título da propriedade (opcional, para anfitriões)",
  "propertyLocation": "Localização (opcional, para anfitriões)",
  "propertySummary": "Resumo (opcional, para anfitriões)"
}
```

**Resposta 201:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-10-30T00:38:09.335Z"
}
```

**Erros:**
- 400: `{ "error": "VALIDATION_ERROR", "details": { "persona": "required", "email": "required", "consent": "must be true" } }`
- 400: `{ "error": "INVALID_JSON", "message": "..." }`
- 500: `{ "error": "INTERNAL_ERROR", "message": "..." }`

### GET /health

**Resposta 200:**
```json
{
  "ok": true,
  "time": "2025-10-30T00:38:02.830Z"
}
```

## ⚙️ Configuração

### Variáveis de ambiente

As variáveis são configuradas no `serverless.yml`:

```yaml
environment:
  DYNAMODB_TABLE: ${self:service}-${self:provider.stage}
  RATE_LIMIT_WINDOW_MS: 60000
  RATE_LIMIT_MAX: 60
```

A tabela DynamoDB é criada automaticamente pelo Serverless Framework com a seguinte estrutura:
- **Chave primária**: `id` (UUID)
- **GSI**: `EmailIndex` (email + createdAt) para queries por email
- **Billing**: Pay-per-request (sem custos fixos)

## 🔧 Deploy AWS

### Pré-requisitos

1. **AWS CLI configurado**:
```bash
aws configure
```

2. **Credenciais AWS** com permissões para:
   - Lambda (criar/atualizar funções)
   - DynamoDB (criar/gerenciar tabelas)
   - CloudFormation (gerenciar stack)
   - API Gateway (criar APIs)
   - IAM (criar roles)

### Deploy Manual

```bash
# Deploy para dev
npm run deploy:dev

# Deploy para produção
npm run deploy:prod

# Remover stack
npm run remove
```

### Deploy via GitHub Actions

O workflow `.github/workflows/deploy-aws.yml` faz deploy automático no push para `master/main`.

**Configurar no GitHub:**
1. Settings → Secrets and variables → Actions
2. Adicionar secret: `AWS_ROLE_TO_ASSUME` com ARN do role IAM
3. Configurar OIDC entre GitHub e AWS ([documentação](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services))

## 📚 Documentação útil

- [Serverless Framework](https://www.serverless.com/framework/docs)
- [AWS Lambda Node.js](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)

## 🏗️ Arquitetura

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌─────────────────────┐
│  API Gateway        │
│  (HTTP API)         │
└──────┬──────────────┘
       │
       ├─► GET /health ──────► Lambda: health
       │                        └─► Retorna status
       │
       └─► POST /interest ────► Lambda: interest
                                 └─► DynamoDB Table
                                     └─► Grava registro
```

## 📝 Notas

- **Tabela DynamoDB** é criada automaticamente no primeiro deploy
- **UUIDs** são gerados usando `crypto.randomUUID()` (Node.js nativo)
- **CORS** está habilitado por padrão para todos os origins (`*`)
- **Pay-per-request billing**: Só paga pelo que usar, sem custos fixos
- **Global Secondary Index** permite queries eficientes por email

## 💰 Custos Estimados (AWS Free Tier)

- **Lambda**: 1M requisições/mês + 400,000 GB-s grátis
- **DynamoDB**: 25 GB armazenamento + 25 WCU/RCU grátis
- **API Gateway**: 1M requisições/mês grátis (primeiro ano)

Para baixo/médio volume, provavelmente **$0/mês** no Free Tier.

