# Exemplo de Integração com Webhooks

Este exemplo mostra como integrar uma plataforma externa com o sistema de webhooks.

## Cenário: Formulário de Inscrição Online

Imagine que você tem um formulário de inscrição em sua plataforma e quer que os dados sejam automaticamente enviados para o sistema de gestão.

### 1. Configuração Inicial

Primeiro, ative o webhook para registrations na página de integrações:

```typescript
// No frontend do sistema de gestão
const config = await webhookService.enableWebhook('registrations')
console.log('URL para usar:', config.registrationWebhookUrl)
// Resultado: https://hkdk.events/abc123def456
```

### 2. Implementação no Formulário

#### HTML do Formulário
```html
<form id="inscricao-form">
  <input type="text" name="name" placeholder="Nome completo" required>
  <input type="email" name="email" placeholder="Email" required>
  <input type="tel" name="contact" placeholder="Telefone" required>
  <input type="date" name="date_of_birth" placeholder="Data de nascimento">
  <input type="text" name="id_number" placeholder="Número de identificação">
  <textarea name="dietary_restrictions" placeholder="Restrições alimentares"></textarea>
  
  <!-- Dados do responsável (para menores) -->
  <input type="text" name="guardian_name" placeholder="Nome do responsável">
  <input type="email" name="guardian_email" placeholder="Email do responsável">
  <input type="tel" name="guardian_phone" placeholder="Telefone do responsável">
  
  <button type="submit">Inscrever</button>
</form>
```

#### JavaScript para Envio
```javascript
document.getElementById('inscricao-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  
  const formData = new FormData(e.target)
  const data = Object.fromEntries(formData.entries())
  
  // URL obtida da configuração do webhook
  const webhookUrl = 'https://hkdk.events/abc123def456'
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        contact: data.contact,
        form_id: 'formulario-inscricao-2024',
        date_of_birth: data.date_of_birth,
        id_number: data.id_number,
        dietary_restrictions: data.dietary_restrictions,
        guardian_name: data.guardian_name,
        guardian_email: data.guardian_email,
        guardian_phone: data.guardian_phone,
        status: 'unpaid' // Inicialmente não pago
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('Inscrição criada:', result.registration.id)
      alert('Inscrição realizada com sucesso!')
    } else {
      const error = await response.json()
      console.error('Erro:', error)
      alert('Erro ao processar inscrição: ' + error.error)
    }
  } catch (error) {
    console.error('Erro de rede:', error)
    alert('Erro de conexão. Tente novamente.')
  }
})
```

### 3. Integração com Sistema de Pagamento

Quando um pagamento for processado, envie os dados para o webhook de pagamentos:

```javascript
// Exemplo com Stripe webhook
app.post('/stripe-webhook', async (req, res) => {
  const event = req.body
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object
    const customerEmail = paymentIntent.receipt_email
    const amount = paymentIntent.amount / 100 // Stripe usa centavos
    
    // URL do webhook de pagamentos
    const paymentWebhookUrl = 'https://hkdk.events/xyz789abc123'
    
    try {
      await fetch(paymentWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          amount: amount,
          status: 'paid',
          payment_id: paymentIntent.id
        })
      })
      
      console.log('Pagamento processado para:', customerEmail)
    } catch (error) {
      console.error('Erro ao notificar pagamento:', error)
    }
  }
  
  res.json({ received: true })
})
```

### 4. Exemplo com WordPress + Contact Form 7

```php
// functions.php do WordPress
add_action('wpcf7_mail_sent', 'enviar_para_webhook');

function enviar_para_webhook($contact_form) {
    $submission = WPCF7_Submission::get_instance();
    $posted_data = $submission->get_posted_data();
    
    // URL do webhook
    $webhook_url = 'https://hkdk.events/abc123def456';
    
    $data = array(
        'name' => $posted_data['your-name'],
        'email' => $posted_data['your-email'],
        'contact' => $posted_data['your-phone'],
        'form_id' => 'contact-form-7-' . $contact_form->id(),
        'date_of_birth' => $posted_data['birth-date'],
        'dietary_restrictions' => $posted_data['dietary-restrictions']
    );
    
    wp_remote_post($webhook_url, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode($data),
        'timeout' => 30
    ));
}
```

### 5. Exemplo com Google Forms (via Google Apps Script)

```javascript
function onFormSubmit(e) {
  const responses = e.namedValues;
  
  const data = {
    name: responses['Nome completo'][0],
    email: responses['Email'][0],
    contact: responses['Telefone'][0],
    form_id: 'google-form-inscricoes',
    date_of_birth: responses['Data de nascimento'][0],
    dietary_restrictions: responses['Restrições alimentares'][0]
  };
  
  const webhookUrl = 'https://hkdk.events/abc123def456';
  
  UrlFetchApp.fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(data)
  });
}
```

### 6. Monitoramento e Debug

Para verificar se os webhooks estão funcionando:

1. **Dashboard do Hookdeck**: Acesse para ver logs em tempo real
2. **Logs do Sistema**: Verifique os logs da API para erros
3. **Teste Manual**: Use curl ou Postman para testar

```bash
# Teste manual
curl -X POST https://hkdk.events/abc123def456 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste Silva",
    "email": "teste@email.com",
    "contact": "+351912345678"
  }'
```

### 7. Tratamento de Erros

```javascript
async function enviarInscricao(dados) {
  const maxTentativas = 3;
  let tentativa = 0;
  
  while (tentativa < maxTentativas) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      tentativa++;
      console.log(`Tentativa ${tentativa} falhou:`, error.message);
      
      if (tentativa < maxTentativas) {
        // Aguardar antes de tentar novamente (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, tentativa) * 1000));
      } else {
        throw error;
      }
    }
  }
}
```

## Boas Práticas

1. **Validação**: Sempre valide os dados antes de enviar
2. **Retry Logic**: Implemente tentativas em caso de falha
3. **Logs**: Mantenha logs detalhados para debug
4. **Timeout**: Configure timeouts apropriados
5. **Segurança**: Use HTTPS sempre
6. **Rate Limiting**: Respeite limites de taxa se aplicável

## Campos Recomendados

Para uma integração completa, inclua sempre:

**Obrigatórios**:
- `name`: Nome completo
- `email`: Email válido
- `contact`: Telefone com código do país

**Recomendados**:
- `form_id`: Identificador único do formulário
- `date_of_birth`: Para verificação de idade
- `id_number`: Para identificação oficial
- `guardian_*`: Para menores de idade

**Opcionais**:
- `camp_id`: Se associado a um camp específico
- `dietary_restrictions`: Para planejamento de refeições
- `status`: Status inicial (padrão: 'unpaid') 