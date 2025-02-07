export interface Team {
  id: string
  name: string
  logo_url?: string | null
  created_at: string
  updated_at: string
}

export interface CreateTeamDto {
  name: string
  logo_url?: string
} 