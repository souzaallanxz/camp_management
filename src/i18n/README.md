# Sistema de Tradução (i18n)

Este sistema de tradução foi implementado usando [react-i18next](https://react.i18next.com/) e oferece suporte completo para português e inglês.

## Estrutura de Arquivos

```
src/i18n/
├── index.ts                 # Configuração principal do i18next
├── types.ts                 # Tipos TypeScript para traduções
├── hooks/
│   └── useTranslation.ts    # Hook personalizado para traduções
├── providers/
│   └── LanguageProvider.tsx # Provider para gerenciar idioma
├── components/
│   └── LanguageSelector.tsx # Componente para seleção de idioma
├── locales/
│   ├── index.ts            # Exporta todas as traduções
│   ├── pt.json            # Traduções em português
│   └── en.json            # Traduções em inglês
└── examples/
    └── TranslationExample.tsx # Exemplo de uso
```

## Configuração

O sistema já está configurado no `src/app/layout.tsx` com o `LanguageProvider` envolvendo toda a aplicação.

## Como Usar

### 1. Hook useTranslation

```tsx
import { useTranslation } from '@/i18n'

function MyComponent() {
  const { t, currentLanguage, changeLanguage } = useTranslation()
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <p>Idioma atual: {currentLanguage}</p>
      <button onClick={() => changeLanguage('en')}>
        Mudar para inglês
      </button>
    </div>
  )
}
```

### 2. Componente LanguageSelector

```tsx
import { LanguageSelector } from '@/i18n'

function SettingsPage() {
  return (
    <div>
      <h2>Configurações</h2>
      <LanguageSelector variant="select" />
      {/* ou */}
      <LanguageSelector variant="button" />
    </div>
  )
}
```

### 3. Hook useLanguage

```tsx
import { useLanguage } from '@/i18n'

function LanguageSettings() {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage()
  
  return (
    <div>
      <p>Idioma atual: {currentLanguage}</p>
      <div>
        {availableLanguages.map(lang => (
          <button 
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
          >
            {lang.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

## Estrutura de Traduções

As traduções estão organizadas em namespaces:

### Common
- `common.save` - "Salvar" / "Save"
- `common.cancel` - "Cancelar" / "Cancel"
- `common.edit` - "Editar" / "Edit"
- `common.delete` - "Eliminar" / "Delete"
- etc.

### Navigation
- `navigation.dashboard` - "Painel de Controlo" / "Dashboard"
- `navigation.campers` - "Participantes" / "Campers"
- `navigation.camps` - "Campos" / "Camps"
- etc.

### Auth
- `auth.signIn` - "Iniciar sessão" / "Sign In"
- `auth.signUp` - "Criar conta" / "Sign Up"
- etc.

### Profile
- `profile.title` - "Perfil" / "Profile"
- `profile.name` - "Nome" / "Name"
- `profile.email` - "Email"
- `profile.language` - "Idioma" / "Language"
- etc.

### Settings
- `settings.title` - "Definições" / "Settings"
- `settings.language` - "Idioma" / "Language"
- etc.

### Dashboard
- `dashboard.title` - "Painel de Controlo" / "Dashboard"
- `dashboard.overview` - "Visão geral" / "Overview"
- etc.

### Campers
- `campers.title` - "Participantes" / "Campers"
- `campers.addCamper` - "Adicionar participante" / "Add Camper"
- etc.

### Camps
- `camps.title` - "Campos" / "Camps"
- `camps.addCamp` - "Adicionar campo" / "Add Camp"
- etc.

### Registrations
- `registrations.title` - "Inscrições" / "Registrations"
- `registrations.addRegistration` - "Adicionar inscrição" / "Add Registration"
- etc.

### Payments
- `payments.title` - "Pagamentos" / "Payments"
- `payments.addPayment` - "Adicionar pagamento" / "Add Payment"
- etc.

### Users
- `users.title` - "Utilizadores" / "Users"
- `users.addUser` - "Adicionar utilizador" / "Add User"
- etc.

### Errors
- `errors.general` - "Ocorreu um erro inesperado" / "An unexpected error occurred"
- `errors.network` - "Erro de rede" / "Network error"
- etc.

### Validation
- `validation.required` - "Este campo é obrigatório" / "This field is required"
- `validation.email` - "Email inválido" / "Invalid email"
- etc.

## Adicionando Novas Traduções

1. Adicione as chaves no arquivo `src/i18n/locales/pt.json`
2. Adicione as traduções correspondentes no arquivo `src/i18n/locales/en.json`
3. Use a chave no seu componente: `t('nova.chave')`

### Exemplo:

```json
// pt.json
{
  "nova": {
    "chave": "Valor em português"
  }
}

// en.json
{
  "nova": {
    "chave": "Value in English"
  }
}
```

```tsx
// No componente
const { t } = useTranslation()
return <div>{t('nova.chave')}</div>
```

## Funcionalidades

### Detecção Automática de Idioma
- O sistema detecta automaticamente o idioma do navegador
- Salva a preferência do usuário no perfil
- Persiste a escolha no localStorage

### Mudança de Idioma
- Mudança instantânea sem reload da página
- Atualização automática do perfil do usuário
- Fallback para português se houver erro

### Tipos TypeScript
- Suporte completo para TypeScript
- Autocomplete para chaves de tradução
- Verificação de tipos em tempo de compilação

### Componentes Reutilizáveis
- `LanguageSelector` - Componente para seleção de idioma
- `useTranslation` - Hook personalizado
- `useLanguage` - Hook para gerenciamento de idioma

## Melhores Práticas

1. **Use chaves descritivas**: `t('campers.addCamper')` em vez de `t('add')`
2. **Organize por namespace**: Agrupe traduções relacionadas
3. **Mantenha consistência**: Use as mesmas chaves em toda a aplicação
4. **Teste as traduções**: Verifique se todas as chaves existem em ambos os idiomas
5. **Use interpolação**: `t('welcome', { name: userName })` para valores dinâmicos

## Exemplo Completo

```tsx
import { useTranslation } from '@/i18n'
import { LanguageSelector } from '@/i18n'

function MyPage() {
  const { t, currentLanguage } = useTranslation()
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.overview')}</p>
      
      <div>
        <h2>{t('settings.language')}</h2>
        <LanguageSelector variant="button" />
      </div>
      
      <div>
        <h2>{t('campers.title')}</h2>
        <button>{t('campers.addCamper')}</button>
      </div>
    </div>
  )
}
```

## Troubleshooting

### Problema: Tradução não aparece
- Verifique se a chave existe nos arquivos de tradução
- Verifique se o `LanguageProvider` está envolvendo o componente
- Verifique se o i18n foi inicializado corretamente

### Problema: Erro de tipo TypeScript
- Verifique se a chave está definida no arquivo `types.ts`
- Verifique se a estrutura dos arquivos JSON está correta

### Problema: Idioma não muda
- Verifique se o `changeLanguage` está sendo chamado
- Verifique se não há erros no console
- Verifique se o perfil do usuário está sendo atualizado 