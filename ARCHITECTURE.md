# Arquitetura - func-interest API

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Diagrama de Arquitetura](#diagrama-de-arquitetura)
- [Componentes](#componentes)
- [Fluxo de Requisições](#fluxo-de-requisições)
- [Segurança](#segurança)
- [Performance](#performance)
- [Monitoramento](#monitoramento)
- [Custos](#custos)
- [Troubleshooting](#troubleshooting)

---

## Visão Geral

Sistema serverless para captura de interesse de usuários (nômades, anfitriões, árbitros) no projeto Fristad. 

**Stack Backend:**
- **Cloud Provider**: AWS
- **Compute**: Lambda (Node.js 20)
- **Database**: DynamoDB
- **API**: API Gateway HTTP API
- **CDN**: Cloudflare (api.fristad.com.br)
- **IaC**: Serverless Framework
- **CI/CD**: GitHub Actions

**Stack Frontend:**
- **Framework**: React + Vite
- **Hosting**: Vercel
- **CDN**: Cloudflare (www.fristad.com.br)
- **Domínio**: www.fristad.com.br

**Características:**
- ✅ Serverless (zero gerenciamento de servidores)
- ✅ Auto-scaling (escala automaticamente)
- ✅ Pay-per-use (paga apenas pelo uso)
- ✅ Alta disponibilidade (multi-AZ)
- ✅ Baixa latência (global via Cloudflare)

---

## Diagrama de Arquitetura

### Fluxo Completo

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                            │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Cloudflare CDN                            │ │
│  │                   www.fristad.com.br                        │ │
│  │                   - DNS: CNAME → Vercel                     │ │
│  │                   - Proxy: Ativo (🟠)                        │ │
│  │                   - SSL/TLS: Full                            │ │
│  └────────────────────────┬────────────────────────────────────┘ │
│                           │                                       │
│                           ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │   Vite + React App (Vercel)                                │ │
│  │   - Build: Vite                                             │ │
│  │   - Framework: React                                        │ │
│  │   - Hosting: Vercel Edge Network                            │ │
│  │   - Forms: Nômade, Anfitrião, Árbitro                       │ │
│  └─────────┬───────────────────────────────────────────────────┘ │
│            │ fetch()                                             │
└────────────┼─────────────────────────────────────────────────────┘
             │
             │ HTTPS POST
             │ https://api.fristad.com.br/api/interest
             ▼
┌──────────────────────────────────────────────────────────────────┐
│                         CDN LAYER                                 │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                   Cloudflare                               │  │
│  │  - DDoS Protection (Layer 3/4/7)                           │  │
│  │  - WAF (Web Application Firewall)                          │  │
│  │  - SSL/TLS Termination                                     │  │
│  │  - CDN Cache (DYNAMIC - não cacheia POST)                  │  │
│  │  - Rate Limiting (10000 req/s)                             │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                            │ Proxy para AWS
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                         AWS LAYER                                 │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Custom Domain (ACM Certificate)                │  │
│  │              api.fristad.com.br                             │  │
│  │              SSL: TLS 1.2+                                  │  │
│  └────────────────────────┬───────────────────────────────────┘  │
│                           │                                       │
│                           ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │           API Gateway HTTP API (hdpq26sstb)                │  │
│  │                                                             │  │
│  │  - CORS Configuration                                       │  │
│  │  - Request Validation                                       │  │
│  │  - Throttling (10000 req/s burst)                          │  │
│  │  - Access Logs → CloudWatch                                │  │
│  │                                                             │  │
│  │  Routes:                                                    │  │
│  │  ├─ GET  /api/health  ────────────────────┐                │  │
│  │  └─ POST /api/interest ───────────────┐   │                │  │
│  └───────────────────────────────────────┼───┼────────────────┘  │
│                                          │   │                   │
│                                          │   │                   │
│  ┌───────────────────────────────────────▼───▼────────────────┐  │
│  │                     AWS Lambda Functions                    │  │
│  │                                                             │  │
│  │  ┌─────────────────────┐    ┌──────────────────────────┐  │  │
│  │  │  health             │    │  interest                │  │  │
│  │  │  - 128 MB RAM       │    │  - 128 MB RAM            │  │  │
│  │  │  - 3s timeout       │    │  - 10s timeout           │  │  │
│  │  │  - Node.js 20       │    │  - Node.js 20            │  │  │
│  │  │                     │    │                          │  │  │
│  │  │  Retorna:           │    │  Processa:               │  │  │
│  │  │  { ok, time }       │    │  1. Parse JSON           │  │  │
│  │  └─────────────────────┘    │  2. Validação            │  │  │
│  │                              │  3. UUID generation      │  │  │
│  │                              │  4. DynamoDB PutItem     │  │  │
│  │                              └──────────┬───────────────┘  │  │
│  │                                         │                  │  │
│  │                                         ▼                  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │              DynamoDB Table                          │  │  │
│  │  │              func-interest-fristad-prod              │  │  │
│  │  │                                                      │  │  │
│  │  │  Primary Key: id (UUID)                             │  │  │
│  │  │  GSI: EmailIndex (email + createdAt)                │  │  │
│  │  │  Billing: Pay-per-request                           │  │  │
│  │  │  Encryption: AWS Managed (at rest)                  │  │  │
│  │  │                                                      │  │  │
│  │  │  Attributes:                                         │  │  │
│  │  │  - id: String (PK)                                   │  │  │
│  │  │  - email: String (GSI)                               │  │  │
│  │  │  - createdAt: ISO String (GSI Sort Key)             │  │  │
│  │  │  - persona: String (nomade|anfitriao|arbitro)       │  │  │
│  │  │  - name?: String                                     │  │  │
│  │  │  - nostr?: String                                    │  │  │
│  │  │  - countries?: String                                │  │  │
│  │  │  - propertyTitle?: String                            │  │  │
│  │  │  - propertyLocation?: String                         │  │  │
│  │  │  - propertySummary?: String                          │  │  │
│  │  │  - consent: Boolean                                  │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    CloudWatch Logs                         │  │
│  │  - Lambda execution logs                                   │  │
│  │  - API Gateway access logs                                │  │
│  │  - Retention: 7 days                                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## Componentes

### 0. Frontend (Fora do escopo deste repositório)

**Stack:**
- **Build Tool**: Vite
- **Framework**: React
- **Hosting**: Vercel Edge Network
- **Domínio**: www.fristad.com.br
- **CDN**: Cloudflare (proxy ativo)

**Configuração DNS (Cloudflare):**
- **Type**: CNAME
- **Name**: `www`
- **Target**: `cname.vercel-dns.com` (ou similar)
- **Proxy**: 🟠 Proxied (ativo)

**Integração com Backend:**
- Faz requisições para `https://api.fristad.com.br/api/*`
- CORS configurado para aceitar `https://www.fristad.com.br`
- Formulários: Nômade, Anfitrião, Árbitro

**Repositório**: (separado - não documentado aqui)

---

### 1. Cloudflare CDN (API Backend)

**Função**: Proxy reverso, segurança e otimização para a API

**Configuração:**
- **DNS**: CNAME `api` → `d-u6zugwyhze.execute-api.us-east-1.amazonaws.com`
- **Proxy**: Ativo (🟠 Orange Cloud)
- **SSL Mode**: Full (strict)
- **Min TLS Version**: 1.2

**Benefícios:**
- DDoS protection automática
- Cache de respostas (GET apenas)
- WAF rules
- Geolocalização (CDN global)
- Analytics e logs

### 2. AWS Certificate Manager (ACM)

**Função**: Gerenciamento de certificados SSL/TLS

**Detalhes:**
- **ARN**: `arn:aws:acm:us-east-1:804508763022:certificate/7ebe539c-4fd6-4e31-bc93-2a2abcabc83d`
- **Domínio**: `api.fristad.com.br`
- **Validação**: DNS (CNAME)
- **Renovação**: Automática
- **Algoritmo**: RSA 2048

### 3. API Gateway HTTP API

**Função**: Roteamento HTTP e gerenciamento de API

**Detalhes:**
- **ID**: `hdpq26sstb`
- **Tipo**: HTTP API (mais barato que REST API)
- **Stage**: `$default` (produção)
- **Throttling**: 10,000 req/s burst, 5,000 req/s steady
- **Custom Domain**: `api.fristad.com.br`

**Rotas:**
| Método | Path | Lambda | Descrição |
|--------|------|--------|-----------|
| GET | `/api/health` | `health` | Health check |
| POST | `/api/interest` | `interest` | Criar registro |
| OPTIONS | `/api/*` | (automático) | CORS preflight |

**CORS:**
```yaml
allowedOrigins:
  - https://www.fristad.com.br
  - https://fristad.com.br
  - http://localhost:3000
allowedMethods: [GET, POST, OPTIONS]
allowedHeaders: [Content-Type, Authorization]
allowCredentials: true
maxAge: 3600
```

### 4. Lambda Functions

#### 4.1 Health Function

**Arquivo**: `src/functions/health.ts`

**Configuração:**
- **Runtime**: Node.js 20
- **Memória**: 128 MB
- **Timeout**: 3 segundos
- **Handler**: `src/functions/health.handler`

**Código:**
```typescript
export const handler: APIGatewayProxyHandler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      ok: true,
      time: new Date().toISOString(),
    }),
  };
};
```

**Resposta:**
```json
{
  "ok": true,
  "time": "2025-10-31T11:52:57.099Z"
}
```

#### 4.2 Interest Function

**Arquivo**: `src/functions/interest.ts`

**Configuração:**
- **Runtime**: Node.js 20
- **Memória**: 128 MB (pode aumentar se necessário)
- **Timeout**: 10 segundos
- **Handler**: `src/functions/interest.handler`
- **IAM Permissions**: DynamoDB PutItem, GetItem, Query, Scan

**Fluxo de Processamento:**

```
1. Parse JSON body
   ├─ Erro → 400 INVALID_JSON
   └─ OK → próximo

2. Validação
   ├─ persona vazio → 400 VALIDATION_ERROR
   ├─ email vazio → 400 VALIDATION_ERROR
   ├─ consent != true → 400 VALIDATION_ERROR
   └─ OK → próximo

3. Preparar dados
   ├─ Gerar UUID (crypto.randomUUID)
   ├─ Timestamp ISO (new Date().toISOString())
   ├─ Sanitizar campos opcionais
   └─ Remover undefined

4. DynamoDB PutItem
   ├─ Erro → 500 INTERNAL_ERROR
   └─ OK → 201 Created
```

**Validações:**
- `persona`: required, não-vazio
- `email`: required, não-vazio
- `consent`: required, must be `true`
- `name`: opcional, max 120 chars
- `nostr`: opcional, max 128 chars
- `countries`: opcional, max 300 chars
- `propertyTitle`: opcional, max 120 chars
- `propertyLocation`: opcional, max 120 chars
- `propertySummary`: opcional, max 300 chars

### 5. DynamoDB Table

**Nome**: `func-interest-fristad-prod`

**Schema:**
```
Primary Key:
  - id (S) - HASH

Global Secondary Index (EmailIndex):
  - email (S) - HASH
  - createdAt (S) - RANGE
```

**Configuração:**
- **Billing Mode**: PAY_PER_REQUEST (on-demand)
- **Encryption**: AWS managed (at rest)
- **Point-in-time recovery**: Desabilitado (pode ativar)
- **TTL**: Desabilitado

**Capacidade:**
- **Leitura**: Ilimitada (on-demand)
- **Escrita**: Ilimitada (on-demand)
- **Armazenamento**: 25 GB grátis (Free Tier)

**Queries disponíveis:**
```javascript
// Por ID (Primary Key)
dynamodb.getItem({ Key: { id: 'uuid' } })

// Por email (GSI)
dynamodb.query({
  IndexName: 'EmailIndex',
  KeyConditionExpression: 'email = :email',
  ExpressionAttributeValues: { ':email': 'user@example.com' }
})

// Por email + data (GSI)
dynamodb.query({
  IndexName: 'EmailIndex',
  KeyConditionExpression: 'email = :email AND createdAt > :date',
  ExpressionAttributeValues: {
    ':email': 'user@example.com',
    ':date': '2025-01-01T00:00:00.000Z'
  }
})

// Scan (todos os registros - cuidado!)
dynamodb.scan({})
```

---

## Fluxo de Requisições

### POST /api/interest - Sucesso

```
1. Frontend (Vite/React + Vercel)
   ↓
   User preenche formulário (Nômade/Anfitrião/Árbitro)
   ↓
   fetch('https://api.fristad.com.br/api/interest', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ persona, email, consent, ... })
   })
   ↓
   Cloudflare (www.fristad.com.br) processa a request
   ↓
   Browser envia para api.fristad.com.br

2. Cloudflare (api.fristad.com.br)
   ↓
   POST https://api.fristad.com.br/api/interest
   Headers:
     - Origin: https://www.fristad.com.br
     - Content-Type: application/json
   Body: { persona, email, consent, ... }
   ↓
   - Verifica DDoS/WAF rules
   - Proxy para AWS Custom Domain
   - Host: api.fristad.com.br

3. AWS Custom Domain
   ↓
   - Valida certificado SSL
   - Resolve para API Gateway

4. API Gateway
   ↓
   - CORS preflight (se OPTIONS)
   - Roteamento: POST /api/interest → Lambda interest
   - Throttling check
   - Logging

5. Lambda interest
   ↓
   - Parse JSON
   - Validação (persona, email, consent)
   - Gerar UUID
   - Timestamp

6. DynamoDB
   ↓
   - PutItem na tabela
   - Retorna sucesso

7. Lambda → API Gateway → Cloudflare → Frontend
   ↓
   201 Created
   Headers:
     - Access-Control-Allow-Origin: https://www.fristad.com.br
     - Access-Control-Allow-Credentials: true
   Body: { "id": "uuid", "createdAt": "ISO" }
   ↓
   Frontend (Vite/React) processa resposta
   ↓
   Exibe mensagem de sucesso ao usuário

Total: ~200-500ms (sem contar frontend rendering)
```

### Fluxo de Erro - Validação

```
1-4. (mesmo fluxo)

5. Lambda interest
   ↓
   - Parse JSON: OK
   - Validação: email vazio ❌

6. Lambda → API Gateway → Cloudflare → Cliente
   ↓
   400 Bad Request
   Body: {
     "error": "VALIDATION_ERROR",
     "details": {
       "persona": "required",
       "email": "required",
       "consent": "must be true"
     }
   }

Total: ~150ms
```

---

## Segurança

### 1. Autenticação e Autorização

**Atual**: Endpoints públicos (anonymous)

**Futuro** (quando necessário):
- API Keys (API Gateway)
- JWT tokens (Cognito/Auth0)
- OAuth 2.0

### 2. CORS

Apenas origens aprovadas:
- `https://www.fristad.com.br`
- `https://fristad.com.br`
- `http://localhost:3000` (dev)

### 3. SSL/TLS

- **Cloudflare**: TLS 1.2+ (Full Strict)
- **AWS**: TLS 1.2+ (ACM Certificate)
- **Ciphers**: Modern (AES-GCM, ChaCha20)

### 4. DDoS Protection

**Cloudflare:**
- Layer 3/4 (Network/Transport)
- Layer 7 (Application)
- Rate limiting automático

**AWS:**
- API Gateway throttling (10K req/s)
- Lambda concurrency limits (1000)

### 5. Dados Sensíveis

**Encryption at Rest:**
- DynamoDB: AWS managed encryption
- Lambda env vars: Encrypted (KMS)
- CloudWatch Logs: Encrypted

**Encryption in Transit:**
- HTTPS everywhere
- TLS 1.2+

**Dados PII:**
- Email: Armazenado em plaintext (GSI)
- Nome: Opcional, plaintext
- Nostr: Opcional, público por natureza

**Recomendações futuras:**
- Hash emails para GSI
- Encrypt PII fields (AWS KMS)
- Data retention policy
- GDPR compliance (right to be forgotten)

### 6. IAM Permissions

Lambda execution role (mínimo privilégio):
```yaml
- Effect: Allow
  Action:
    - dynamodb:PutItem
    - dynamodb:GetItem
    - dynamodb:Query
    - dynamodb:Scan
  Resource:
    - arn:aws:dynamodb:us-east-1:*:table/func-interest-fristad-prod
```

---

## Performance

### Latência Esperada

| Operação | P50 | P95 | P99 |
|----------|-----|-----|-----|
| GET /health | 50ms | 100ms | 200ms |
| POST /interest (sucesso) | 200ms | 400ms | 600ms |
| POST /interest (validação) | 100ms | 200ms | 300ms |

**Componentes da latência:**
- Cloudflare routing: 10-50ms
- API Gateway: 5-15ms
- Lambda cold start: 500-1500ms (primeira vez)
- Lambda warm: 10-50ms
- DynamoDB PutItem: 5-20ms

### Cold Starts

**O que é**: Primeira execução de uma Lambda após inatividade

**Duração**:
- Node.js 20: ~500-1500ms
- Com VPC: +500-1000ms (não usamos VPC)

**Mitigação**:
- Provisioned Concurrency (custo extra)
- Keep-warm pings (complexo)
- Aceitar cold starts (mais comum)

**Frequência**:
- Baixo tráfego: frequente
- Alto tráfego: raro
- Após deploy: todas as instâncias

### Throughput

**Limites:**
- API Gateway: 10,000 req/s (burst), 5,000 steady
- Lambda concurrency: 1,000 (padrão), 3,000 (reservado)
- DynamoDB: ilimitado (on-demand)

**Capacidade real** (estimada):
- Health: ~5,000 req/s
- Interest: ~1,000 req/s (limitado por DynamoDB writes)

### Otimizações

**Implementadas:**
- HTTP API (não REST API) - 60% mais barato
- Pay-per-request DynamoDB - sem provisionamento
- Minimal dependencies - bundle pequeno
- Node.js 20 (ARM Graviton2) - mais eficiente

**Possíveis:**
- Lambda@Edge (CloudFront) - menor latência global
- DynamoDB DAX (cache) - reads mais rápidos
- Provisioned Concurrency - sem cold starts
- Batch processing - agrupar writes

---

## Monitoramento

### CloudWatch Metrics

**Lambda:**
- Invocations
- Duration (p50, p95, p99)
- Errors
- Throttles
- ConcurrentExecutions

**API Gateway:**
- Count (requests)
- IntegrationLatency
- Latency (total)
- 4XXError
- 5XXError

**DynamoDB:**
- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- UserErrors
- SystemErrors

### CloudWatch Logs

**Localização:**
- `/aws/lambda/func-interest-fristad-prod-health`
- `/aws/lambda/func-interest-fristad-prod-interest`
- `/aws/apigateway/func-interest-fristad-prod`

**Retention**: 7 dias (padrão)

**Log Format (Lambda):**
```
2025-10-31T11:53:06.508Z [INFO] Parsed body: {"persona":"nomade",...}
2025-10-31T11:53:06.510Z [INFO] Validation: {"persona":"nomade","email":"..."}
2025-10-31T11:53:06.520Z [INFO] Inserting item into DynamoDB: {"id":"uuid","email":"..."}
2025-10-31T11:53:06.550Z [INFO] Item inserted successfully
```

### Alertas (Recomendado)

**Criar CloudWatch Alarms para:**
- Lambda Errors > 10 in 5 minutes
- API Gateway 5XX > 50 in 5 minutes
- Lambda Duration > 5000ms (p95)
- DynamoDB UserErrors > 100 in 5 minutes

**Notificação:**
- SNS Topic → Email/SMS
- SNS Topic → Slack webhook
- SNS Topic → PagerDuty

### Cloudflare Analytics

**Métricas disponíveis:**
- Total requests
- Bandwidth
- Threats blocked
- Cache hit ratio
- Status codes
- Top URLs
- Top countries

---

## Custos

### Estimativa Mensal (AWS Free Tier)

**Lambda:**
- Requests: 1M grátis, depois $0.20/1M
- Duration: 400,000 GB-s grátis
- Estimativa: **$0** (dentro do Free Tier)

**API Gateway HTTP API:**
- Requests: 1M grátis (primeiro ano), depois $1.00/1M
- Estimativa: **$0** (Free Tier)

**DynamoDB:**
- Armazenamento: 25 GB grátis
- Reads: 25 RCU grátis (2.5M req/mês)
- Writes: 25 WCU grátis (2.5M req/mês)
- Estimativa: **$0-5/mês**

**CloudWatch:**
- Logs: 5 GB ingestion grátis
- Metrics: Básico grátis
- Estimativa: **$0-2/mês**

**ACM Certificate:**
- **$0** (grátis para uso público)

**Total estimado: $0-7/mês** (baixo tráfego)

### Estimativa com Tráfego Alto

**Cenário: 10M requests/mês**

| Serviço | Custo |
|---------|-------|
| Lambda | $2.00 (10M requests) |
| API Gateway | $10.00 (10M requests) |
| DynamoDB | $12.50 (10M writes) |
| CloudWatch | $5.00 (logs) |
| **Total** | **~$30/mês** |

### Cloudflare

**Plano Free**: $0/mês
- DDoS protection ilimitado
- SSL grátis
- CDN global
- 100,000 requests/day

**Plano Pro**: $20/mês (se necessário)
- WAF
- Image optimization
- Mais analytics

---

## Troubleshooting

### Problema: CORS Error no browser

**Sintoma:**
```
Access to fetch at 'https://api.fristad.com.br/api/interest' from origin 
'https://www.fristad.com.br' has been blocked by CORS policy
```

**Causas possíveis:**
1. Origin não está na allowlist
2. Cloudflare está bloqueando
3. Custom Domain não configurado

**Solução:**
```bash
# 1. Verificar configuração CORS
aws apigatewayv2 get-apis --query "Items[?Name=='prod-func-interest-fristad']"

# 2. Testar OPTIONS request
curl -i -X OPTIONS https://api.fristad.com.br/api/interest \
  -H "Origin: https://www.fristad.com.br"

# 3. Verificar headers retornados
# Deve ter: access-control-allow-origin
```

### Problema: 403 Forbidden

**Sintoma:**
```json
{"message":"Forbidden"}
```

**Causas:**
1. Custom Domain não mapeado
2. Cloudflare proxy ativo sem custom domain
3. WAF rule bloqueando

**Solução:**
```bash
# 1. Verificar custom domain
aws apigatewayv2 get-domain-names

# 2. Verificar mapeamento
aws apigatewayv2 get-api-mappings --domain-name api.fristad.com.br

# 3. Desativar proxy Cloudflare temporariamente (teste)
```

### Problema: 500 Internal Server Error

**Sintoma:**
```json
{"error":"INTERNAL_ERROR","message":"..."}
```

**Debug:**
```bash
# 1. Ver logs do Lambda
aws logs tail /aws/lambda/func-interest-fristad-prod-interest --follow

# 2. Verificar DynamoDB
aws dynamodb describe-table --table-name func-interest-fristad-prod

# 3. Verificar IAM permissions
aws lambda get-function --function-name func-interest-fristad-prod-interest
```

### Problema: Cold Start muito lento

**Sintoma**: Primeira requisição demora >2s

**Mitigação:**
1. Reduzir tamanho do bundle
2. Usar Provisioned Concurrency ($$$)
3. Keep-warm ping (cron)

```yaml
# serverless.yml
functions:
  interest:
    provisionedConcurrency: 1  # $$$
    # OU
    events:
      - schedule: rate(5 minutes)  # keep-warm
```

### Problema: DynamoDB Throttling

**Sintoma:**
```
ProvisionedThroughputExceededException
```

**Causa**: On-demand suporta até 40K writes/s, mas pode throttle em spikes

**Solução:**
```bash
# Verificar métricas
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=func-interest-fristad-prod \
  --start-time 2025-10-31T00:00:00Z \
  --end-time 2025-10-31T23:59:59Z \
  --period 300 \
  --statistics Sum

# Se necessário, provisionar capacidade
aws dynamodb update-table \
  --table-name func-interest-fristad-prod \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100
```

### Logs Úteis

**Lambda execution logs:**
```bash
aws logs tail /aws/lambda/func-interest-fristad-prod-interest \
  --follow \
  --format short
```

**API Gateway access logs:**
```bash
aws logs tail /aws/apigateway/func-interest-fristad-prod \
  --follow
```

**Filtrar por erro:**
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/func-interest-fristad-prod-interest \
  --filter-pattern "ERROR"
```

---

## Referências

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway HTTP API](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [Cloudflare Docs](https://developers.cloudflare.com/)

---

**Última atualização**: 2025-10-31  
**Versão**: 1.0.0  
**Autor**: Fristad Tech Team

