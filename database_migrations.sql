-- Script para adicionar coluna request_id na tabela snackbar_balance
ALTER TABLE snackbar_balance ADD COLUMN request_id VARCHAR(255);

-- Script para adicionar coluna payment_status na tabela snackbar_balance
-- Valor padrão para novos registos: 'not confirmed'
-- Registos existentes serão atualizados para 'confirmed'
ALTER TABLE snackbar_balance ADD COLUMN payment_status VARCHAR(50) DEFAULT 'not confirmed';

-- Atualizar registos existentes para terem payment_status = 'confirmed'
UPDATE snackbar_balance SET payment_status = 'confirmed' WHERE payment_status IS NULL; 