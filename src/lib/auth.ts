/**
 * Funções utilitárias para gerenciamento de autenticação e armazenamento
 * de dados importantes no localStorage.
 */

/**
 * Obtém o token de autenticação do localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Salva o token de autenticação no localStorage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * Remove o token de autenticação do localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem('token');
}

/**
 * Obtém o ID da equipe do usuário de todas as fontes possíveis.
 * Garante que o ID esteja disponível no localStorage em ambos os formatos.
 */
export function getTeamId(): string | null {
  // Verificar em todas as fontes possíveis
  const teamId = localStorage.getItem('teamId') || localStorage.getItem('team_id');
  
  // Se encontrar, garantir que esteja disponível em ambos os formatos
  if (teamId) {
    localStorage.setItem('teamId', teamId);
    localStorage.setItem('team_id', teamId);
    return teamId;
  }
  
  // Se não encontrar nas chaves diretas, procurar nos dados do usuário
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const user = JSON.parse(userJson);
      if (user && user.team_id) {
        // Salvar em ambos os formatos
        localStorage.setItem('teamId', user.team_id);
        localStorage.setItem('team_id', user.team_id);
        return user.team_id;
      }
    }
  } catch {
    // Ignorar erros na análise do JSON
  }
  
  return null;
}

/**
 * Obtém o header com o ID da equipe para usar em requisições à API
 */
export function getTeamIdHeader(): { 'x-team-id': string; Authorization?: string } | { Authorization?: string } {
  const headers: { 'x-team-id'?: string; Authorization?: string } = {};
  
  // Adicionar o token de autenticação, se disponível
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  // Adicionar o team ID, se disponível
  const teamId = getTeamId();
  if (teamId) {
    headers['x-team-id'] = teamId;
  }
  
  return headers;
} 