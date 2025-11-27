# Changelog - API Interest

## [2.0.0] - 2025-11-26

### 🎯 Mudanças Principais

Atualização completa do contrato da API para suportar o **formulário multi-step de nômades digitais**.

### ✅ Adicionado

**Novos campos obrigatórios:**
- `cities` (array de 1-5 cidades)
- `accommodationType` (tipo de acomodação preferida)
- `budget` (faixa de orçamento mensal)
- `duration` (duração da estadia)
- `languages` (array de idiomas, mínimo 1)

**Novos campos opcionais:**
- `needs` (array de necessidades, suporta valores predefinidos + "outros: <texto>")
- `startDate` (data aproximada de início)
- `bio` (bio curta, máximo 280 caracteres)

**Metadata adicional:**
- `source: 'web_form'`
- `version: 'v2_nomad_multistep'`
- `userAgent` (extraído do request)
- `ipAddress` (extraído do request, LGPD compliant)

### ❌ Removido

Campos do formato antigo (anfitrião/árbitro):
- `countries` (substituído por `cities`)
- `propertyTitle`
- `propertyLocation`
- `propertySummary`

### 🔒 Validações Implementadas

1. **Persona:** Deve ser obrigatoriamente `"nomade"`
2. **Email:** Validação com regex (formato válido)
3. **Name:** 2-100 caracteres
4. **Cities:** 1-5 itens, todos strings não vazias
5. **Needs:** Array (pode ser vazio), valores predefinidos ou com prefixo `"outros:"`
6. **AccommodationType:** Deve estar no enum permitido
7. **Budget:** Deve estar no enum permitido
8. **Duration:** Deve estar no enum permitido
9. **Languages:** Mínimo 1, todos valores no enum permitido
10. **Consent:** Deve ser explicitamente `true`
11. **Nostr:** Se fornecido, validar formato `npub1...` (58-63 chars)
12. **Bio:** Se fornecido, máximo 280 caracteres

### 📋 Enums Permitidos

**needs:** `wifi_fast`, `workspace`, `community`, `quiet`, `gym`, `kitchen`, `laundry`, `pets`, ou `outros: <texto>`

**accommodationType:** `private_room`, `apartment_studio`, `apartment_1_2br`, `house`, `coliving`

**budget:** `under_500`, `500-1000`, `1000-1500`, `1500-2000`, `2000-3000`, `over_3000`

**duration:** `1-month`, `2-3-months`, `3-6-months`, `6-12-months`, `1-year-plus`, `flexible`

**languages:** `pt`, `en`, `es`, `fr`, `de`, `it`, `other`

### 🔄 Breaking Changes

⚠️ **ATENÇÃO:** Esta é uma mudança **BREAKING**. O formato antigo não é mais suportado.

- Persona agora aceita **apenas** `"nomade"`
- Campos antigos (`countries`, `propertyTitle`, etc.) foram removidos
- Novos campos obrigatórios foram adicionados

### 📚 Documentação

Consulte o contrato completo da API em:
`fristad/tecnologia/site institucional/docs/api-contract-nomad-form.md`

---

## Exemplo de Request

```json
{
  "persona": "nomade",
  "email": "joao.silva@example.com",
  "name": "João Silva",
  "nostr": "npub1abc123def456...",
  "cities": ["Lisboa, Portugal", "Barcelona, Spain"],
  "needs": ["wifi_fast", "workspace", "community"],
  "accommodationType": "apartment_studio",
  "budget": "1000-1500",
  "duration": "3-6-months",
  "startDate": "2025-06",
  "languages": ["pt", "en", "es"],
  "bio": "Desenvolvedor full-stack trabalhando remotamente.",
  "consent": true
}
```

## Response (Success)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-11-26T14:30:00Z"
}
```

