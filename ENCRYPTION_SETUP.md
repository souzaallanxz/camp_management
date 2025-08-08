# 🔐 Encriptação das Chaves MBWay

Este documento explica como configurar a encriptação das chaves MBWay na base de dados.

## 📋 Pré-requisitos

1. **Variável de Ambiente**: Configurar `ENCRYPTION_KEY`
2. **Base de Dados**: Tabela `mbway_integrations` criada
3. **Backend**: Código atualizado com funções de encriptação

## 🔧 Configuração

### 1. Configurar ENCRYPTION_KEY

Adicione a variável de ambiente `ENCRYPTION_KEY` no seu ambiente:

#### Desenvolvimento (.env)
```bash
ENCRYPTION_KEY=your-super-secure-encryption-key-here
```

#### Produção (Render)
```bash
ENCRYPTION_KEY=your-super-secure-encryption-key-here
```

**⚠️ Importante**: 
- Use uma chave forte (mínimo 32 caracteres)
- Nunca partilhe ou commite esta chave
- Mantenha a mesma chave em todos os ambientes

### 2. Executar Migração de Encriptação

Se já existem chaves MBWay na base de dados, execute o script de migração:

```bash
pnpm run encrypt-mbway-keys
```

Este script irá:
- ✅ Encriptar todas as chaves existentes
- ✅ Pular chaves já encriptadas
- ✅ Mostrar um relatório detalhado

### 3. Verificar Configuração

Após a migração, teste a configuração:

1. **Aceder** às definições → Integrações
2. **Configurar** uma chave MBWay
3. **Testar** a conexão
4. **Verificar** se funciona corretamente

## 🔒 Como Funciona

### Encriptação
```typescript
// Chave original: "sk_test_123456"
// Chave encriptada: "a1b2c3d4:encrypted_data_here"
```

### Desencriptação
```typescript
// Chave encriptada: "a1b2c3d4:encrypted_data_here"
// Chave original: "sk_test_123456"
```

### Algoritmo
- **Método**: AES-256-CBC
- **IV**: Gerado aleatoriamente para cada encriptação
- **Formato**: `iv:encrypted_data`

## 🛡️ Segurança

### Benefícios
- ✅ **Chaves encriptadas** na base de dados
- ✅ **Isolamento por equipa** mantido
- ✅ **IV único** para cada encriptação
- ✅ **Algoritmo forte** (AES-256)

### Boas Práticas
- 🔐 **Chave forte** (32+ caracteres)
- 🔄 **Backup** da chave de encriptação
- 🚫 **Nunca partilhar** a chave
- 📝 **Documentar** a configuração

## 🚨 Troubleshooting

### Erro: "ENCRYPTION_KEY not set"
```bash
# Solução: Configurar a variável de ambiente
ENCRYPTION_KEY=your-key-here
```

### Erro: "Error decrypting integration data"
```bash
# Possível causa: Chave de encriptação diferente
# Solução: Verificar se ENCRYPTION_KEY está correto
```

### Chaves não encriptadas
```bash
# Executar migração
pnpm run encrypt-mbway-keys
```

## 📊 Monitorização

### Logs a Verificar
- ✅ "Encrypted key for team X"
- ✅ "Successfully encrypted: X keys"
- ❌ "Error decrypting mbway_key"

### Métricas
- **Chaves encriptadas**: Contador no script
- **Erros de desencriptação**: Logs do servidor
- **Testes de conexão**: Endpoint `/api/integrations/mbway/test`

## 🔄 Migração de Produção

### Passos
1. **Configurar** `ENCRYPTION_KEY` em produção
2. **Deploy** do código atualizado
3. **Executar** script de migração
4. **Testar** funcionalidade
5. **Monitorizar** logs

### Rollback
Se necessário, pode reverter para chaves não encriptadas:
1. **Comentar** funções de encriptação
2. **Deploy** versão anterior
3. **Restaurar** chaves originais

## 📞 Suporte

Para questões sobre encriptação:
1. **Verificar** logs do servidor
2. **Confirmar** `ENCRYPTION_KEY` configurada
3. **Testar** com chave conhecida
4. **Contactar** equipa de desenvolvimento 