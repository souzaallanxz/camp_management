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
          
          // IMPORTANTE: O erro estava acontecendo aqui quando a API retornava HTML
          // em vez de JSON. Em vez de tentar verificar no backend, vamos priorizar
          // as verificações locais

          // Verificar uma última vez se algum dos IDs de equipe existe
          // Isso evita chamadas desnecessárias ao backend que podem falhar
          const finalTeamId = user.team_id || 
                            localStorage.getItem('teamId') || 
                            localStorage.getItem('team_id');
                            
          if (finalTeamId) {
            console.log('✅ Usando team_id encontrado na verificação final:', finalTeamId)
            localStorage.setItem('teamId', finalTeamId)
            localStorage.setItem('team_id', finalTeamId)
            
            // Forçar fechamento de qualquer modal aberto
            forceCloseTeamModal()
            
            setIsChecking(false)
            return
          }
          
          // Se chegamos aqui, não temos nenhuma informação local sobre o ID da equipe
          // Só agora tentamos verificar no backend como último recurso
          console.log('🔄 Verificando equipe no backend como último recurso...')
          
          try {
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
          } catch (backendError) {
            console.error('Erro ao verificar equipe no backend:', backendError)
            setIsChecking(false)
            // Não redirecionar aqui, pois pode ser apenas um problema temporário
          }
        } catch (error) {
          console.error('Erro geral ao verificar equipe:', error)
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