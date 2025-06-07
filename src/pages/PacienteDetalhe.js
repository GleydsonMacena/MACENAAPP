import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import PacienteForm from '../components/PacienteForm';
import RegistroSinais from '../components/RegistroSinais';
import { supabase } from '../lib/supabaseClient';

const PacienteDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sinaisVitais, setSinaisVitais] = useState([]);
  const [loadingSinais, setLoadingSinais] = useState(false);

  const isNewPaciente = id === 'novo';

  useEffect(() => {
    if (!isNewPaciente) {
      fetchPaciente();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (paciente && activeTab === 'sinais') {
      fetchSinaisVitais();
    }
  }, [paciente, activeTab]);

  const fetchPaciente = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPaciente(data);
    } catch (error) {
      console.error('Erro ao carregar paciente:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSinaisVitais = async () => {
    try {
      setLoadingSinais(true);
      const { data, error } = await supabase
        .from('sinais_vitais')
        .select('*')
        .eq('paciente_id', id)
        .order('data_hora', { ascending: false });

      if (error) throw error;
      setSinaisVitais(data || []);
    } catch (error) {
      console.error('Erro ao carregar sinais vitais:', error.message);
    } finally {
      setLoadingSinais(false);
    }
  };

  const handleSave = () => {
    if (isNewPaciente) {
      navigate('/pacientes');
    } else {
      fetchPaciente();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  };

  if (loading) {
    return <div className="text-center p-4">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link to="/pacientes" className="btn btn-secondary">
          <FiArrowLeft /> Voltar
        </Link>
        <h1 className="text-xl font-bold">
          {isNewPaciente ? 'Novo Paciente' : `Paciente: ${paciente?.nome}`}
        </h1>
      </div>

      {!isNewPaciente && (
        <div className="mb-4">
          <div className="flex border-b">
            <button
              className={`px-4 py-2 ${activeTab === 'info' ? 'border-b-2 border-primary font-semibold' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              Informações
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'sinais' ? 'border-b-2 border-primary font-semibold' : ''}`}
              onClick={() => setActiveTab('sinais')}
            >
              Sinais Vitais
            </button>
          </div>
        </div>
      )}

      {(isNewPaciente || activeTab === 'info') && (
        <PacienteForm pacienteId={isNewPaciente ? null : id} onSave={handleSave} />
      )}

      {!isNewPaciente && activeTab === 'sinais' && (
        <div>
          <RegistroSinais pacienteId={id} />
          
          <div className="card mt-4">
            <div className="card-header">
              <h3 className="card-title">Histórico de Sinais Vitais</h3>
            </div>
            
            {loadingSinais ? (
              <div className="text-center p-4">Carregando histórico...</div>
            ) : sinaisVitais.length === 0 ? (
              <div className="text-center p-4">Nenhum registro encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Pressão Arterial</th>
                      <th>Temperatura</th>
                      <th>FC</th>
                      <th>FR</th>
                      <th>Sat. O₂</th>
                      <th>Glicemia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sinaisVitais.map(registro => (
                      <tr key={registro.id}>
                        <td>{formatDate(registro.data_hora)}</td>
                        <td>{registro.pressao_arterial || '-'}</td>
                        <td>{registro.temperatura ? `${registro.temperatura} °C` : '-'}</td>
                        <td>{registro.frequencia_cardiaca ? `${registro.frequencia_cardiaca} bpm` : '-'}</td>
                        <td>{registro.frequencia_respiratoria ? `${registro.frequencia_respiratoria} irpm` : '-'}</td>
                        <td>{registro.saturacao ? `${registro.saturacao}%` : '-'}</td>
                        <td>{registro.glicemia ? `${registro.glicemia} mg/dL` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PacienteDetalhe;
