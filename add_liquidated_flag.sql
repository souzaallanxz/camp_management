-- Script para adicionar coluna is_liquidated na tabela snack_bar_transactions
-- Execute este script na sua base de dados PostgreSQL

-- 1. Adicionar a coluna is_liquidated com valor padrão false
ALTER TABLE snack_bar_transactions 
ADD COLUMN IF NOT EXISTS is_liquidated BOOLEAN NOT NULL DEFAULT false;

-- 2. Atualizar todos os registos existentes para ter is_liquidated = false
UPDATE snack_bar_transactions 
SET is_liquidated = false 
WHERE is_liquidated IS NULL;

-- 3. Criar índice para melhor performance em consultas por is_liquidated
CREATE INDEX IF NOT EXISTS idx_snack_bar_transactions_is_liquidated 
ON snack_bar_transactions(is_liquidated);

-- 4. Verificar se a alteração foi aplicada corretamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'snack_bar_transactions' 
  AND column_name = 'is_liquidated';

-- 5. Verificar quantos registos existem
SELECT 
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN is_liquidated = true THEN 1 END) as liquidated_transactions,
  COUNT(CASE WHEN is_liquidated = false THEN 1 END) as non_liquidated_transactions
FROM snack_bar_transactions; 