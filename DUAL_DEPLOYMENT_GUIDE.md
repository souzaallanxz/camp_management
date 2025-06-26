# 🚀 Deployment Dual - Frontend (Vercel) + Backend (Render)

## ✅ **Configuração Final Implementada**

### 🎯 **Estratégia:**
- **Frontend**: Vercel (apenas código React/Vite)
- **Backend**: Render (servidor Express/TypeScript)
- **Mesmo repositório**: Configurado para ambos simultaneamente

### 📦 **Package.json Configurado:**

```json
{
  "scripts": {
    "dev": "vite",                    // Desenvolvimento frontend apenas
    "dev:full": "concurrently \"vite\" \"tsx server.ts\"", // Frontend + Backend local
    "server": "tsx server.ts",       // Backend apenas
    "build": "vite build",           // Build do frontend (Vercel)
    "start": "tsx server.ts",        // Start do backend (Render)
    "start:frontend": "vite preview"  // Preview do frontend
  }
}
```

### 🔧 **Vercel Configuration:**

**vercel.json:**
```json
{
  "buildCommand": "pnpm run build",
  "devCommand": "pnpm run dev", 
  "installCommand": "pnpm install",
  "framework": "vite",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**.vercelignore:**
```
# Backend files - não incluir no deployment do frontend
server.ts
api/
backend/
scripts/
render.yaml
tsconfig.api.json
RENDER_DEPLOYMENT.md
*.sql
migrate.ts
```

### 🔧 **Render Configuration:**

**render.yaml:**
```yaml
services:
  - type: web
    name: camp-management-backend
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm run start
    healthCheckPath: /api/health
```

### 🌐 **URLs de Produção:**

- **Frontend (Vercel)**: `https://campmanagement-[hash]-[user].vercel.app`
- **Backend (Render)**: `https://camp-management-1.onrender.com/api`

### 📱 **Como Funciona:**

1. **Desenvolvimento Local:**
   ```bash
   pnpm run dev:full  # Frontend + Backend
   # ou separadamente:
   pnpm run dev       # Apenas frontend
   pnpm run server    # Apenas backend
   ```

2. **Deploy Frontend (Vercel):**
   ```bash
   git push origin main  # Auto-deploy
   # ou manual:
   vercel --prod
   ```

3. **Deploy Backend (Render):**
   ```bash
   git push origin main  # Auto-deploy via GitHub
   ```

### 🔄 **Dependências Compartilhadas:**

O `package.json` contém dependências para ambos:
- **Frontend**: React, Vite, TailwindCSS, etc.
- **Backend**: Express, CORS, dotenv, tsx, etc.
- **Vercel ignora**: Arquivos do backend via `.vercelignore`
- **Render usa**: Apenas o que precisa para o servidor

### ✅ **Deploy Commands:**

```bash
# 1. Commit mudanças
git add .
git commit -m "Configure dual deployment: Vercel frontend + Render backend"
git push origin main

# 2. Deploy frontend (Vercel)
vercel --prod

# 3. Backend auto-deploys no Render via GitHub
```

### 🔍 **Verificação:**

1. **Frontend**: Acesse URL do Vercel
2. **Backend**: `curl https://camp-management-1.onrender.com/api/health`
3. **Integração**: Verifique Network tab no frontend para confirmar requests para Render

### 🚨 **Troubleshooting:**

- **Vercel build fail**: Check se `.vercelignore` está correto
- **Render start fail**: Verifique se dependências do backend estão em `dependencies`
- **CORS errors**: Confirme URL do frontend está no CORS do backend
- **404 errors**: Verifique se API URLs estão corretas

---

**🎉 Configuração Completa para Deployment Dual!** 