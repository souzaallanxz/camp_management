export type TeamTier = 'free' | 'premium'

export interface Team {
  id: string
  name: string
  logo_url?: string | null
  created_at: string
  updated_at: string
  tier: TeamTier
}

export interface CreateTeamDto {
  name: string
  logo_url?: string
  tier?: TeamTier
}

export interface UpdateTeamData {
  name?: string
  logo_url?: string | null
  tier?: TeamTier
} 