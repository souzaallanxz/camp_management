# Integração de Webhooks com Hookdeck

Este sistema permite configurar webhooks para receber notificações em tempo real sobre registrations e pagamentos, utilizando o Hookdeck como proxy e gerenciador de webhooks.

> **Nota de Desenvolvimento**: A implementação atual usa uma simulação do Hookdeck para desenvolvimento. Em produção, você deve configurar uma API key real do Hookdeck e fazer as chamadas da API através do seu backend.

## Como Funciona

1. **Configuração**: O usuário ativa os webhooks desejados na página de integrações
2. **Hookdeck Setup**: Automaticamente cria destinations, sources e connections no Hookdeck (simulado)
3. **URL Pública**: O sistema fornece URLs simuladas para integração
4. **Processamento**: Os dados são recebidos e processados automaticamente

## Webhooks Disponíveis

### 1. Webhook para Registrations

**Endpoint**: `POST /webhooks/registrations/{userId}`

**Payload Esperado**:
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "contact": "+351912345678",
  "form_id": "form_123",
  "camp_id": "uuid-do-camp",
  "status": "unpaid",
  "id_number": "12345678",
  "sns_number": "123456789",
  "date_of_birth": "2010-05-15",
  "dietary_restrictions": "Vegetariano",
  "guardian_name": "Maria Silva",
  "guardian_email": "maria@email.com",
  "guardian_phone": "+351912345679"
}
```

**Campos Obrigatórios**:
- `name`: Nome do participante
- `email`: Email de contato
- `contact`: Telefone de contato

**Campos Opcionais**:
- `form_id`: ID do formulário de origem
- `camp_id`: ID do camp (se aplicável)
- `status`: Status do registro (`unpaid`, `paid`, etc.)
- `id_number`: Número de identificação
- `sns_number`: Número do SNS
- `date_of_birth`: Data de nascimento (formato: YYYY-MM-DD)
- `dietary_restrictions`: Restrições alimentares
- `guardian_name`: Nome do responsável
- `guardian_email`: Email do responsável
- `guardian_phone`: Telefone do responsável

### 2. Webhook para Pagamentos

**Endpoint**: `POST /webhooks/payments/{userId}`

**Payload Esperado**:
```json
{
  "registration_id": "uuid-do-registro",
  "amount": 50.00,
  "status": "paid"
}
```

**Ou identificando por email**:
```json
{
  "email": "joao@email.com",
  "amount": 50.00,
  "status": "paid"
}
```

**Campos Obrigatórios**:
- `amount`: Valor do pagamento
- `registration_id` OU `email`: Para identificar o registro

**Campos Opcionais**:
- `status`: Novo status do registro

## Configuração no Frontend

### 1. Ativar Webhook

```typescript
import { webhookService } from '../services/webhook-service'

// Ativar webhook para registrations
const config = await webhookService.enableWebhook('registrations')
console.log('URL do webhook:', config.registrationWebhookUrl)

// Ativar webhook para pagamentos
const config = await webhookService.enableWebhook('payments')
console.log('URL do webhook:', config.paymentWebhookUrl)
```

### 2. Desativar Webhook

```typescript
// Desativar webhook
const config = await webhookService.disableWebhook('registrations')
```

### 3. Obter Configuração Atual

```typescript
const config = webhookService.loadConfig()
console.log('Webhooks ativos:', {
  registrations: config.registrationWebhook,
  payments: config.paymentWebhook,
  urls: {
    registrations: config.registrationWebhookUrl,
    payments: config.paymentWebhookUrl
  }
})
```

## Estrutura da Resposta

### Sucesso (Registration)
```json
{
  "success": true,
  "message": "Registration created successfully",
  "registration": {
    "id": "uuid-gerado",
    "name": "João Silva",
    "email": "joao@email.com",
    "status": "unpaid",
    "created_at": "2024-01-15T10:30:00Z",
    // ... outros campos
  }
}
```

### Sucesso (Payment)
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "registration": {
    "id": "uuid-do-registro",
    "total_amount_paid": 50.00,
    "status": "paid",
    // ... outros campos
  },
  "payment": {
    "amount": 50.00,
    "total_paid": 50.00,
    "status": "paid"
  }
}
```

### Erro
```json
{
  "error": "Validation failed",
  "details": ["name is required", "email is required"]
}
```

## Variáveis de Ambiente

Para usar o Hookdeck, configure a seguinte variável:

```env
HOOKDECK_API_KEY=your_hookdeck_api_key_here
```

## Configuração para Produção

Para usar o Hookdeck real em produção, você precisa:

1. **Obter API Key do Hookdeck**:
   - Crie uma conta em [hookdeck.com](https://hookdeck.com)
   - Gere uma API key no dashboard
   - Configure a variável de ambiente `HOOKDECK_API_KEY`

2. **Mover Chamadas para o Backend**:
   - As chamadas da API do Hookdeck devem ser feitas do seu backend, não do frontend
   - Crie endpoints no seu backend para gerenciar webhooks
   - Use a API key do Hookdeck apenas no servidor

3. **Exemplo de Implementação Backend**:
   ```javascript
   // backend/webhooks.js
   app.post('/api/webhooks/setup', async (req, res) => {
     const { userId, webhookType } = req.body
     
     const hookdeckResponse = await fetch('https://api.hookdeck.com/destinations', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.HOOKDECK_API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         name: `Webhook ${webhookType} para User ${userId}`,
         url: `${process.env.BASE_URL}/api/webhooks/${webhookType}/${userId}`
       })
     })
     
     // ... resto da lógica
   })
   ```

## Testando os Webhooks

### 1. Usando curl para Registration

```bash
curl -X POST https://your-hookdeck-url.com \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "contact": "+351912345678"
  }'
```

### 2. Usando curl para Payment

```bash
curl -X POST https://your-hookdeck-url.com \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "amount": 50.00,
    "status": "paid"
  }'
```

## Monitoramento

O Hookdeck fornece um dashboard completo para monitorar:
- Requisições recebidas
- Tentativas de entrega
- Falhas e reenvios
- Logs detalhados

Acesse o dashboard do Hookdeck para acompanhar o status dos seus webhooks.

## Segurança

- Todas as requisições passam pelo Hookdeck antes de chegar ao seu backend
- O Hookdeck pode validar assinaturas e filtrar requisições maliciosas
- Configure rate limiting e outras proteções no dashboard do Hookdeck
- Use HTTPS sempre para endpoints de webhook

## Troubleshooting

### Webhook não está recebendo dados
1. Verifique se o webhook está ativo na configuração
2. Confirme se a URL do Hookdeck está correta
3. Verifique os logs no dashboard do Hookdeck
4. Teste a conectividade do endpoint de destino

### Erro de validação
1. Confirme se todos os campos obrigatórios estão presentes
2. Verifique o formato dos dados (especialmente datas e UUIDs)
3. Consulte os logs de erro no backend

### Problemas de autenticação
1. Verifique se a API Key do Hookdeck está configurada
2. Confirme se o userId na URL está correto
3. Teste a conectividade com a API do Hookdeck 