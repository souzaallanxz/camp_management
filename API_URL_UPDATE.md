# 🔗 Atualizando URLs da API após Deployment

## 📍 URL Atual Configurada

O frontend está configurado para usar:
- **Desenvolvimento**: `http://localhost:3001/api`
- **Produção**: `https://camp-management-1.onrender.com/api`

## 🔧 Como Atualizar para Sua URL Real

### 1. Encontre sua URL no Render
1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique no seu web service
3. Copie a URL (ex: `https://seu-app-nome.onrender.com`)

### 2. Atualize os Arquivos

**Opção A: Atualização Manual (Mais Fácil)**

✅ **CONCLUÍDO**: Todas as configurações já foram atualizadas para usar `https://camp-management-1.onrender.com`

- `src/lib/api-config.ts` (linha 8)
- `src/services/api.ts` (linha 5)
- `src/features/campers/services/camper-service.ts` (linha 4)
- `src/features/payments/services/payment-service.ts` (linha 4)
- `src/features/dashboard/services/dashboard-service.ts` (linha 4)
- `src/features/users/services/user-service.ts` (linha 3)
- `src/services/auth.service.ts` (linha 7)
- `src/services/email.service.ts` (linha 22)
- `src/config/api.ts` (linhas 5 e 11)

**Opção B: Usando Variável de Ambiente**

1. Crie arquivo `.env.production`:
```env
VITE_API_URL=https://sua-url-real.onrender.com/api
```

2. No Vercel/Netlify, adicione a variável de ambiente:
   - Nome: `VITE_API_URL`
   - Valor: `https://sua-url-real.onrender.com/api`

### 3. Teste a Conexão

```bash
# Test health endpoint
curl https://sua-url-real.onrender.com/api/health

# Deve retornar:
{
  "status": "healthy",
  "timestamp": "2025-06-26T15:51:48.462Z",
  "environment": "production"
}
```

### 4. Deploy do Frontend

```bash
git add .
git commit -m "Update API URLs for production"
git push origin main
```

## ✅ Verificação

Após atualizar e fazer deploy:

1. **Abra as DevTools** no navegador
2. **Vá para Network tab**
3. **Faça login** na aplicação
4. **Verifique se as requests** vão para sua URL do Render

## 🚨 Problemas Comuns

### CORS Error
Se aparecer erro de CORS, verifique:
- URL está correta (sem `/` extra no final)
- Backend está rodando no Render
- CORS está configurado no `server.ts` para aceitar sua URL do frontend

### 404 Not Found
- Confirme que o backend está respondendo em `/api/health`
- Verifique se não há `/api/api` duplicado na URL

### SSL Certificate Error
- Use `https://` para URLs do Render
- Aguarde alguns minutos se o certificado SSL ainda estiver sendo gerado

---

**💡 Dica**: Mantenha este arquivo atualizado com sua URL final para referência futura! 