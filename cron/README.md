# Cron Jobs

Esta pasta contém scripts de cron job para automatizar tarefas de manutenção do sistema.

## cleanPendingPayments.js

Este script atualiza pagamentos pendentes que expiraram (mais de 20 minutos) nas tabelas `payments` e `snackbar_balance`.

### Funcionalidade

- Atualiza registos com `payment_status = 'not confirmed'` para `payment_status = 'expired'`
- Aplica-se a registos criados há mais de 20 minutos
- Executa em ambas as tabelas: `payments` e `snackbar_balance`
- **Importante**: Os registos `expired` são mantidos para auditoria mas excluídos de todos os cálculos e lógicas de negócio

### Execução Local

```bash
# Executar manualmente
pnpm run cron:clean-payments

# Ou diretamente
node cron/cleanPendingPayments.js
```

### Execução via GitHub Actions

Para configurar no GitHub Actions, adicione ao workflow:

```yaml
- name: Run Clean Pending Payments
  run: |
    pnpm run cron:clean-payments
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Variáveis de Ambiente

- `DATABASE_URL`: String de conexão com a base de dados PostgreSQL

### Logs

O script produz logs detalhados:
- `🔍 Atualizando pagamentos pendentes...` - Início do processo
- `✅ X registos atualizados em [tabela]` - Sucesso por tabela
- `❌ Erro ao atualizar [tabela]: [erro]` - Erros encontrados 