# Documentação do Macena Health

## Visão Geral
Macena Health é um sistema completo de enfermagem domiciliar que permite o gerenciamento de pacientes, registro de sinais vitais, agendamentos e geração de relatórios. O sistema foi desenvolvido com React e utiliza o Supabase como backend para armazenamento de dados e autenticação.

## Funcionalidades Principais

### 1. Autenticação e Segurança
- Login seguro com email e senha
- Proteção de rotas para usuários autenticados
- Gerenciamento de perfil e senha

### 2. Gerenciamento de Pacientes
- Cadastro completo de pacientes com informações detalhadas
- Categorização em três tipos: Atendimento Domiciliar, Hospitalar e Freelancer
- Campos adicionais incluindo telefone, convênio e endereço
- Listagem, filtragem e busca de pacientes

### 3. Registro de Sinais Vitais
- Registro de múltiplos parâmetros: pressão arterial, temperatura, frequência cardíaca, etc.
- Histórico completo de sinais vitais por paciente
- Visualização e filtragem de registros

### 4. Agendamentos
- Criação e gerenciamento de agendamentos
- Visualização por data
- Diferentes tipos de atendimento

### 5. Relatórios
- Geração de relatórios de sinais vitais, agendamentos e pacientes
- Visualização gráfica de dados
- Exportação para CSV

### 6. Dashboard
- Visão geral das estatísticas do sistema
- Gráficos de distribuição de pacientes por categoria
- Contadores de registros e agendamentos

## Requisitos Técnicos

### Requisitos de Sistema
- Node.js 14.0 ou superior
- NPM 6.0 ou superior
- Conta no Supabase (gratuita ou paga)

### Banco de Dados
O sistema utiliza o Supabase como backend, que oferece:
- Armazenamento de dados em PostgreSQL
- Autenticação de usuários
- API RESTful para acesso aos dados
- Tempo real (opcional)

## Instruções de Configuração

### 1. Configuração do Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Crie um novo projeto
3. No painel do projeto, vá para "Settings" > "API" e copie:
   - URL do projeto
   - Chave anônima (anon key)
4. Crie as seguintes tabelas no banco de dados:

#### Tabela `users` (criada automaticamente pelo Supabase Auth)

#### Tabela `pacientes`
```sql
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  idade INTEGER,
  telefone TEXT NOT NULL,
  endereco TEXT,
  convenio TEXT,
  categoria TEXT NOT NULL DEFAULT 'domiciliar',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabela `sinais_vitais`
```sql
CREATE TABLE sinais_vitais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  pressao_arterial TEXT,
  temperatura NUMERIC,
  frequencia_cardiaca INTEGER,
  frequencia_respiratoria INTEGER,
  saturacao INTEGER,
  glicemia INTEGER,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tabela `agendamentos`
```sql
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'visita',
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Configuração do Aplicativo

1. Descompacte o arquivo do projeto
2. Abra o arquivo `.env` na raiz do projeto e preencha com suas credenciais do Supabase:
```
REACT_APP_SUPABASE_URL=sua_url_do_supabase
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```
3. Abra um terminal na pasta do projeto e execute:
```
npm install
```
4. Após a instalação das dependências, execute:
```
npm start
```
5. O aplicativo estará disponível em `http://localhost:3000`

## Instruções de Deploy

### Opção 1: Deploy no Vercel (Recomendado)

1. Crie uma conta no [Vercel](https://vercel.com)
2. Instale a CLI do Vercel:
```
npm install -g vercel
```
3. Na pasta do projeto, execute:
```
vercel login
```
4. Após o login, execute:
```
vercel
```
5. Siga as instruções na tela para configurar o projeto
6. Adicione as variáveis de ambiente (REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY)
7. O Vercel fornecerá uma URL para acesso ao aplicativo

### Opção 2: Deploy no Netlify

1. Crie uma conta no [Netlify](https://netlify.com)
2. Na pasta do projeto, execute:
```
npm run build
```
3. Arraste a pasta `build` gerada para a área de upload do Netlify
4. Configure as variáveis de ambiente no painel do Netlify
5. O Netlify fornecerá uma URL para acesso ao aplicativo

### Opção 3: Deploy em Servidor Próprio

1. Na pasta do projeto, execute:
```
npm run build
```
2. Copie o conteúdo da pasta `build` para o diretório raiz do seu servidor web
3. Configure o servidor para redirecionar todas as requisições para o arquivo `index.html`

## Primeiros Passos

### Criando o Primeiro Usuário

1. Acesse o painel do Supabase
2. Vá para "Authentication" > "Users"
3. Clique em "Invite User" e adicione um email e senha
4. Ou configure o registro de usuários no aplicativo (requer personalização adicional)

### Utilizando o Sistema

1. Acesse o aplicativo pela URL de deploy
2. Faça login com as credenciais criadas
3. Comece adicionando pacientes no menu "Pacientes"
4. Registre sinais vitais e crie agendamentos
5. Utilize o dashboard para visualizar estatísticas

## Suporte e Manutenção

Para suporte técnico ou dúvidas sobre o sistema, entre em contato com:
- Email: suporte@macenahealth.com.br
- Telefone: (XX) XXXX-XXXX

## Licença

Este software é propriedade da Macena Health e seu uso está restrito aos termos acordados no contrato de licenciamento.
