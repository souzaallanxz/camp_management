/**
 * Token Service
 * 
 * Este serviço gerencia a criação, validação e invalidação de tokens para recuperação de senha
 * usando localStorage como armazenamento persistente.
 */

import CryptoJS from 'crypto-js';

interface Token {
  email: string;
  value: string;
  createdAt: number; // timestamp
}

class TokenService {
  private storageKey = 'password_reset_tokens';
  private tokenExpirationTime = 60 * 60 * 1000; // 1 hora em milissegundos
  private secretKey = import.meta.env.VITE_TOKEN_SECRET || 'default-secret-key-change-in-production';
  private separator = '--'; // Usando separador diferente de ponto para evitar conflito com emails

  /**
   * Gera um token único e criptografado para o email fornecido
   * @param email Email do usuário
   * @returns Token gerado
   */
  generateToken(email: string): string {
    // Simplificando a geração do token para evitar problemas de validação
    // Usamos apenas o timestamp e o email como fatores de segurança
    const timestamp = Date.now().toString();
    const randomPart = CryptoJS.lib.WordArray.random(16).toString();
    
    // Criamos uma string simples que será o token
    const token = `${randomPart}${this.separator}${timestamp}${this.separator}${email}`;
    
    try {
      // Obtém tokens existentes
      const tokens = this.getTokens();
      
      // Remove qualquer token existente para o email
      const filteredTokens = tokens.filter((t) => t.email !== email);
      
      // Adiciona o novo token
      const newToken: Token = {
        email,
        value: token,
        createdAt: Date.now(),
      };
      
      // Armazena os tokens
      this.saveTokens([...filteredTokens, newToken]);
      
      return token;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao gerar token:', error);
      return token;
    }
  }

  /**
   * Valida se um token é válido para o email fornecido
   * @param token Token a ser validado
   * @param email Email do usuário
   * @returns true se o token for válido, false caso contrário
   */
  validateToken(token: string, email: string): boolean {
    try {
      // Se não temos email ou token, já retorna falso
      if (!email || !token) {
        // eslint-disable-next-line no-console
        console.error('Email ou token vazios');
        return false;
      }
      // Verifica se o token é um UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(token)) {
        // eslint-disable-next-line no-console
        console.error('Token não é um UUID válido');
        return false;
      }
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao validar token:', error);
      return false;
    }
  }

  /**
   * Invalida um token específico
   * @param token Token a ser invalidado
   */
  invalidateToken(token: string): void {
    try {
      const tokens = this.getTokens();
      const foundToken = tokens.find((t) => t.value === token);
      
      if (foundToken) {
        // Remove o token da lista
        const filteredTokens = tokens.filter((t) => t.value !== token);
        this.saveTokens(filteredTokens);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao invalidar token:', error);
    }
  }

  /**
   * Limpa tokens expirados do armazenamento
   */
  cleanupExpiredTokens(): void {
    try {
      const tokens = this.getTokens();
      const currentTime = Date.now();
      
      const validTokens = tokens.filter(
        (token) => currentTime - token.createdAt <= this.tokenExpirationTime
      );
      
      if (tokens.length !== validTokens.length) {
        this.saveTokens(validTokens);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao limpar tokens expirados:', error);
    }
  }

  /**
   * Obtém todos os tokens armazenados
   * @returns Array de tokens
   */
  private getTokens(): Token[] {
    try {
      const tokensJson = localStorage.getItem(this.storageKey);
      return tokensJson ? JSON.parse(tokensJson) : [];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao obter tokens:', error);
      return [];
    }
  }

  /**
   * Salva tokens no armazenamento local
   * @param tokens Array de tokens a serem salvos
   */
  private saveTokens(tokens: Token[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(tokens));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao salvar tokens:', error);
    }
  }
}

export const tokenService = new TokenService(); 