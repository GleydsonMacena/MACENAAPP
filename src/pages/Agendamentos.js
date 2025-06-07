import React, { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiEdit2, FiTrash2, FiSearch, FiSave, FiX } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Agendamentos = () => {
  const { profile } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para o formulário de novo agendamento
  const [formData, setFormData] = useState({
    paciente_id: '',
    data: '',
    hora: '',
    tipo: 'visita',
    observacoes: ''
  });
  
  // Estado para busca e filtros
  const [busca, setBusca] = useState({
    paciente_id: '',
    data_inicio: '',
    data_fim: '',
    tipo: ''
  });
  
  // Estado para edição
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicao, setFormEdicao] = useState({
    paciente_id: '',
    data: '',
    hora: '',
    tipo: '',
    observacoes: ''
  });
  
  // Verificar permissões
  const podeEditar = ['admin', 'enfermeiro', 'gestor'].includes(profile?.role);

  useEffect(() => {
    fetchPacientes();
    fetchAgendamentos();
  }, []);

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error.message);
      setError('Erro ao carregar lista de pacientes.');
    }
  };

  const fetchAgendamentos = async () => {
    try {
      setLoading(true);
      
      // Buscar agendamentos dos próximos 5 dias por padrão
      const hoje = new Date();
      const em5Dias = new Date();
      em5Dias.setDate(hoje.getDate() + 5);
      
      const dataInicio = hoje.toISOString().split('T')[0];
      const dataFim = em5Dias.toISOString().split('T')[0];
      
      // Atualizar estado de busca com as datas padrão
      setBusca(prev => ({
        ...prev,
        data_inicio: dataInicio,
        data_fim: dataFim
      }));
      
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          *,
          pacientes:paciente_id (id, nome)
        `)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true })
        .order('hora', { ascending: true });

      if (error) throw error;
      
      setAgendamentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error.message);
      setError('Erro ao carregar agendamentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBuscaChange = (e) => {
    const { name, value } = e.target;
    setBusca(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdicaoChange = (e) => {
    const { name, value } = e.target;
    setFormEdicao(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      setLoading(true);
      
      // Validar formulário
      if (!formData.paciente_id || !formData.data || !formData.hora) {
        throw new Error('Preencha todos os campos obrigatórios.');
      }
      
      // Formatar data e hora
      const dataHora = `${formData.data}T${formData.hora}:00`;
      
      // Inserir agendamento
      const { error } = await supabase
        .from('agendamentos')
        .insert([
          {
            paciente_id: formData.paciente_id,
            data: formData.data,
            hora: formData.hora,
            data_hora: dataHora,
            tipo: formData.tipo,
            observacoes: formData.observacoes,
            status: 'agendado',
            created_by: profile.id
          }
        ]);

      if (error) throw error;
      
      // Limpar formulário
      setFormData({
        paciente_id: '',
        data: '',
        hora: '',
        tipo: 'visita',
        observacoes: ''
      });
      
      setSuccess('Agendamento criado com sucesso!');
      
      // Atualizar lista de agendamentos
      await fetchAgendamentos();
      
    } catch (error) {
      console.error('Erro ao criar agendamento:', error.message);
      setError('Erro ao criar agendamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Construir query
      let query = supabase
        .from('agendamentos')
        .select(`
          *,
          pacientes:paciente_id (id, nome)
        `)
        .order('data', { ascending: true })
        .order('hora', { ascending: true });
      
      // Aplicar filtros
      if (busca.paciente_id) {
        query = query.eq('paciente_id', busca.paciente_id);
      }
      
      if (busca.data_inicio) {
        query = query.gte('data', busca.data_inicio);
      }
      
      if (busca.data_fim) {
        query = query.lte('data', busca.data_fim);
      }
      
      if (busca.tipo) {
        query = query.eq('tipo', busca.tipo);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setAgendamentos(data || []);
      
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error.message);
      setError('Erro ao buscar agendamentos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditarClick = (agendamento) => {
    if (!podeEditar) return;
    
    setEditandoId(agendamento.id);
    setFormEdicao({
      paciente_id: agendamento.paciente_id,
      data: agendamento.data,
      hora: agendamento.hora,
      tipo: agendamento.tipo,
      observacoes: agendamento.observacoes || ''
    });
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setFormEdicao({
      paciente_id: '',
      data: '',
      hora: '',
      tipo: '',
      observacoes: ''
    });
  };

  const handleSalvarEdicao = async () => {
    if (!podeEditar) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Validar formulário
      if (!formEdicao.paciente_id || !formEdicao.data || !formEdicao.hora) {
        throw new Error('Preencha todos os campos obrigatórios.');
      }
      
      // Formatar data e hora
      const dataHora = `${formEdicao.data}T${formEdicao.hora}:00`;
      
      // Atualizar agendamento
      const { error } = await supabase
        .from('agendamentos')
        .update({
          paciente_id: formEdicao.paciente_id,
          data: formEdicao.data,
          hora: formEdicao.hora,
          data_hora: dataHora,
          tipo: formEdicao.tipo,
          observacoes: formEdicao.observacoes,
          updated_at: new Date().toISOString(),
          updated_by: profile.id
        })
        .eq('id', editandoId);

      if (error) throw error;
      
      setSuccess('Agendamento atualizado com sucesso!');
      
      // Limpar formulário de edição
      handleCancelarEdicao();
      
      // Atualizar lista de agendamentos
      await handleBuscar();
      
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error.message);
      setError('Erro ao atualizar agendamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id) => {
    if (!podeEditar) return;
    
    if (!window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Agendamento excluído com sucesso!');
      
      // Atualizar lista de agendamentos
      await handleBuscar();
      
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error.message);
      setError('Erro ao excluir agendamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatar data
  const formatarData = (dataString) => {
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Agendamentos</h1>
      
      {error && (
        <div className="alert alert-danger mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-4">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulário de novo agendamento */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Novo Agendamento</h2>
          </div>
          
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="paciente_id">Paciente</label>
                <select
                  id="paciente_id"
                  name="paciente_id"
                  className="form-control"
                  value={formData.paciente_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="data">Data</label>
                  <div className="flex items-center">
                    <FiCalendar className="mr-2 text-secondary" />
                    <input
                      type="date"
                      id="data"
                      name="data"
                      className="form-control"
                      value={formData.data}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="hora">Hora</label>
                  <div className="flex items-center">
                    <FiClock className="mr-2 text-secondary" />
                    <input
                      type="time"
                      id="hora"
                      name="hora"
                      className="form-control"
                      value={formData.hora}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="tipo">Tipo</label>
                <select
                  id="tipo"
                  name="tipo"
                  className="form-control"
                  value={formData.tipo}
                  onChange={handleFormChange}
                >
                  <option value="visita">Visita</option>
                  <option value="consulta">Consulta</option>
                  <option value="procedimento">Procedimento</option>
                  <option value="exame">Exame</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="observacoes">Observações</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  className="form-control"
                  value={formData.observacoes}
                  onChange={handleFormChange}
                  rows={3}
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary mt-4"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Agendar'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Filtros de busca */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Buscar Agendamentos</h2>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="busca_paciente_id">Paciente</label>
              <select
                id="busca_paciente_id"
                name="paciente_id"
                className="form-control"
                value={busca.paciente_id}
                onChange={handleBuscaChange}
              >
                <option value="">Todos os pacientes</option>
                {pacientes.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="busca_data_inicio">Data Inicial</label>
                <div className="flex items-center">
                  <FiCalendar className="mr-2 text-secondary" />
                  <input
                    type="date"
                    id="busca_data_inicio"
                    name="data_inicio"
                    className="form-control"
                    value={busca.data_inicio}
                    onChange={handleBuscaChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="busca_data_fim">Data Final</label>
                <div className="flex items-center">
                  <FiCalendar className="mr-2 text-secondary" />
                  <input
                    type="date"
                    id="busca_data_fim"
                    name="data_fim"
                    className="form-control"
                    value={busca.data_fim}
                    onChange={handleBuscaChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="busca_tipo">Tipo</label>
              <select
                id="busca_tipo"
                name="tipo"
                className="form-control"
                value={busca.tipo}
                onChange={handleBuscaChange}
              >
                <option value="">Todos os tipos</option>
                <option value="visita">Visita</option>
                <option value="consulta">Consulta</option>
                <option value="procedimento">Procedimento</option>
                <option value="exame">Exame</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={handleBuscar}
              disabled={loading}
            >
              <FiSearch className="mr-2" />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Lista de agendamentos */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title">Agendamentos</h2>
          <div className="card-subtitle">
            {busca.data_inicio && busca.data_fim ? (
              <span>
                Período: {formatarData(busca.data_inicio)} a {formatarData(busca.data_fim)}
              </span>
            ) : (
              <span>Próximos agendamentos</span>
            )}
          </div>
        </div>
        
        {loading && agendamentos.length === 0 ? (
          <div className="text-center p-4">Carregando agendamentos...</div>
        ) : agendamentos.length === 0 ? (
          <div className="text-center p-4">
            Nenhum agendamento encontrado para o período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Observações</th>
                  {podeEditar && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {agendamentos.map(agendamento => (
                  <tr key={agendamento.id}>
                    <td>{formatarData(agendamento.data)}</td>
                    <td>{agendamento.hora}</td>
                    <td>{agendamento.pacientes?.nome}</td>
                    <td>
                      <span className={`badge badge-${
                        agendamento.tipo === 'visita' ? 'primary' : 
                        agendamento.tipo === 'consulta' ? 'success' : 
                        agendamento.tipo === 'procedimento' ? 'warning' : 
                        agendamento.tipo === 'exame' ? 'info' : 'secondary'
                      }`}>
                        {agendamento.tipo}
                      </span>
                    </td>
                    <td>{agendamento.observacoes || '-'}</td>
                    {podeEditar && (
                      <td>
                        {editandoId === agendamento.id ? (
                          <div className="flex">
                            <button
                              className="btn btn-sm btn-success mr-1"
                              onClick={handleSalvarEdicao}
                              disabled={loading}
                            >
                              <FiSave size={16} />
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={handleCancelarEdicao}
                              disabled={loading}
                            >
                              <FiX size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex">
                            <button
                              className="btn btn-sm btn-primary mr-1"
                              onClick={() => handleEditarClick(agendamento)}
                              disabled={loading || editandoId !== null}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleExcluir(agendamento.id)}
                              disabled={loading}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Formulário de edição */}
        {editandoId && (
          <div className="card-body border-t">
            <h3 className="text-lg font-semibold mb-4">Editar Agendamento</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="edicao_paciente_id">Paciente</label>
                <select
                  id="edicao_paciente_id"
                  name="paciente_id"
                  className="form-control"
                  value={formEdicao.paciente_id}
                  onChange={handleEdicaoChange}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="edicao_tipo">Tipo</label>
                <select
                  id="edicao_tipo"
                  name="tipo"
                  className="form-control"
                  value={formEdicao.tipo}
                  onChange={handleEdicaoChange}
                >
                  <option value="visita">Visita</option>
                  <option value="consulta">Consulta</option>
                  <option value="procedimento">Procedimento</option>
                  <option value="exame">Exame</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="edicao_data">Data</label>
                <div className="flex items-center">
                  <FiCalendar className="mr-2 text-secondary" />
                  <input
                    type="date"
                    id="edicao_data"
                    name="data"
                    className="form-control"
                    value={formEdicao.data}
                    onChange={handleEdicaoChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="edicao_hora">Hora</label>
                <div className="flex items-center">
                  <FiClock className="mr-2 text-secondary" />
                  <input
                    type="time"
                    id="edicao_hora"
                    name="hora"
                    className="form-control"
                    value={formEdicao.hora}
                    onChange={handleEdicaoChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group md:col-span-2">
                <label htmlFor="edicao_observacoes">Observações</label>
                <textarea
                  id="edicao_observacoes"
                  name="observacoes"
                  className="form-control"
                  value={formEdicao.observacoes}
                  onChange={handleEdicaoChange}
                  rows={3}
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <button
                className="btn btn-outline mr-2"
                onClick={handleCancelarEdicao}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSalvarEdicao}
                disabled={loading}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Agendamentos;
