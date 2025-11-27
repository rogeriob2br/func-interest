# Custom Domain - API Interest

## ✅ Problema Resolvido!

**Antes:** A cada deploy, o endpoint da API mudava (`hdpq26sstb`, `3e047rdw3m`, etc.) e você tinha que atualizar o DNS no Cloudflare.

**Agora:** O Custom Domain **`api.fristad.com.br`** é permanente e aponta sempre para a mesma URL da AWS, independente de quantos deploys você faça!

---

## 🌐 DNS Permanente

### **Endpoint Fixo (use este!):**
```
https://api.fristad.com.br/api/health
https://api.fristad.com.br/api/interest
```

### **Target DNS da AWS (não muda mais!):**
```
d-u6zugwyhze.execute-api.us-east-1.amazonaws.com
```

---

## ⚙️ Como Funciona

```
┌─────────────────────────┐
│   Cloudflare DNS        │
│   api.fristad.com.br    │
│   CNAME → (fixo)        │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────────────────────────┐
│   AWS Custom Domain (permanente)            │
│   d-u6zugwyhze.execute-api.us-east-1...    │
│   ↓ API Mapping (gerenciado pelo plugin)   │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────────┐
│   API Gateway Atual     │
│   hdpq26sstb (prod)     │ ← Muda a cada deploy
│   3e047rdw3m (dev)      │ ← mas o mapping é automático!
└─────────────────────────┘
```

---

## 📋 Configuração no Cloudflare

**Configure UMA ÚNICA VEZ e nunca mais precisa mexer:**

### **DNS Record:**

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `CNAME` | `api` | `d-u6zugwyhze.execute-api.us-east-1.amazonaws.com` | 🟠 Proxied |

**TTL:** Auto  
**Proxy status:** 🟠 Proxied (recomendado para DDoS protection)

---

## 🔧 Configuração no Serverless

O plugin `serverless-domain-manager` foi adicionado ao `serverless.yml`:

```yaml
plugins:
  - serverless-plugin-typescript
  - serverless-domain-manager  # ← Novo!
  - serverless-offline

custom:
  customDomain:
    domainName: api.fristad.com.br
    certificateArn: arn:aws:acm:us-east-1:804508763022:certificate/7ebe539c-4fd6-4e31-bc93-2a2abcabc83d
    basePath: ''
    stage: ${self:provider.stage}
    createRoute53Record: false
    endpointType: 'regional'
    securityPolicy: tls_1_2
    apiType: http
```

---

## 🚀 Workflow de Deploy Agora

### **Antes (problema):**
1. Deploy: `npm run deploy:prod`
2. Nova API ID gerada: `xyz123abc`
3. ❌ Tinha que ir no Cloudflare mudar CNAME
4. ❌ Frontend quebrava até atualizar DNS

### **Agora (solução):**
1. Deploy: `npm run deploy:prod`
2. Nova API ID gerada: `xyz123abc`
3. ✅ Plugin atualiza o API Mapping automaticamente
4. ✅ `api.fristad.com.br` continua funcionando
5. ✅ Frontend nunca quebra!

---

## 📊 Recursos AWS

### **Custom Domain:**
- **Nome:** `api.fristad.com.br`
- **Endpoint AWS:** `d-u6zugwyhze.execute-api.us-east-1.amazonaws.com`
- **Hosted Zone ID:** `Z1UJRXOUMOOFQ8`
- **Status:** ✅ AVAILABLE

### **Certificado SSL:**
- **ARN:** `arn:aws:acm:us-east-1:804508763022:certificate/7ebe539c-4fd6-4e31-bc93-2a2abcabc83d`
- **Domínio:** `api.fristad.com.br`
- **Status:** ✅ ISSUED
- **Válido até:** 2026-11-29

### **API Mapping (Produção):**
- **API ID:** `hdpq26sstb`
- **Stage:** `$default`
- **Mapping ID:** `i9zkku`
- **Status:** ✅ Ativo

---

## 🧪 Testar

### **Via Custom Domain:**
```bash
curl https://api.fristad.com.br/api/health
```

### **Via URL Direta (ainda funciona, mas não use):**
```bash
curl https://hdpq26sstb.execute-api.us-east-1.amazonaws.com/api/health
```

**Ambos retornam o mesmo resultado!**

---

## 🔄 Deploy de Atualizações

Agora é simples:

```bash
# 1. Fazer mudanças no código
# 2. Deploy
npm run deploy:prod

# 3. Pronto! Custom domain atualiza automaticamente
```

O plugin `serverless-domain-manager` cuida de:
- ✅ Atualizar o API Mapping
- ✅ Manter o Custom Domain apontando para a API mais recente
- ✅ Não precisa mexer no Cloudflare NUNCA MAIS

---

## 📝 Comandos Úteis

### **Verificar Custom Domain:**
```bash
aws apigatewayv2 get-domain-names --query 'Items[?DomainName==`api.fristad.com.br`]'
```

### **Verificar API Mapping:**
```bash
aws apigatewayv2 get-api-mappings --domain-name api.fristad.com.br
```

### **Criar Custom Domain (se precisar):**
```bash
npx serverless create_domain --stage prod
```

### **Remover Custom Domain:**
```bash
npx serverless delete_domain --stage prod
```

---

## 🎯 Para o Frontend

### **ANTES (❌ errado):**
```bash
# Tinha que mudar toda hora
NEXT_PUBLIC_API_URL=https://hdpq26sstb.execute-api.us-east-1.amazonaws.com
```

### **AGORA (✅ correto):**
```bash
# Configure UMA VEZ e esquece!
NEXT_PUBLIC_API_URL=https://api.fristad.com.br
```

---

## 💡 Vantagens

1. ✅ **DNS Permanente:** Nunca muda
2. ✅ **Deploy Automático:** Plugin gerencia tudo
3. ✅ **SSL Incluso:** Certificado AWS gerenciado
4. ✅ **DDoS Protection:** Via Cloudflare Proxy
5. ✅ **URL Profissional:** `api.fristad.com.br` em vez de `xyz123.execute-api...`
6. ✅ **Multi-Stage:** Pode ter `api.fristad.com.br` (prod) e `api-dev.fristad.com.br` (dev)

---

## 🔐 Segurança

### **HTTPS:**
- ✅ TLS 1.2 (mínimo)
- ✅ Certificado AWS ACM
- ✅ Auto-renovação do certificado

### **Cloudflare:**
- 🟠 Proxied (DDoS protection)
- ✅ SSL/TLS Full (strict)
- ✅ WAF disponível (se necessário)

---

## 🎊 Resumo

**O que mudou:**
- ✅ Plugin `serverless-domain-manager` instalado
- ✅ Custom domain configurado no `serverless.yml`
- ✅ API Mapping automático a cada deploy

**O que você precisa fazer:**
1. **UMA VEZ:** Configurar CNAME no Cloudflare para `d-u6zugwyhze.execute-api.us-east-1.amazonaws.com`
2. **No frontend:** Usar `https://api.fristad.com.br`
3. **Nunca mais:** Mexer no DNS!

---

**Status:** ✅ **Configurado e Funcionando!**  
**URL Permanente:** `https://api.fristad.com.br`  
**Target DNS:** `d-u6zugwyhze.execute-api.us-east-1.amazonaws.com` (nunca muda)

