# Atualizações no Formulário de Pagamento

## Alterações Implementadas

### 1. Schema Atualizado

**Arquivo**: `src/features/registrations/data/schema.ts`

Adicionado campo `request_id` ao schema de Payment:

```typescript
export const paymentSchema = z.object({
  // ... outros campos
  request_id: z.string().nullable(),
  // ... outros campos
})
```

### 2. Serviço de Pagamento Atualizado

**Arquivo**: `src/features/registrations/services/payment-service.ts`

Adicionado campo `request_id` à interface `CreatePaymentData`:

```typescript
export interface CreatePaymentData {
  // ... outros campos
  request_id?: string | null;
}
```

### 3. Lógica do Formulário Implementada

**Arquivo**: `src/features/registrations/components/payment-form.tsx`

Implementada lógica para gerar `request_id` quando o método de pagamento for MB Way:

```typescript
// Gerar request_id se for MB Way
// Formato: "R" + form_id (ex: "R123456")
let requestId = null
if (paymentMethod === 'MB Way' && registration?.form_id) {
  requestId = `R${registration.form_id}`
}

await paymentService.createPayment({
  // ... outros campos
  request_id: requestId
})
```

## Como Funciona

### Cenário: Pagamento MB Way
1. **Usuário seleciona**: Método de pagamento "MB Way"
2. **Sistema verifica**: Se o registration tem `form_id`
3. **Sistema gera**: `request_id = "R" + form_id`
4. **Exemplo**: Se `form_id = "123456"`, então `request_id = "R123456"`

### Cenário: Outros Métodos de Pagamento
1. **Usuário seleciona**: Qualquer outro método (Transferência, Dinheiro, etc.)
2. **Sistema define**: `request_id = null`
3. **Pagamento criado**: Sem request_id

## Benefícios

1. **Rastreabilidade**: Pagamentos MB Way podem ser rastreados pelo form_id
2. **Integração com Webhook**: O request_id gerado pode ser usado no webhook para confirmar pagamentos
3. **Compatibilidade**: Outros métodos de pagamento continuam funcionando normalmente

## Exemplo de Uso

```typescript
// Quando o usuário cria um pagamento MB Way
const paymentData = {
  registration_id: "uuid-da-registration",
  amount: 50.00,
  payment_method: "MB Way",
  payment_date: "2024-01-15T10:30:00Z",
  phone_number: "+351912345678",
  request_id: "R123456" // Gerado automaticamente
}
```

## Integração com Webhook

O `request_id` gerado (ex: "R123456") pode ser usado no webhook de pagamentos:

```bash
# Confirmar pagamento existente
curl -X POST "https://your-hookdeck-url.com?request_id=R123456" \
  -H "Content-Type: application/json" \
  -d '{"amount": 50.00}'
```

O webhook irá:
1. Identificar que o request_id começa com "R"
2. Fazer UPDATE na tabela payments
3. Confirmar o pagamento (`payment_status = 'confirmed'`) 