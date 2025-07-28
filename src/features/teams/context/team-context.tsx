import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from 'react'
import { useAuth } from '@/features/auth/auth-context'
import { Team } from '../types'
import { teamService } from '../services/team-service'
import { CreateTeamDialog } from '../components/create-team-dialog'
import { toast } from '@/hooks/use-toast'

interface TeamContextType {
  team: Team | null
  isLoading: boolean
  refetchTeam: () => Promise<void>
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

export function TeamProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [team, setTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Memoize fetchTeam to prevent unnecessary re-creations
  const fetchTeam = useCallback(async () => {
    if (!user || isAuthLoading) {
      setTeam(null);
      setShowOnboarding(false);
      setIsLoading(false);
      localStorage.removeItem('teamId');
      return;
    }

    try {
      setIsLoading(true);
      const team = await teamService.getCurrentUserTeam();

      setTeam(team);
      if (team && team.id) {
        localStorage.setItem('teamId', team.id);
      } else {
        localStorage.removeItem('teamId');
      }
      const shouldShowOnboarding = !team;
      setShowOnboarding(shouldShowOnboarding);
    } catch {
      setTeam(null);
      setShowOnboarding(true);
      localStorage.removeItem('teamId');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch team information. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthLoading])

  // Fetch team whenever auth state changes
  useEffect(() => {
    if (!isAuthLoading) {
      fetchTeam()
    }
  }, [fetchTeam, isAuthLoading])

  // Ensure dialog stays open if no team
  useEffect(() => {
    if (user && !isLoading && !team) {
      setShowOnboarding(true)
    }
  }, [user, team, isLoading])

  // Prevent closing the dialog if user has no team
  const handleOpenChange = (open: boolean) => {
    
    if (!team && user && !open) {
      
      return
    }
    setShowOnboarding(open)
  }

  const handleTeamCreated = useCallback(async () => {
    
    await fetchTeam()
  }, [fetchTeam])

  const shouldShowDialog = user && !isLoading && showOnboarding

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    team,
    isLoading: isLoading || isAuthLoading,
    refetchTeam: fetchTeam,
  }), [team, isLoading, isAuthLoading, fetchTeam])

  return (
    <TeamContext.Provider value={contextValue}>
      {children}
      {shouldShowDialog && (
        <CreateTeamDialog
          open={true}
          onOpenChange={handleOpenChange}
          onSuccess={handleTeamCreated}
          isOnboarding={!team}
        />
      )}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (!context) {
    return {
      team: null,
      isLoading: true,
      refetchTeam: async () => {},
    }
  }
  return context
} 