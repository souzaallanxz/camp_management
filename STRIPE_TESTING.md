# Testando a Integração do Stripe

Este documento fornece exemplos práticos para testar a integração do Stripe.

## 1. Testando o Endpoint de Checkout

### 1.1 Usando curl

```bash
# Teste local
curl -X POST http://localhost:3001/api/billing/create-checkout-session \
  -H "Content-Type: application/json" \
  -H "x-team-id: YOUR_TEAM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email": "test@example.com"}'
```

### 1.2 Resposta Esperada

```json
{
  "sessionId": "cs_test_51ABC123...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_51ABC123..."
}
```

## 2. Testando o Status da Subscrição

### 2.1 Usando curl

```bash
curl -X GET http://localhost:3001/api/billing/subscription-status \
  -H "x-team-id: YOUR_TEAM_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.2 Resposta Esperada

```json
{
  "tier": "free",
  "isPremium": false,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

## 3. Testando Webhooks Localmente

### 3.1 Usando Stripe CLI

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Fazer login
stripe login

# Escutar webhooks
stripe listen --forward-to localhost:3001/api/billing/webhook

# Em outro terminal, disparar evento de teste
stripe trigger checkout.session.completed
```

### 3.2 Usando ngrok (Alternativa)

```bash
# Instalar ngrok
# https://ngrok.com/

# Expor servidor local
ngrok http 3001

# Usar URL do ngrok no webhook do Stripe
# https://abc123.ngrok.io/api/billing/webhook
```

## 4. Testando no Frontend

### 4.1 Fluxo Completo

1. **Acesse a página de billing**
   ```
   http://localhost:5173/settings/billing
   ```

2. **Clique em "Fazer Upgrade"**
   - Deve abrir nova aba com checkout do Stripe
   - Use cartão de teste: `4242 4242 4242 4242`

3. **Complete o pagamento**
   - Data: qualquer data futura
   - CVC: qualquer 3 dígitos
   - CEP: qualquer código postal

4. **Verifique o resultado**
   - Deve retornar à aplicação
   - Mostrar mensagem de sucesso
   - Tier deve ser atualizado para "premium"

### 4.2 Testando Cancelamento

1. **Acesse o Dashboard do Stripe**
   ```
   https://dashboard.stripe.com/test/subscriptions
   ```

2. **Encontre a subscrição**
   - Procure pelo customer criado

3. **Cancele a subscrição**
   - Clique em "Cancel subscription"

4. **Verifique na aplicação**
   - Tier deve voltar para "free"
   - Logs devem mostrar downgrade

## 5. Cartões de Teste

### 5.1 Cartões Válidos

| Número | Descrição |
|--------|-----------|
| `4242 4242 4242 4242` | Visa - Sucesso |
| `4000 0566 5566 5556` | Visa (débito) - Sucesso |
| `5555 5555 5555 4444` | Mastercard - Sucesso |
| `3782 822463 10005` | American Express - Sucesso |

### 5.2 Cartões de Erro

| Número | Descrição |
|--------|-----------|
| `4000 0000 0000 0002` | Cartão recusado |
| `4000 0000 0000 9995` | Fundos insuficientes |
| `4000 0000 0000 9987` | Cartão perdido |
| `4000 0000 0000 9979` | Cartão roubado |

### 5.3 Cartões 3D Secure

| Número | Descrição |
|--------|-----------|
| `4000 0025 0000 3155` | 3D Secure - Sucesso |
| `4000 0027 6000 3184` | 3D Secure - Falha |

## 6. Verificando Logs

### 6.1 Logs do Servidor

```bash
# Logs em tempo real
tail -f server.log | grep -i stripe

# Logs específicos
grep "checkout.session.completed" server.log
grep "Team.*upgraded to premium" server.log
```

### 6.2 Logs do Webhook

```bash
# Logs do Stripe CLI
stripe logs tail

# Logs específicos
stripe logs tail --filter "checkout.session.completed"
```

## 7. Debugging

### 7.1 Problemas Comuns

**Erro: "Team ID is required"**
- Verifique se o header `x-team-id` está sendo enviado
- Confirme se o usuário está autenticado

**Erro: "Team is already on premium plan"**
- Team já tem tier premium
- Teste com outro team ou reset do tier

**Erro: "Webhook secret not configured"**
- Configure a variável `STRIPE_WEBHOOK_SECRET`
- Verifique se o webhook está configurado no Stripe

**Erro: "Invalid signature"**
- Verifique se o webhook secret está correto
- Confirme se o endpoint está recebendo o header correto

### 7.2 Verificações

```bash
# Verificar variáveis de ambiente
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
echo $NEXT_PUBLIC_APP_URL

# Verificar se o servidor está rodando
curl http://localhost:3001/api/health

# Verificar se o webhook está acessível
curl -X POST http://localhost:3001/api/billing/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 8. Testes Automatizados

### 8.1 Teste de Integração

```javascript
// test-stripe-integration.js
const axios = require('axios');

async function testStripeIntegration() {
  try {
    // Teste 1: Criar sessão de checkout
    const checkoutResponse = await axios.post(
      'http://localhost:3001/api/billing/create-checkout-session',
      { email: 'test@example.com' },
      {
        headers: {
          'x-team-id': 'YOUR_TEAM_ID',
          'Authorization': 'Bearer YOUR_TOKEN'
        }
      }
    );
    
    console.log('✅ Checkout session created:', checkoutResponse.data.sessionId);
    
    // Teste 2: Verificar status
    const statusResponse = await axios.get(
      'http://localhost:3001/api/billing/subscription-status',
      {
        headers: {
          'x-team-id': 'YOUR_TEAM_ID',
          'Authorization': 'Bearer YOUR_TOKEN'
        }
      }
    );
    
    console.log('✅ Subscription status:', statusResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testStripeIntegration();
```

### 8.2 Executar Teste

```bash
node test-stripe-integration.js
```

## 9. Monitoramento em Produção

### 9.1 Métricas Importantes

- Taxa de conversão de checkout
- Tempo de processamento de webhooks
- Erros de pagamento
- Cancelamentos de subscrição

### 9.2 Alertas

Configure alertas para:
- Falhas de webhook
- Erros de pagamento
- Downgrades inesperados
- Picos de erro

## 10. Rollback

### 10.1 Em Caso de Problemas

1. **Desabilitar checkout**
   - Comentar endpoint de checkout
   - Mostrar mensagem de manutenção

2. **Reverter mudanças**
   - Restaurar backup da base de dados
   - Reverter código para versão anterior

3. **Comunicar usuários**
   - Enviar email de notificação
   - Atualizar status page

### 10.2 Plano de Contingência

- Manter backup das configurações
- Documentar processo de rollback
- Ter contato de suporte do Stripe
- Monitorar logs em tempo real
