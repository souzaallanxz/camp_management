export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export type SignInCredentials = {
  email: string
  password: string
}

export type SignUpCredentials = {
  email: string
  password: string
  name: string
} 