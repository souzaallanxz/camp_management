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
    console.log('fetchTeam called:', { user, isAuthLoading }) // Debug log

    if (!user || isAuthLoading) {
      console.log('No user or still loading auth, skipping fetch') // Debug log
      setTeam(null)
      setShowOnboarding(false)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      console.log('Fetching team for user:', user.email) // Debug log
      const team = await teamService.getCurrentUserTeam()
      console.log('Team fetched:', team) // Debug log

      setTeam(team)
      const shouldShowOnboarding = !team
      console.log('Should show onboarding:', shouldShowOnboarding) // Debug log
      setShowOnboarding(shouldShowOnboarding)
    } catch (error) {
      console.error('Error fetching team:', error) // Debug log
      setTeam(null)
      setShowOnboarding(true)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch team information. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch team whenever auth state changes
  useEffect(() => {
    console.log('Auth state changed:', { user, isAuthLoading }) // Debug log
    if (!isAuthLoading) {
      fetchTeam()
    }
  }, [user, isAuthLoading])

  // Ensure dialog stays open if no team
  useEffect(() => {
    console.log('State changed:', { user, team, isLoading, showOnboarding }) // Debug log
    if (user && !isLoading && !team) {
      console.log('Setting showOnboarding to true') // Debug log
      setShowOnboarding(true)
    }
  }, [user, team, isLoading])

  // Prevent closing the dialog if user has no team
  const handleOpenChange = (open: boolean) => {
    console.log('Dialog open change:', { open, team, user }) // Debug log
    if (!team && user && !open) {
      console.log('Preventing dialog from closing') // Debug log
      return
    }
    setShowOnboarding(open)
  }

  const handleTeamCreated = async () => {
    console.log('Team created, refetching...') // Debug log
    await fetchTeam()
  }

  const shouldShowDialog = user && !isLoading && showOnboarding
  console.log('Dialog visibility conditions:', {
    hasUser: !!user,
    notLoading: !isLoading,
    showOnboarding,
    shouldShowDialog,
    userEmail: user?.email,
    hasTeam: !!team
  }) // Debug log

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