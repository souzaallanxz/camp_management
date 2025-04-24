/**
 * Serviço para gerenciar operações relacionadas à autenticação
 * Este serviço conecta-se ao banco de dados Neon para operações de usuário
 */

import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { env } from '@/env';

// Interface para representar um usuário
interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

// Conexão com o banco de dados Neon
const sql = neon(env.VITE_NEON_DB_URL);

// Função para hash de senha com bcrypt
const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const authService = {
  /**
   * Busca um usuário pelo email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
      if (users.length === 0) return null;
      
      // Converter o resultado SQL para o tipo User
      const user = users[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name || '',
        password_hash: user.password_hash
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao buscar usuário por email:', error);
      return null;
    }
  },
  
  /**
   * Atualiza a senha de um usuário ou cria um novo usuário se não existir
   */
  async resetPassword(email: string, newPassword: string): Promise<boolean> {
    try {
      // Hash da nova senha
      const passwordHash = await hashPassword(newPassword);
      
      // Verificar se o usuário existe
      const existingUser = await this.findUserByEmail(email);
      
      if (!existingUser) {
        // Se o usuário não existe, tenta criar um novo
        try {
          const name = email.split('@')[0]; // Nome simples baseado no email
          await sql`
            INSERT INTO users (email, password_hash, name)
            VALUES (${email}, ${passwordHash}, ${name})
          `;
          
          // eslint-disable-next-line no-console
          console.log('Novo usuário criado com a senha definida:', email);
          return true;
        } catch (insertError) {
          // eslint-disable-next-line no-console
          console.error('Erro ao criar novo usuário:', insertError);
          return false;
        }
      }
      
      // Atualiza a senha do usuário existente
      await sql`
        UPDATE users
        SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email}
      `;
      
      // eslint-disable-next-line no-console
      console.log('Senha atualizada para o usuário:', email);
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao redefinir senha:', error);
      return false;
    }
  },

  /**
   * Verifica se as credenciais do usuário são válidas
   */
  async validateCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findUserByEmail(email);
      
      if (!user) {
        return null;
      }
      
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      return isPasswordValid ? user : null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao validar credenciais:', error);
      return null;
    }
  }
}; 