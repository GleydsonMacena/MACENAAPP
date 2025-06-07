-- Criação das tabelas para o Macena Health

-- Tabela de pacientes
CREATE TABLE IF NOT EXISTS pacientes (
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

-- Tabela de sinais vitais
CREATE TABLE IF NOT EXISTS sinais_vitais (
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

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  hora TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'visita',
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Políticas de segurança para acesso aos dados
-- Permitir acesso apenas para usuários autenticados

-- Políticas para pacientes
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar pacientes" ON pacientes
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem inserir pacientes" ON pacientes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem atualizar pacientes" ON pacientes
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem excluir pacientes" ON pacientes
  FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para sinais vitais
ALTER TABLE sinais_vitais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar sinais vitais" ON sinais_vitais
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem inserir sinais vitais" ON sinais_vitais
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem atualizar sinais vitais" ON sinais_vitais
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem excluir sinais vitais" ON sinais_vitais
  FOR DELETE USING (auth.role() = 'authenticated');

-- Políticas para agendamentos
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários autenticados podem visualizar agendamentos" ON agendamentos
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem inserir agendamentos" ON agendamentos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem atualizar agendamentos" ON agendamentos
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Usuários autenticados podem excluir agendamentos" ON agendamentos
  FOR DELETE USING (auth.role() = 'authenticated');
