# Teste do Request ID nos Pagamentos

## Problema Identificado

Quando uma nova inscrição é criada e o pagamento é feito imediatamente, o `request_id` não está sendo criado corretamente com o formato "R" + `form_id`.

## Soluções Implementadas

### 1. Backend - Endpoint POST /api/payments
- ✅ Adicionado campo `request_id` no body da requisição
- ✅ Adicionado campo `request_id` na query SQL de INSERT
- ✅ Adicionado campo `request_id` na query SQL de SELECT

### 2. Frontend - Payment Form
- ✅ Lógica implementada para gerar `request_id = "R" + form_id`
- ✅ Campo `request_id` adicionado à interface `CreatePaymentData`
- ✅ Campo `request_id` adicionado ao schema de Payment

### 3. Schema - Drizzle
- ✅ Campo `request_id` adicionado à tabela `payments` no schema

## Como Testar

### 1. Criar uma nova inscrição com form_id
```typescript
// Exemplo: form_id = "123456"
```

### 2. Fazer um pagamento MB Way
```typescript
// O sistema deve gerar: request_id = "R123456"
```

### 3. Verificar no banco de dados
```sql
SELECT id, registration_id, payment_method, amount, request_id 
FROM payments 
WHERE registration_id = 'uuid-da-registration'
ORDER BY created_at DESC;
```

### 4. Verificar via API
```bash
curl -X GET "http://localhost:3001/api/payments?registrationId=uuid-da-registration" \
  -H "x-team-id: seu-team-id"
```

## Resultado Esperado

O pagamento deve ter:
- `payment_method = "MB Way"`
- `request_id = "R123456"` (onde 123456 é o form_id da inscrição)
- `payment_status = "not confirmed"`

## Integração com Webhook

O `request_id` gerado pode ser usado no webhook para confirmar o pagamento:

```bash
curl -X POST "https://your-webhook-url.com?request_id=R123456" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.00}'
```

O webhook irá:
1. Identificar que o request_id começa com "R"
2. Fazer UPDATE na tabela payments
3. Confirmar o pagamento (`payment_status = 'confirmed'`) 