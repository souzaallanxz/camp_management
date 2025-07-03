import crypto from 'crypto';

// Payload real do webhook que recebemos
const realPayload = {
  "meta": {
    "test_mode": true,
    "event_name": "subscription_created",
    "custom_data": {
      "teamId": "e4333e4d-c348-4a8e-bf74-09a32194d6d5",
      "planType": "premium",
      "timestamp": "2025-07-03T14:38:46.307Z"
    },
    "webhook_id": "test-webhook-id"
  },
  "data": {
    "id": "test-subscription-id",
    "type": "subscriptions",
    "attributes": {
      "status": "active",
      "variant_id": "883664"
    }
  }
};

// Assinatura que recebemos
const receivedSignature = "a96de36c1478ad4ec6f54ef9067b6e34f835d2ad6226fbd28a9a16afb1f1bb30";

// Signing key configurada
const secret = "dany%&$e&2kPms";

console.log('🔐 TESTING LEMON SQUEEZY SIGNATURE');
console.log('Secret:', secret);
console.log('Received signature:', receivedSignature);
console.log('');

// Método 1: JSON.stringify normal
const payload1 = JSON.stringify(realPayload);
const signature1 = crypto.createHmac('sha256', secret).update(payload1).digest('hex');
console.log('Method 1 (JSON.stringify):');
console.log('  Payload length:', payload1.length);
console.log('  Payload preview:', payload1.substring(0, 100) + '...');
console.log('  Signature:', signature1);
console.log('  Matches:', signature1 === receivedSignature);
console.log('');

// Método 2: JSON.stringify sem espaços
const payload2 = JSON.stringify(realPayload).replace(/\s+/g, '');
const signature2 = crypto.createHmac('sha256', secret).update(payload2).digest('hex');
console.log('Method 2 (no spaces):');
console.log('  Payload length:', payload2.length);
console.log('  Payload preview:', payload2.substring(0, 100) + '...');
console.log('  Signature:', signature2);
console.log('  Matches:', signature2 === receivedSignature);
console.log('');

// Método 3: JSON.stringify com null, 0 (sem formatação)
const payload3 = JSON.stringify(realPayload, null, 0);
const signature3 = crypto.createHmac('sha256', secret).update(payload3).digest('hex');
console.log('Method 3 (no formatting):');
console.log('  Payload length:', payload3.length);
console.log('  Payload preview:', payload3.substring(0, 100) + '...');
console.log('  Signature:', signature3);
console.log('  Matches:', signature3 === receivedSignature);
console.log('');

// Método 4: Tentar com diferentes encodings
const payload4 = Buffer.from(JSON.stringify(realPayload), 'utf8');
const signature4 = crypto.createHmac('sha256', secret).update(payload4).digest('hex');
console.log('Method 4 (Buffer UTF8):');
console.log('  Payload length:', payload4.length);
console.log('  Signature:', signature4);
console.log('  Matches:', signature4 === receivedSignature);
console.log('');

// Método 5: Tentar com o corpo como string pura
const payload5 = JSON.stringify(realPayload, null, 2);
const signature5 = crypto.createHmac('sha256', secret).update(payload5).digest('hex');
console.log('Method 5 (pretty print):');
console.log('  Payload length:', payload5.length);
console.log('  Payload preview:', payload5.substring(0, 100) + '...');
console.log('  Signature:', signature5);
console.log('  Matches:', signature5 === receivedSignature);
console.log('');

// Verificar se algum método funcionou
const allSignatures = [signature1, signature2, signature3, signature4, signature5];
const workingMethods = allSignatures.filter(sig => sig === receivedSignature);

if (workingMethods.length > 0) {
  console.log('✅ FOUND WORKING METHOD!');
  console.log('Working signatures:', workingMethods);
} else {
  console.log('❌ NO METHOD WORKED');
  console.log('');
  console.log('Possible issues:');
  console.log('1. The signing key in Lemon Squeezy is different');
  console.log('2. The payload structure is different');
  console.log('3. Lemon Squeezy uses a different hashing method');
  console.log('4. The payload has additional fields we\'re missing');
} 