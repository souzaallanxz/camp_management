-- Script para alterar a coluna contact da tabela campers para permitir valores NULL
-- Execute este script na sua base de dados para aplicar a mudança

-- Alterar a coluna contact para permitir NULL
ALTER TABLE campers ALTER COLUMN contact DROP NOT NULL;

-- Verificar se a alteração foi aplicada corretamente
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'campers' AND column_name = 'contact'; 