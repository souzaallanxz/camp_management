import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
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

  const fetchTeam = async () => {
    if (!user || isAuthLoading) {
      setTeam(null);
      setShowOnboarding(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const team = await teamService.getCurrentUserTeam();

      setTeam(team);
      const shouldShowOnboarding = !team;
      setShowOnboarding(shouldShowOnboarding);
    } catch (error) {
      setTeam(null);
      setShowOnboarding(true);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch team information. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch team whenever auth state changes
  useEffect(() => {
    if (!isAuthLoading) {
      fetchTeam()
    }
  }, [user, isAuthLoading])

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

  const handleTeamCreated = async () => {
    
    await fetchTeam()
  }

  const shouldShowDialog = user && !isLoading && showOnboarding
  

  return (
    <TeamContext.Provider
      value={{
        team,
        isLoading: isLoading || isAuthLoading,
        refetchTeam: fetchTeam,
      }}
    >
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
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider')
  }
  return context
} 