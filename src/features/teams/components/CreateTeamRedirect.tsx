import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { teamService } from '../services/team-service'

export function CreateTeamRedirect() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkTeam = async () => {
      if (user) {
        try {
          // Verifica se já existe um team_id no localStorage
          const storedTeamId = localStorage.getItem('teamId') || localStorage.getItem('team_id')
          
          // Se o usuário tem team_id nos dados do usuário, salvamos nos dois formatos
          if (user.team_id) {
            localStorage.setItem('teamId', user.team_id)
            localStorage.setItem('team_id', user.team_id)
            setIsChecking(false)
            return
          }
          
          // Se já temos um team_id no localStorage, não precisamos verificar o backend
          if (storedTeamId) {
            setIsChecking(false)
            return
          }
          
          // Se não temos team_id nem no usuário nem no localStorage, verificamos do backend
          const team = await teamService.getCurrentUserTeam()
          
          if (team) {
            // Se encontrou uma equipe, salvar no localStorage
            localStorage.setItem('teamId', team.id)
            localStorage.setItem('team_id', team.id)
            setIsChecking(false)
          } else {
            // Se não tem equipe, redirecionar para criar uma
            navigate('/create-team')
          }
        } catch (error) {
          console.error('Erro ao verificar equipe:', error)
          setIsChecking(false)
        }
      } else {
        setIsChecking(false)
      }
    }
    
    checkTeam()
  }, [user, navigate])
  
  // Renderizar nada, componente é apenas para lógica
  return null
} 