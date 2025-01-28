export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials extends SignInCredentials {
  confirmPassword: string
} 