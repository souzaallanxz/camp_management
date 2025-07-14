# Atualizações nos Formulários de Snackbar Balance

## Alterações Implementadas

### 1. Schema Atualizado

**Arquivo**: `src/features/registrations/data/schema.ts`

Adicionado campo `request_id` ao schema de SnackbarBalance:

```typescript
export const snackbarBalanceSchema = z.object({
  // ... outros campos
  request_id: z.string().nullable(),
  // ... outros campos
})
```

### 2. Formulário de Snackbar Balance para Campers

**Arquivo**: `src/features/registrations/components/snackbar-balance-form.tsx`

Implementada lógica para gerar `request_id` quando o método de pagamento for MB Way:

```typescript
// Gerar request_id se for MB Way
// Formato: "S" + form_id (ex: "S123456")
let requestId = null
if (paymentMethod === 'MB Way' && registration?.form_id) {
  requestId = `S${registration.form_id}`
}

await saveSnackbarBalance({
  // ... outros campos
  request_id: requestId
})
```

### 3. Formulário de Snackbar Balance para Staff

**Arquivo**: `src/features/staff/components/staff-snackbar-balance-dialog.tsx`

Implementada lógica para gerar `request_id` quando o método de pagamento for MB Way:

```typescript
// Gerar request_id se for MB Way
// Formato: "S" + primeiros 5 dígitos do staff_id
let requestId = null
if (paymentMethod === 'MB Way' && staffId) {
  const staffIdStr = staffId.replace(/-/g, '') // Remove hífens
  requestId = `S${staffIdStr.substring(0, 5)}`
}

await saveStaffSnackbarBalance({
  // ... outros campos
  request_id: requestId
})
```

### 4. Endpoints Atualizados

**Arquivo**: `server.ts`

#### Endpoint `/api/snackbar-balance` (Campers)
```typescript
const { registration_id, amount, payment_method, phone_number, request_id } = req.body;

const result = await sql`
  INSERT INTO snackbar_balance (
    registration_id, amount, payment_method, phone_number, request_id, created_at, updated_at
  ) VALUES (
    ${registration_id}, ${amount}, ${payment_method}, ${phone_number}, ${request_id || null}, ${now}, ${now}
  ) RETURNING *
`;
```

#### Endpoint `/api/staff-snackbar-balance` (Staff)
```typescript
const { staff_id, amount, payment_method, phone_number, request_id } = req.body;

const result = await sql`
  INSERT INTO snackbar_balance (
    staff_id, amount, payment_method, phone_number, request_id, created_at, updated_at
  ) VALUES (
    ${staff_id}, ${amount}, ${payment_method}, ${phone_number}, ${request_id || null}, ${now}, ${now}
  ) RETURNING *
`;
```

## Como Funciona

### Cenário: Carregamento MB Way para Camper
1. **Usuário seleciona**: Método de pagamento "MB Way"
2. **Sistema busca**: Registration para obter `form_id`
3. **Sistema gera**: `request_id = "S" + form_id`
4. **Exemplo**: Se `form_id = "123456"`, então `request_id = "S123456"`

### Cenário: Carregamento MB Way para Staff
1. **Usuário seleciona**: Método de pagamento "MB Way"
2. **Sistema processa**: Staff ID (remove hífens)
3. **Sistema gera**: `request_id = "S" + primeiros 5 dígitos`
4. **Exemplo**: Se `staff_id = "550e8400-e29b-41d4-a716-446655440000"`, então `request_id = "S550e8"`

### Cenário: Outros Métodos de Pagamento
1. **Usuário seleciona**: Qualquer outro método (Transferência, Dinheiro, etc.)
2. **Sistema define**: `request_id = null`
3. **Carregamento criado**: Sem request_id

## Benefícios

1. **Rastreabilidade**: Carregamentos MB Way podem ser rastreados pelo form_id ou staff_id
2. **Integração com Webhook**: O request_id gerado pode ser usado no webhook para confirmar carregamentos
3. **Compatibilidade**: Outros métodos de pagamento continuam funcionando normalmente

## Exemplo de Uso

### Para Campers
```typescript
// Quando o usuário cria um carregamento MB Way para camper
const balanceData = {
  registration_id: "uuid-da-registration",
  amount: 10.00,
  payment_method: "MB Way",
  phone_number: "+351912345678",
  request_id: "S123456" // Gerado automaticamente
}
```

### Para Staff
```typescript
// Quando o usuário cria um carregamento MB Way para staff
const balanceData = {
  staff_id: "550e8400-e29b-41d4-a716-446655440000",
  amount: 20.00,
  payment_method: "MB Way",
  phone_number: "+351912345678",
  request_id: "S550e8" // Gerado automaticamente
}
```

## Integração com Webhook

O `request_id` gerado (ex: "S123456" ou "S550e8") pode ser usado no webhook de pagamentos:

```bash
# Confirmar carregamento existente
curl -X POST "https://your-hookdeck-url.com?request_id=S123456" \
  -H "Content-Type: application/json" \
  -d '{"amount": 10.00}'
```

O webhook irá:
1. Identificar que o request_id começa com "S"
2. Fazer UPDATE na tabela snackbar_balance
3. Confirmar o carregamento (`payment_status = 'confirmed'`)

## Diferenças entre Pagamentos e Carregamentos

| Tipo | Prefixo | Tabela | Exemplo |
|------|---------|--------|---------|
| Pagamento | "R" | payments | "R123456" |
| Carregamento Camper | "S" | snackbar_balance | "S123456" |
| Carregamento Staff | "S" | snackbar_balance | "S550e8" | 