/**
 * Serviço para gerenciar operações relacionadas à autenticação
 * Este serviço conecta-se ao banco de dados Neon para operações de usuário
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Interface para representar um usuário
interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export const authService = {
  /**
   * Atualiza a senha de um usuário ou cria um novo usuário se não existir
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: newPassword }),
    });
    return response.ok;
  },

  // Outros métodos devem ser implementados via backend Express
}; 