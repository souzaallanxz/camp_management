# Guia de Debug - Erro React #31

## Problema
O erro React #31 indica que estás a tentar renderizar um objeto Promise diretamente no JSX. Isto acontece quando uma função async é chamada sem await ou quando um hook retorna um Promise em vez de um valor.

## Passos para Debug

### 1. Testar Backend Localmente

```bash
# Instalar dependências se necessário
npm install

# Iniciar o backend
node server.ts
```

Depois execute o script de teste:
```bash
node debug-backend.js
```

### 2. Testar Frontend Localmente

1. Abre o browser e vai para `http://localhost:5173`
2. Abre o DevTools (F12)
3. Vai para a aba Console
4. Copia e cola o conteúdo de `debug-frontend.js`

### 3. Verificar Logs

Os logs de debug foram adicionados ao componente Staff. Verifica o console do browser para ver:

- Se as permissões estão a carregar corretamente
- Se a query do staff está a funcionar
- Se há erros nas chamadas da API

### 4. Possíveis Causas

#### A. Hook `useTeamPermissions` retornando Promise
O hook pode estar a retornar um Promise em vez de um objeto. Verifica:
- `src/features/teams/hooks/use-team-permissions.ts`
- `src/features/teams/hooks/use-current-team.ts`
- `src/features/teams/context/team-context.tsx`

#### B. Hook `useUser` retornando Promise
Verifica:
- `src/features/auth/hooks/use-user.ts`
- `src/features/auth/auth-context.tsx`
- `src/features/auth/auth-service.ts`

#### C. Query do React Query com erro
A query pode estar a falhar e retornar um Promise. Verifica:
- Se o backend está a funcionar
- Se as credenciais estão corretas
- Se o endpoint `/api/staff` existe

### 5. Soluções

#### Solução 1: Adicionar Loading States
```tsx
if (permissions.isLoading) {
  return <div>Carregando...</div>
}
```

#### Solução 2: Verificar se os dados são Promises
```tsx
// Em vez de
{permissions.staff?.create}

// Usar
{permissions.staff?.create && !permissions.isLoading}
```

#### Solução 3: Verificar se o backend está a funcionar
```bash
curl -X GET http://localhost:3001/api/health
```

### 6. Debug em Produção

Para debug em produção:

1. Vai para a página staff
2. Abre o DevTools
3. Vai para a aba Network
4. Recarrega a página
5. Verifica se há erros 500 nas chamadas da API

### 7. Verificar Variáveis de Ambiente

Certifica-te de que as variáveis de ambiente estão corretas:

```env
VITE_API_URL=http://localhost:3001/api
DATABASE_URL=your_database_url
```

### 8. Testar Endpoints Individualmente

Testa cada endpoint individualmente:

```bash
# Health check
curl http://localhost:3001/api/health

# Auth (com token válido)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/auth/me

# Teams (com token válido)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/teams/current

# Staff (com token e team-id válidos)
curl -H "Authorization: Bearer YOUR_TOKEN" -H "x-team-id: YOUR_TEAM_ID" http://localhost:3001/api/staff
```

## Próximos Passos

1. Execute os scripts de debug
2. Verifica os logs no console
3. Identifica qual componente está a retornar um Promise
4. Corrige o problema específico
5. Testa novamente

Se precisares de mais ajuda, partilha os logs do console para que eu possa ajudar melhor. 