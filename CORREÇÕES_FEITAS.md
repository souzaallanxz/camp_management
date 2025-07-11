# Correções Feitas para Resolver Erro React #31

## Problema Identificado
O erro React #31 ocorre quando se tenta renderizar um objeto Promise diretamente no JSX. Isto acontece quando:
1. Uma função async é chamada sem await
2. Um hook retorna um Promise em vez de um valor
3. Há problemas de conectividade com o backend

## Correções Implementadas

### 1. Corrigido Importação Incorreta
**Arquivo:** `src/features/staff/components/data-table-toolbar.tsx`
- ❌ **Antes:** `import { type CamperWithActions } from './campers-table'`
- ✅ **Depois:** `import { type StaffWithActions } from './staff-table'`

### 2. Corrigido Chamada da API
**Arquivo:** `src/features/staff/components/staff-snackbar-balance-dialog.tsx`
- ❌ **Antes:** Chamada direta para `/api/staff-snackbar-balance`
- ✅ **Depois:** Usa `buildApiUrl()` e `getTeamIdHeader()`

### 3. Adicionado Loading States
**Arquivo:** `src/features/staff/index.tsx`
- ✅ Adicionado loading state para evitar renderização prematura
- ✅ Melhorado tratamento de erros

### 4. Criado Scripts de Debug
- ✅ `debug-backend.js` - Para testar endpoints do backend
- ✅ `debug-frontend.js` - Para testar frontend no browser
- ✅ `DEBUG_GUIDE.md` - Guia completo de debug

## Possíveis Causas do Erro

### A. Backend Não Disponível
- O backend pode não estar a funcionar em produção
- Verificar se o endpoint `/api/staff` existe e está acessível

### B. Problemas de Autenticação
- Token pode estar inválido ou expirado
- Team ID pode estar em falta

### C. Problemas de Rede
- CORS issues
- Problemas de conectividade com a API

## Como Testar

### 1. Testar Backend
```bash
# Iniciar backend localmente
node server.ts

# Testar endpoints
node debug-backend.js
```

### 2. Testar Frontend
```bash
# Iniciar frontend
npm run dev

# No browser console, executar:
# (conteúdo de debug-frontend.js)
```

### 3. Verificar Logs
- Abrir DevTools no browser
- Verificar aba Console para erros
- Verificar aba Network para falhas de API

## Próximos Passos

1. **Testar Backend:** Execute `node debug-backend.js` para verificar se o backend está a funcionar
2. **Testar Frontend:** Execute o script de debug no browser console
3. **Verificar Logs:** Analise os logs para identificar o problema específico
4. **Corrigir Problema:** Com base nos logs, aplique a correção necessária

## Endpoints Críticos para Verificar

- `GET /api/health` - Health check
- `GET /api/auth/me` - Autenticação do usuário
- `GET /api/teams/current` - Dados da equipa
- `GET /api/staff` - Lista de staff

## Variáveis de Ambiente Necessárias

```env
VITE_API_URL=http://localhost:3001/api
DATABASE_URL=your_database_url
```

Se o problema persistir, partilha os logs do console para análise mais detalhada. 