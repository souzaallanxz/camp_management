import { useState, useEffect } from 'react'
import { getCurrentUserTeam } from '@/features/auth/auth-service'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'
import { useQuery } from '@tanstack/react-query'

interface TeamInfo {
  id: string
  name: string
}

async function getTeamInfo(): Promise<TeamInfo | null> {
  try {
    const teamId = await getCurrentUserTeam();
    
    if (!teamId) {
      return null;
    }
    
    const { data, error } = await db
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return data as TeamInfo;
  } catch {
    return null;
  }
}

export function UsersTeamInfo() {
  const { data: team, isLoading } = useQuery({
    queryKey: ['team-info'],
    queryFn: getTeamInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });
  
  if (isLoading) {
    return (
      <Card className="mb-4 bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }
  
  if (!team) {
    return (
      <Card className="mb-4 bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem equipe associada</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="mb-4 bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Equipe</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{team.name}</p>
          <p className="text-xs text-muted-foreground">({team.id})</p>
        </div>
      </CardContent>
    </Card>
  )
} 