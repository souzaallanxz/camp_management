# Atualizações no Webhook de Payments

## Alterações Implementadas

### 1. Query Parameter para request_id

**Antes:**
```javascript
// request_id era enviado no body
const { request_id } = req.body;
```

**Depois:**
```javascript
// request_id agora é query parameter
const { request_id } = req.query;
```

**URL de exemplo:**
```
POST /api/webhooks/payments/{teamId}?request_id=req_123456
```

### 2. Nova Lógica Baseada no Tipo de request_id

O webhook agora processa diferentes ações baseado no prefixo do `request_id`:

#### **request_id começa com "R"**
- **Ação**: UPDATE na tabela `payments`
- **Objetivo**: Confirmar pagamento existente
- **Campo atualizado**: `payment_status = 'confirmed'`

#### **request_id começa com "S"**
- **Ação**: UPDATE na tabela `snackbar_balance`
- **Objetivo**: Confirmar pagamento de snackbar existente
- **Campo atualizado**: `payment_status = 'confirmed'`

#### **request_id não começa com "R" nem "S"**
- **Ação**: INSERT na tabela `payments`
- **Objetivo**: Criar novo pagamento
- **Valores padrão**:
  - `payment_method = 'MB Way'`
  - `payment_status = 'confirmed'`
  - `payment_link = null`

### 2. Novas Colunas na Tabela snackbar_balance

#### Scripts SQL para Executar Manualmente:

```sql
-- Adicionar coluna request_id
ALTER TABLE snackbar_balance ADD COLUMN request_id VARCHAR(255);

-- Adicionar coluna payment_status com default 'not confirmed'
-- Registos existentes serão atualizados para 'confirmed'
ALTER TABLE snackbar_balance ADD COLUMN payment_status VARCHAR(50) DEFAULT 'not confirmed';

-- Atualizar registos existentes para terem payment_status = 'confirmed'
UPDATE snackbar_balance SET payment_status = 'confirmed' WHERE payment_status IS NULL;
```

### 3. Documentação Atualizada

A documentação foi atualizada para refletir:
- Uso de query parameters para `request_id`
- Novos campos opcionais no payload
- Exemplos de uso com curl
- Respostas mais detalhadas

## Como Usar

### 1. Confirmar Pagamento Existente (request_id começa com "R")
```bash
curl -X POST "https://your-hookdeck-url.com?request_id=R123456" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00
  }'
```

### 2. Confirmar Pagamento de Snackbar (request_id começa com "S")
```bash
curl -X POST "https://your-hookdeck-url.com?request_id=S789012" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.00
  }'
```

### 3. Criar Novo Pagamento (request_id não começa com "R" nem "S")
```bash
curl -X POST "https://your-hookdeck-url.com?request_id=PAY_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "phone_number": "+351912345678"
  }'
```

### 4. Identificação por email (Body)
```bash
curl -X POST https://your-hookdeck-url.com \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "amount": 50.00,
    "payment_method": "MB Way",
    "payment_status": "not confirmed"
  }'
```

## Campos Disponíveis

### Query Parameters
- `request_id` (opcional): ID do request para identificar o registro

### Body Parameters
- `email` (opcional): Email para identificar o registro
- `amount` (obrigatório): Valor do pagamento
- `payment_method` (opcional): Método de pagamento
- `payment_date` (opcional): Data do pagamento (ISO)
- `payment_status` (opcional): Status do pagamento
- `payment_link` (opcional): Link do pagamento
- `phone_number` (opcional): Número de telefone
- `status` (opcional): Novo status do registro

## Validações

1. **Campos obrigatórios**: `amount` + (`email` OU `request_id`)
2. **Team ID**: Deve ser válido
3. **Registration**: Deve existir e pertencer ao team
4. **Payment Status**: Se não fornecido, assume "not confirmed" (padrão para novos registos)

## Estados do Payment Status

- **"not confirmed"**: Pagamento não confirmado (padrão para novos registos)
- **"confirmed"**: Pagamento confirmado (estado dos registos existentes)

## Resposta de Sucesso

```json
{
  "success": true,
  "message": "Payment processed successfully",
  "registration": {
    "id": "uuid-do-registro",
    "total_amount_paid": 50.00,
    "status": "paid",
    "email": "joao@email.com",
    "name": "João Silva"
  },
  "payment": {
    "amount": 50.00,
    "total_paid": 50.00,
    "status": "paid",
    "payment_method": "MB Way",
    "payment_status": "not confirmed"
  }
}
``` 