# SimpleFlow

Sistema Inteligente de Fluxo de Caixa Integrado ao ERP - Uma ferramenta moderna e responsiva para gestão financeira empresarial com recursos de IA.

## 🚀 Características

- **Dashboard Interativo**: Visão completa do fluxo de caixa com gráficos dinâmicos
- **Gestão de Contas**: Controle de contas a pagar e receber
- **Extrato Bancário**: Histórico detalhado de movimentações
- **Assistente de IA**: Análises inteligentes e insights financeiros
- **Relatórios Avançados**: Geração de relatórios personalizados
- **Integração ERP**: Conexão flexível com qualquer sistema ERP
- **Interface Responsiva**: Design moderno com tema escuro e cores em amarelo

## 🛠️ Tecnologias

- **Frontend**: React + Vite + TypeScript
- **UI Components**: Radix UI + Tailwind CSS + shadcn/ui
- **Estado Global**: TanStack Query (React Query)
- **Roteamento**: Wouter
- **Gráficos**: Recharts
- **Autenticação**: JWT + Session Management
- **Backend**: Express.js + TypeScript
- **Banco de Dados**: PostgreSQL + Drizzle ORM
- **Validação**: Zod

## 📦 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd simpleflow
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/simpleflow
JWT_SECRET=seu_jwt_secret_aqui
VITE_ERP_BASE_URL=https://seu-erp.com/api
```

4. **Configure os endpoints do ERP**

Edite o arquivo `src/config/endpoints.ts` para apontar para os endpoints do seu ERP:

```typescript
export const erpEndpoints: ERPEndpoints = {
  // Autenticação
  login: 'https://meu-erp.com/api/auth/login',
  logout: 'https://meu-erp.com/api/auth/logout',
  validateToken: 'https://meu-erp.com/api/auth/validate',
  
  // Fluxo de Caixa
  entradas: 'https://meu-erp.com/api/financeiro/entradas',
  saidas: 'https://meu-erp.com/api/financeiro/saidas',
  saldoAtual: 'https://meu-erp.com/api/financeiro/saldo',
  
  // Contas
  contasPagar: 'https://meu-erp.com/api/contas/pagar',
  contasReceber: 'https://meu-erp.com/api/contas/receber',
  
  // ... outros endpoints
};
```

5. **Execute as migrações do banco**
```bash
npm run db:push
```

## 🚀 Como Iniciar

### Modo Desenvolvimento
```bash
npm run dev
```

Acesse `http://localhost:5000` para visualizar a aplicação.

### Modo Produção
```bash
npm run build
npm start
```

## 📁 Estrutura do Projeto

```
simpleflow/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes reutilizáveis
│   │   │   ├── ui/        # Componentes base (shadcn/ui)
│   │   │   └── layout.tsx # Layout principal
│   │   ├── config/        # Configurações
│   │   │   └── endpoints.ts # Endpoints do ERP
│   │   ├── hooks/         # Hooks customizados
│   │   ├── lib/          # Utilitários e configurações
│   │   ├── pages/        # Páginas da aplicação
│   │   └── services/     # Serviços de API
│   └── index.html
├── server/               # Backend Express
│   ├── routes.ts        # Rotas da API
│   ├── storage.ts       # Interface de armazenamento
│   └── index.ts         # Servidor principal
├── shared/              # Código compartilhado
│   └── schema.ts        # Schemas e tipos
└── README.md
```

## 🔧 APIs Necessárias do ERP

Para integração completa, seu ERP deve fornecer os seguintes endpoints:

### Autenticação
- `POST /api/auth/login` - Login do usuário
- `POST /api/auth/logout` - Logout
- `GET /api/auth/validate` - Validar token

### Fluxo de Caixa
- `GET /api/fluxo/entradas` - Buscar entradas
- `GET /api/fluxo/saidas` - Buscar saídas  
- `GET /api/fluxo/saldo` - Obter saldo atual

### Contas a Pagar
- `GET /api/contas/pagar` - Listar contas a pagar
- `POST /api/contas/marcar-pago` - Marcar conta como paga

### Contas a Receber
- `GET /api/contas/receber` - Listar contas a receber
- `POST /api/contas/registrar-recebimento` - Registrar recebimento

### Extrato
- `GET /api/extrato` - Obter extrato bancário

### Relatórios
- `GET /api/relatorios/fluxo-caixa` - Gerar relatório de fluxo
- `GET /api/relatorios/resumo-diario` - Resumo diário

### IA Assistant (Opcional)
- `POST /api/ai/query` - Consulta ao assistente de IA

## 📊 Formato dos Dados

### Lançamento Financeiro
```typescript
{
  id: number;
  contaId: number;
  descricao: string;
  valor: number;        // Em centavos
  tipo: 'entrada' | 'saida';
  categoria?: string;
  dataVencimento?: string;
  dataPagamento?: string;
  status: 'pendente' | 'pago' | 'cancelado';
  observacoes?: string;
  createdAt: string;
}
```

### Conta
```typescript
{
  id: number;
  nome: string;
  tipo: string;         // 'corrente', 'poupanca', 'investimento'
  saldo: number;        // Em centavos
  ativo: boolean;
  createdAt: string;
}
```

## 🎨 Personalização

### Cores e Tema
O SimpleFlow usa um esquema de cores baseado em amarelo escuro. Para personalizar:

1. Edite `client/src/index.css`
2. Modifique as variáveis CSS em `:root`
3. Ajuste `--primary` e `--secondary` conforme necessário

### Componentes UI
Baseado em shadcn/ui, você pode:
- Adicionar novos componentes: `npx shadcn-ui@latest add <component>`
- Personalizar existentes em `client/src/components/ui/`

## 🧪 Desenvolvimento

### Adicionando Nova Página
1. Crie o arquivo em `client/src/pages/`
2. Adicione a rota em `client/src/App.tsx`
3. Inclua no menu lateral em `client/src/components/layout.tsx`

### Integrando Nova API
1. Adicione o endpoint em `client/src/config/endpoints.ts`
2. Crie o serviço em `client/src/services/api.ts`
3. Use React Query para gerenciar estado

### Executando Testes
```bash
npm test
```

## 🔒 Segurança

- Autenticação via JWT
- Validação de entrada com Zod
- Headers de segurança configurados
- Sanitização de dados

## 📝 Scripts Disponíveis

- `npm run dev` - Inicia em modo desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build
- `npm run db:push` - Aplica mudanças no schema
- `npm run db:studio` - Interface visual do banco

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no repositório ou entre em contato:
- Email: suporte@simpleflow.com
- Documentação: [docs.simpleflow.com](https://docs.simpleflow.com)

---

**SimpleFlow v1.0.0** - Sistema Inteligente de Fluxo de Caixa 💰