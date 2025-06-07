import React, { useState, useEffect } from 'react';
import { FiActivity, FiSearch, FiCalendar } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import RegistroSinais from '../components/RegistroSinais';

const SinaisVitais = () => {
  const [pacientes, setPacientes] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    fetchPacientes();
  }, []);

  useEffect(() => {
    if (selectedPaciente || searchTerm || (dateRange.start && dateRange.end)) {
      fetchRegistros();
    }
  }, [selectedPaciente, dateRange, searchTerm]);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('sinais_vitais')
        .select(`
          *,
          pacientes:paciente_id (nome)
        `)
        .order('data_hora', { ascending: false });
      
      if (selectedPaciente) {
        query = query.eq('paciente_id', selectedPaciente);
      }
      
      if (dateRange.start && dateRange.end) {
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        
        query = query
          .gte('data_hora', startDate.toISOString())
          .lte('data_hora', endDate.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filtrar por termo de busca se existir
      let filteredData = data || [];
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(registro => 
          registro.pacientes?.nome.toLowerCase().includes(term) ||
          registro.observacoes?.toLowerCase().includes(term)
        );
      }
      
      setRegistros(filteredData);
    } catch (error) {
      console.error('Erro ao carregar registros:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Sinais Vitais</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <RegistroSinais />
        </div>
        
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Histórico de Registros</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="form-group flex-1">
              <label htmlFor="searchTerm">Buscar</label>
              <div className="flex items-center">
                <FiSearch className="mr-2 text-secondary" />
                <input
                  type="text"
                  id="searchTerm"
                  className="form-control"
                  placeholder="Buscar por paciente ou observações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-group" style={{ minWidth: '200px' }}>
              <label htmlFor="selectedPaciente">Paciente</label>
              <select
                id="selectedPaciente"
                className="form-control"
                value={selectedPaciente}
                onChange={(e) => setSelectedPaciente(e.target.value)}
              >
                <option value="">Todos os pacientes</option>
                {pacientes.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="form-group flex-1">
              <label htmlFor="start">Data Inicial</label>
              <div className="flex items-center">
                <FiCalendar className="mr-2 text-secondary" />
                <input
                  type="date"
                  id="start"
                  name="start"
                  className="form-control"
                  value={dateRange.start}
                  onChange={handleDateChange}
                />
              </div>
            </div>
            
            <div className="form-group flex-1">
              <label htmlFor="end">Data Final</label>
              <div className="flex items-center">
                <FiCalendar className="mr-2 text-secondary" />
                <input
                  type="date"
                  id="end"
                  name="end"
                  className="form-control"
                  value={dateRange.end}
                  onChange={handleDateChange}
                />
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center p-4">Carregando registros...</div>
          ) : registros.length === 0 ? (
            <div className="text-center p-4">Nenhum registro encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Paciente</th>
                    <th>Pressão</th>
                    <th>Temp.</th>
                    <th>FC</th>
                    <th>Sat. O₂</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(registro => (
                    <tr key={registro.id}>
                      <td>{formatDate(registro.data_hora)}</td>
                      <td>{registro.pacientes?.nome}</td>
                      <td>{registro.pressao_arterial || '-'}</td>
                      <td>{registro.temperatura ? `${registro.temperatura} °C` : '-'}</td>
                      <td>{registro.frequencia_cardiaca ? `${registro.frequencia_cardiaca} bpm` : '-'}</td>
                      <td>{registro.saturacao ? `${registro.saturacao}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SinaisVitais;
