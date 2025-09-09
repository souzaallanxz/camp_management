# Configuração do Stripe para Pagamentos de Subscrição

Este documento explica como configurar o Stripe para processar pagamentos de subscrição na aplicação.

## 1. Configuração das Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # ou sk_live_... para produção
STRIPE_PUBLISHABLE_KEY=pk_test_... # ou pk_live_... para produção
STRIPE_WEBHOOK_SECRET=whsec_... # Secret do webhook endpoint

# Frontend URL (para redirects)
NEXT_PUBLIC_APP_URL=http://localhost:5173 # ou https://seu-dominio.com para produção
```

## 2. Configuração no Dashboard do Stripe

### 2.1 Criar Produto e Preço

1. Acesse o [Dashboard do Stripe](https://dashboard.stripe.com)
2. Vá para **Products** > **Add product**
3. Configure o produto:
   - **Name**: "Plano Premium - Camp Management"
   - **Description**: "Acesso completo a todas as funcionalidades premium"
4. Configure o preço:
   - **Pricing model**: Standard pricing
   - **Price**: €19.00
   - **Billing period**: Monthly
   - **Currency**: EUR

### 2.2 Configurar Webhook

1. Vá para **Developers** > **Webhooks**
2. Clique em **Add endpoint**
3. Configure o endpoint:
   - **Endpoint URL**: `https://seu-dominio.com/api/billing/webhook`
   - **Events to send**: Selecione os seguintes eventos:
     - `checkout.session.completed`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
4. Copie o **Signing secret** e adicione à variável `STRIPE_WEBHOOK_SECRET`

## 3. Fluxo de Pagamento

### 3.1 Processo de Upgrade

1. **Usuário clica em "Fazer Upgrade"**
   - Frontend chama `/api/billing/create-checkout-session`
   - Backend cria sessão de checkout no Stripe
   - Retorna URL do checkout

2. **Usuário é redirecionado para o Stripe**
   - Abre em nova aba/popup
   - Preenche dados de pagamento
   - Confirma pagamento

3. **Stripe processa pagamento**
   - Cria subscrição
   - Envia webhook `checkout.session.completed`

4. **Backend processa webhook**
   - Atualiza `tier` do team para `premium`
   - Log da operação

5. **Usuário retorna à aplicação**
   - URL de sucesso com parâmetros
   - Frontend mostra mensagem de sucesso
   - Atualiza dados do team

### 3.2 Processo de Cancelamento

1. **Usuário cancela subscrição no Stripe**
2. **Stripe envia webhook `customer.subscription.deleted`**
3. **Backend processa webhook**
   - Atualiza `tier` do team para `free`
   - Log da operação

## 4. Endpoints da API

### 4.1 Criar Sessão de Checkout

```http
POST /api/billing/create-checkout-session
Content-Type: application/json
x-team-id: {team_id}
Authorization: Bearer {token}

{
  "email": "user@example.com" // opcional
}
```

**Resposta:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### 4.2 Webhook do Stripe

```http
POST /api/billing/webhook
Content-Type: application/json
stripe-signature: {signature}

{webhook_payload}
```

### 4.3 Status da Subscrição

```http
GET /api/billing/subscription-status
x-team-id: {team_id}
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "tier": "premium",
  "isPremium": true,
  "lastUpdated": "2024-01-01T00:00:00Z"
}
```

## 5. Testes

### 5.1 Cartões de Teste

Use os seguintes cartões para testar:

- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### 5.2 Testando Webhooks

1. Use o [Stripe CLI](https://stripe.com/docs/stripe-cli) para testar webhooks localmente:
```bash
stripe listen --forward-to localhost:3001/api/billing/webhook
```

2. Ou use o [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks) para testar eventos

## 6. Monitoramento

### 6.1 Logs

O sistema registra as seguintes operações:
- Criação de sessões de checkout
- Processamento de webhooks
- Atualizações de tier
- Erros de pagamento

### 6.2 Dashboard do Stripe

Monitore:
- **Payments**: Pagamentos processados
- **Customers**: Clientes criados
- **Subscriptions**: Subscrições ativas
- **Webhooks**: Eventos processados

## 7. Segurança

### 7.1 Validação de Webhooks

- Sempre valide a assinatura do webhook
- Use HTTPS em produção
- Mantenha o webhook secret seguro

### 7.2 Dados Sensíveis

- Nunca exponha chaves secretas no frontend
- Use variáveis de ambiente para configuração
- Criptografe dados sensíveis se necessário

## 8. Troubleshooting

### 8.1 Problemas Comuns

**Webhook não funciona:**
- Verifique se o endpoint está acessível
- Confirme se a assinatura está correta
- Verifique os logs do servidor

**Pagamento não atualiza tier:**
- Verifique se o webhook está configurado
- Confirme se o team_id está no metadata
- Verifique os logs do webhook

**Erro de CORS:**
- Adicione o domínio do Stripe às origens permitidas
- Verifique a configuração do CORS no servidor

### 8.2 Logs Úteis

```bash
# Logs do servidor
tail -f server.log | grep -i stripe

# Logs do webhook
tail -f webhook.log | grep -i "checkout.session.completed"
```

## 9. Produção

### 9.1 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] Webhook endpoint configurado
- [ ] Chaves de produção (não teste)
- [ ] HTTPS habilitado
- [ ] Logs configurados
- [ ] Monitoramento ativo

### 9.2 Backup

- Configure backup da base de dados
- Mantenha logs de auditoria
- Documente configurações

## 10. Suporte

Para problemas relacionados ao Stripe:
- [Documentação do Stripe](https://stripe.com/docs)
- [Suporte do Stripe](https://support.stripe.com)
- [Status do Stripe](https://status.stripe.com)
