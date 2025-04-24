-- Garantir que a extensão pgcrypto está instalada (necessária para gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Garantir que a coluna id tem DEFAULT gen_random_uuid()
ALTER TABLE public.users 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Remover colunas não utilizadas (verificando se existem primeiro)
DO $$
BEGIN
  -- Remover coluna username se existir
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'username') THEN
    ALTER TABLE public.users DROP COLUMN username;
  END IF;
  
  -- Remover coluna phone_number se existir
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_number') THEN
    ALTER TABLE public.users DROP COLUMN phone_number;
  END IF;
END
$$;

-- Adicionar coluna de token para redefinição de senha
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_reset_token') THEN
    ALTER TABLE public.users ADD COLUMN password_reset_token UUID;
  END IF;
  
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_reset_expires') THEN
    ALTER TABLE public.users ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;
  END IF;
END
$$;

-- Garantir que a coluna status tem o tipo correto
DO $$
BEGIN
  -- Verificar se o tipo user_status_type existe
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_type') THEN
    -- Criar o tipo se não existir
    CREATE TYPE user_status_type AS ENUM ('active', 'inactive', 'invited', 'suspended');
  END IF;
END
$$;

-- Verificar a estrutura da tabela após as alterações
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name = 'users'
-- ORDER BY ordinal_position; 