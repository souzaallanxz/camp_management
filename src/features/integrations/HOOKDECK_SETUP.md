# Configuração da Integração Real com Hookdeck

## Pré-requisitos

1. **Conta no Hookdeck**: Crie uma conta em [hookdeck.com](https://hookdeck.com)
2. **API Key**: Gere uma API key no dashboard do Hookdeck
3. **Variável de Ambiente**: Configure `HOOKDECK_API_KEY` no seu ambiente

## Configuração da Variável de Ambiente

### Desenvolvimento Local
```bash
# .env.local
HOOKDECK_API_KEY=your_hookdeck_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Produção (Vercel/Render)
```bash
# Variáveis de ambiente
HOOKDECK_API_KEY=your_hookdeck_api_key_here
NEXT_PUBLIC_APP_URL=https://campmanagement.vercel.app
```

## Como Funciona a Integração

### 1. Criação de Webhook
Quando você ativa um webhook na interface:

1. **Destination**: Cria um endpoint de destino no Hookdeck apontando para seu backend
2. **Source**: Cria uma URL pública do Hookdeck para receber webhooks externos
3. **Connection**: Liga o Source ao Destination

### 2. URLs Geradas
- **URL Pública**: `https://hkdk.events/abc123xyz` (para enviar webhooks)
- **URL de Destino**: `https://campmanagement.vercel.app/api/webhooks/registrations/{teamId}`

### 3. Fluxo de Dados
```
Sistema Externo → Hookdeck URL → Seu Backend → Banco de Dados
```

## Endpoints da API

### POST /api/webhooks/setup
Cria uma nova connection no Hookdeck.

**Request:**
```json
{
  "webhookType": "registrations" // ou "payments"
}
```

**Response:**
```json
{
  "connection": { "id": "conn_abc123" },
  "source": { 
    "id": "src_xyz789", 
    "url": "https://hkdk.events/abc123xyz" 
  },
  "destination": { "id": "dst_def456" },
  "webhookUrl": "https://hkdk.events/abc123xyz"
}
```

### DELETE /api/webhooks/cleanup
Remove uma connection do Hookdeck.

**Request:**
```json
{
  "connectionId": "conn_abc123"
}
```

## Testando os Webhooks

### 1. Teste de Registration
```bash
curl -X POST https://hkdk.events/abc123xyz \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@email.com",
    "contact": "+351912345678"
  }'
```

### 2. Teste de Payment
```bash
curl -X POST https://hkdk.events/abc123xyz \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@email.com",
    "amount": 50.00,
    "status": "paid"
  }'
```

## Monitoramento

Acesse o dashboard do Hookdeck para:
- Ver requisições recebidas
- Monitorar tentativas de entrega
- Ver logs detalhados
- Configurar retry policies

## Troubleshooting

### Erro: "HOOKDECK_API_KEY not configured"
- Verifique se a variável de ambiente está configurada
- Reinicie o servidor após configurar a variável

### Erro: "Failed to create destination/source/connection"
- Verifique se a API key é válida
- Confirme se tem permissões suficientes na conta do Hookdeck
- Verifique se a URL de destino está acessível

### Webhook não está recebendo dados
- Confirme se a URL do Hookdeck está correta
- Verifique se o webhook está ativo na configuração
- Teste a conectividade do endpoint de destino

## Segurança

- Todas as requisições passam pelo Hookdeck antes de chegar ao seu backend
- O Hookdeck pode validar assinaturas e filtrar requisições maliciosas
- Configure rate limiting no dashboard do Hookdeck
- Use HTTPS sempre para endpoints de webhook 