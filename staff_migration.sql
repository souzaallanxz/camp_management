-- Script de migração para adicionar tabela staff e modificar tabelas relacionadas
-- Execute este script na sua base de dados PostgreSQL

-- 1. Criar a nova tabela staff
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  camp_id UUID NOT NULL REFERENCES camps(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Modificar a tabela snackbar_balance para incluir staff_id
-- Primeiro, adicionar a coluna staff_id
ALTER TABLE snackbar_balance 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id);

-- Tornar registration_id opcional (já que agora pode ser staff_id)
-- Nota: Esta alteração pode falhar se houver dados existentes com NOT NULL
-- Se falhar, execute primeiro: UPDATE snackbar_balance SET registration_id = NULL WHERE registration_id IS NULL;

-- 3. Modificar a tabela snack_bar_transactions para incluir staff_id
-- Primeiro, adicionar a coluna staff_id
ALTER TABLE snack_bar_transactions 
ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id);

-- Tornar camper_id opcional (já que agora pode ser staff_id)
-- Nota: Esta alteração pode falhar se houver dados existentes com NOT NULL
-- Se falhar, execute primeiro: UPDATE snack_bar_transactions SET camper_id = NULL WHERE camper_id IS NULL;

-- 4. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_staff_camp_id ON staff(camp_id);
CREATE INDEX IF NOT EXISTS idx_snackbar_balance_staff_id ON snackbar_balance(staff_id);
CREATE INDEX IF NOT EXISTS idx_snack_bar_transactions_staff_id ON snack_bar_transactions(staff_id);

-- 5. Verificar se as alterações foram aplicadas corretamente
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('staff', 'snackbar_balance', 'snack_bar_transactions')
ORDER BY table_name, ordinal_position; 