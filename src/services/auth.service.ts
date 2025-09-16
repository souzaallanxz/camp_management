/**
 * Serviço para gerenciar operações relacionadas à autenticação
 * Este serviço conecta-se ao banco de dados Neon para operações de usuário
 */

// Use environment variable for API URL
const API_BASE_URL = import.meta.env.DEV 
  ? import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
  : 'https://campy.pt/api';

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