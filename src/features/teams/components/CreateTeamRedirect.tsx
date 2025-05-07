import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-context'
import { teamService } from '../services/team-service'

export function CreateTeamRedirect() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)

  // Função para forçar fechamento do modal de criação de equipe
  // que pode estar aberto em algum contexto
  const forceCloseTeamModal = () => {
    // Buscar e fechar qualquer modal com a classe que possa conter o formulário de equipe
    const modals = document.querySelectorAll('[role="dialog"]')
    modals.forEach(modal => {
      // Verificar se é o modal de criação de equipe
      if (modal.textContent?.includes('Create Team') || 
          modal.textContent?.includes('Welcome!')) {
        // Buscar o botão de fechar ou simular um clique fora do modal
        const closeButton = modal.querySelector('button[aria-label="Close"]')
        if (closeButton) {
          // @ts-ignore - pode não ter a propriedade click
          closeButton.click()
        }
      }
    })
  }

  useEffect(() => {
    const checkTeam = async () => {
      // Ignorar o redirect se estivermos na página de criação de equipe
      if (location.pathname === '/create-team') {
        setIsChecking(false)
        return
      }

      if (user) {
        try {
          // Debug dos dados do usuário
          console.log('🔍 Usuário atual:', user)
          console.log('🏢 Team ID no usuário:', user.team_id || 'nenhum')
          
          // Verificar localStorage
          const storedTeamId = localStorage.getItem('teamId') || localStorage.getItem('team_id')
          console.log('🗄️ Team ID no localStorage:', storedTeamId || 'nenhum')
          
          // Se o usuário já tem team_id, usá-lo e encerrar
          if (user.team_id) {
            console.log('✅ Usando team_id do usuário:', user.team_id)
            localStorage.setItem('teamId', user.team_id)
            localStorage.setItem('team_id', user.team_id)
            
            // Forçar fechamento de qualquer modal aberto
            forceCloseTeamModal()
            
            setIsChecking(false)
            return
          }
          
          // Se já temos um team_id no localStorage, usá-lo
          if (storedTeamId) {
            console.log('✅ Usando team_id do localStorage:', storedTeamId)
            
            // Forçar fechamento de qualquer modal aberto
            forceCloseTeamModal()
            
            setIsChecking(false)
            return
          }
          
          // Se não temos team_id nem no usuário nem no localStorage, verificar no backend
          console.log('🔄 Verificando equipe no backend...')
          const team = await teamService.getCurrentUserTeam()
          console.log('🔄 Resposta do backend:', team)
          
          if (team && team.id) {
            console.log('✅ Equipe encontrada no backend:', team.id)
            // Se encontrou uma equipe, salvar no localStorage
            localStorage.setItem('teamId', team.id)
            localStorage.setItem('team_id', team.id)
            
            // Forçar fechamento de qualquer modal aberto
            forceCloseTeamModal()
            
            setIsChecking(false)
          } else {
            console.log('❌ Nenhuma equipe encontrada, redirecionando para criar')
            // Se não tem equipe, redirecionar para criar uma
            navigate('/create-team')
          }
        } catch (error) {
          console.error('Erro ao verificar equipe:', error)
          setIsChecking(false)
        }
      } else {
        console.log('❌ Nenhum usuário autenticado')
        setIsChecking(false)
      }
    }
    
    checkTeam()
  }, [user, navigate, location])
  
  // Renderizar nada, componente é apenas para lógica
  return null
} 