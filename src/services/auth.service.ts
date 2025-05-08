/**
 * Serviço para gerenciar operações relacionadas à autenticação
 * Este serviço conecta-se ao banco de dados Neon para operações de usuário
 */

// For production, directly use the correct API URL
const API_BASE_URL = 'https://campmanagement.vercel.app/api';

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