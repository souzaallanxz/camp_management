# 🚀 Deploy do Backend no Render

Este guia te ajudará a fazer o deploy do backend Express/TypeScript no Render.

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com)
2. Projeto no GitHub
3. Variáveis de ambiente configuradas

## 🔧 Configurações do Render

### Web Service Settings:

| Campo | Valor |
|-------|-------|
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm run start` |
| **Node Version** | `20.15.1` (via .node-version) |
| **Health Check Path** | `/api/health` |

### Variáveis de Ambiente Necessárias:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
RESEND_API_KEY=your_resend_api_key
VITE_RESEND_API_KEY=your_resend_api_key  
VITE_TOKEN_SECRET=your_jwt_secret
VITE_IFTHENPAY_MBWAY_KEY=your_mbway_key
VITE_MBWAY_KEY=your_mbway_key
HOOKDECK_API_KEY=your_hookdeck_key
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
```

## 🚀 Passos para Deploy

### 1. Preparar Repositório
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Criar Web Service no Render
1. Acesse [Render Dashboard](https://dashboard.render.com)
2. Clique em **"New" > "Web Service"**
3. Conecte seu repositório GitHub
4. Configure as settings acima

### 3. Configurar Variáveis de Ambiente
1. Na aba **"Environment"** do seu service
2. Adicione todas as variáveis listadas acima
3. Clique em **"Save Changes"**

### 4. Deploy
O deploy iniciará automaticamente. Você pode acompanhar os logs na aba **"Logs"**.

## 🔍 Verificação

Após o deploy, teste os seguintes endpoints:

- **Health Check**: `https://your-app.onrender.com/api/health`
- **Auth**: `https://your-app.onrender.com/api/auth/sign-in`

## ⚠️ Notas Importantes

1. **Free Tier**: O serviço gratuito "dorme" após 15 minutos de inatividade
2. **Cold Start**: Primeiro request pode demorar ~30 segundos
3. **Database**: Use a string de conexão completa do Neon
4. **CORS**: O backend já está configurado para aceitar requests do frontend

## 🐛 Troubleshooting

### Build Fails
- Verifique se `pnpm` está instalado
- Confirme que `tsconfig.api.json` está correto
- Check build logs para erros específicos

### Runtime Errors
- Verifique variáveis de ambiente
- Confirme conexão com database
- Check logs em tempo real

### Connection Issues
- Confirme CORS settings
- Verifique URL do frontend no `api-config.ts`
- Test health endpoint primeiro

## 📱 Atualizações

Para atualizações futuras:
1. Push para branch main
2. Render fará redeploy automaticamente
3. Zero downtime deployment

---

✅ **Pronto!** Seu backend está rodando no Render! 