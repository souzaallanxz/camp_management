# Shadcn Admin Dashboard

Admin Dashboard UI crafted with Shadcn and Vite. Built with responsiveness and accessibility in mind.

![alt text](public/images/shadcn-admin.png)

I've been creating dashboard UIs at work and for my personal projects. I always wanted to make a reusable collection of dashboard UI for future projects; and here it is now. While I've created a few custom components, some of the code is directly adapted from ShadcnUI examples.

> This is not a starter project (template) though. I'll probably make one in the future.

## Features

- Light/dark mode
- Responsive
- Accessible
- With built-in Sidebar component
- Global Search Command
- 10+ pages
- Extra custom components

## Tech Stack

**UI:** [ShadcnUI](https://ui.shadcn.com) (TailwindCSS + RadixUI)

**Build Tool:** [Vite](https://vitejs.dev/)

**Routing:** [TanStack Router](https://tanstack.com/router/latest)

**Type Checking:** [TypeScript](https://www.typescriptlang.org/)

**Linting/Formatting:** [Eslint](https://eslint.org/) & [Prettier](https://prettier.io/)

**Icons:** [Tabler Icons](https://tabler.io/icons)

## Sistema de Recuperação de Senha

O sistema de recuperação de senha utiliza a API da [Resend](https://resend.com) para envio de emails. 

### Configuração da API Resend

1. Crie uma conta no [Resend](https://resend.com)
2. Obtenha uma chave de API no painel do Resend
3. Configure sua chave de API no arquivo `.env`:

```
VITE_RESEND_API_KEY=sua_chave_api_resend
```

### Modo de Desenvolvimento

Em ambiente de desenvolvimento, sem a chave da API configurada, o sistema usa um fallback local:

- Os emails são simulados e não enviados de fato
- Os links de recuperação são exibidos no console do navegador
- Os dados dos emails são armazenados no localStorage para referência

### Fluxo de Recuperação de Senha

1. Usuário acessa a página de "Esqueceu a senha"
2. Insere seu email de cadastro
3. Um token de recuperação é gerado (válido por 1 hora)
4. Um email com link de recuperação é enviado para o usuário
5. Ao clicar no link, o usuário é redirecionado para a página de redefinição de senha
6. O token é validado e, se válido, o usuário pode definir uma nova senha
7. Após redefinir, o token é invalidado e o usuário pode fazer login com a nova senha

### Configurações Adicionais

O sistema de tokens possui algumas configurações que podem ser ajustadas no arquivo `src/services/token.service.ts`:

- `tokenExpirationTime`: Tempo de validade do token (padrão: 1 hora)
- `secretKey`: Chave secreta para assinatura dos tokens (recomendável configurar no .env em produção)

Para configurar a origem dos emails, edite o parâmetro `from` no serviço de email em `src/services/email.service.ts`.

## Run Locally

Clone the project

```bash
  git clone https://github.com/satnaing/shadcn-admin.git
```

Go to the project directory

```bash
  cd shadcn-admin
```

Install dependencies

```bash
  pnpm install
```

Start the server

```bash
  pnpm run dev
```

## Author

Crafted with 🤍 by [@satnaing](https://github.com/satnaing)

## License

Licensed under the [MIT License](https://choosealicense.com/licenses/mit/)
