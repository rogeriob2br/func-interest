# func-interest - Azure Functions API

Function App para registrar interesse de usuários (nômades, anfitriões, árbitros) no MongoDB Atlas.

## ✅ O que funciona

- ✅ **Local**: `func start --typescript` na porta 7071
- ✅ **MongoDB Atlas**: conecta e grava documentos na collection `fristad.interests`
- ✅ **Validação**: persona, email, consent obrigatórios
- ✅ **Rate limit**: 60 req/min por IP (in-memory)

## ❌ O que está pendente

- ❌ **Azure Deploy**: Functions não são detectadas (404)
- Causa: Programming Model v4 precisa de estrutura específica que ainda não configuramos corretamente

## 🚀 Como rodar local

```bash
cd /home/rogerio/agora/fristad/tecnologia/backend/func-interest
npm i
func start --typescript
```

Endpoints:
- `POST http://localhost:7071/api/interest`
- `GET http://localhost:7071/api/health`

## 📦 Estrutura

```
func-interest/
├── src/
│   ├── functions/
│   │   ├── interest.ts    # POST /api/interest (valida + grava Mongo)
│   │   └── health.ts      # GET /api/health
│   └── index.ts           # Entry point (importa funções)
├── test/
│   └── core/
│       ├── validate.spec.ts
│       └── repo.mongo.spec.ts
├── host.json
├── local.settings.json    # (gitignored)
├── package.json
└── tsconfig.json
```

##  Endpoints

### POST /api/interest

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
  "id": "68e1ab766908325723afc671",
  "createdAt": "2025-10-04T23:19:19.011Z"
}
```

**Erros:**
- 400: `{ "error": "VALIDATION_ERROR", "details": { "email": "invalid format" } }`
- 429: `{ "error": "RATE_LIMIT" }`
- 500: `{ "error": "INTERNAL_ERROR", "message": "..." }`

### GET /api/health

**Resposta 200:**
```json
{
  "ok": true,
  "time": "2025-10-04T23:19:19.011Z"
}
```

## ⚙️ Configuração

### Variáveis de ambiente (local.settings.json)

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "MONGODB_URI": "mongodb+srv://user:pass@cluster.mongodb.net/",
    "MONGODB_DB": "fristad",
    "MONGODB_COLLECTION": "interests",
    "RATE_LIMIT_WINDOW_MS": "60000",
    "RATE_LIMIT_MAX": "60"
  }
}
```

### Variáveis no Azure Function App (Configuration → Application settings)

Adicione as mesmas variáveis acima (exceto `FUNCTIONS_WORKER_RUNTIME`).

## 🔧 Deploy Azure (pendente de correção)

**Status atual**: Deploy completa mas funções não aparecem (404).

**Comandos tentados:**
```bash
func azure functionapp publish func-interest-fristad
func azure functionapp publish func-interest-fristad --build remote
npm run build && func azure functionapp publish func-interest-fristad
```

**Próximos passos para corrigir:**
1. Verificar se o Programming Model v4 está configurado corretamente no `package.json`
2. Confirmar que `dist/index.js` e `dist/functions/*.js` existem após build
3. Testar deploy com estrutura de diretórios alternativa (flat structure)
4. Considerar migrar para Programming Model v3 (function.json) se v4 continuar falhando

## 📚 Documentação útil

- [Azure Functions Node.js v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [MongoDB Node Driver](https://www.mongodb.com/docs/drivers/node/current/)
- [API Requirements](/home/rogerio/agora/fristad/tecnologia/backend/func-interest/../../../docs/api-requisitos.md)

## 🧪 Testes

```bash
npm test           # Vitest run
npm run test:watch # Vitest watch mode
```

## 📝 Notas

- Collection `interests` é criada automaticamente no MongoDB no primeiro insert
- IP do desenvolvedor deve estar na whitelist do MongoDB Atlas (Network Access)
- Rate limiter é in-memory (reseta ao reiniciar); para produção, considerar Redis

