import React, { useState, useEffect } from 'react';
import { FiSave, FiUser, FiPhone, FiMapPin, FiCreditCard } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';

const PacienteForm = ({ pacienteId, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [paciente, setPaciente] = useState({
    nome: '',
    idade: '',
    telefone: '',
    endereco: '',
    convenio: '',
    categoria: 'domiciliar', // Valor padrão: domiciliar, hospitalar, freelancer
    observacoes: ''
  });

  useEffect(() => {
    if (pacienteId) {
      fetchPaciente();
    }
  }, [pacienteId]);

  const fetchPaciente = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', pacienteId)
        .single();

      if (error) throw error;
      if (data) setPaciente(data);
    } catch (error) {
      setMessage({ type: 'danger', text: 'Erro ao carregar dados do paciente: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPaciente(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Validação básica
      if (!paciente.nome || !paciente.telefone || !paciente.categoria) {
        setMessage({ type: 'danger', text: 'Por favor, preencha todos os campos obrigatórios.' });
        return;
      }

      let result;
      if (pacienteId) {
        // Atualizar paciente existente
        result = await supabase
          .from('pacientes')
          .update(paciente)
          .eq('id', pacienteId);
      } else {
        // Criar novo paciente
        result = await supabase
          .from('pacientes')
          .insert([paciente]);
      }

      if (result.error) throw result.error;
      
      setMessage({ type: 'success', text: 'Paciente salvo com sucesso!' });
      if (onSave) onSave();
      
      // Limpar formulário se for novo paciente
      if (!pacienteId) {
        setPaciente({
          nome: '',
          idade: '',
          telefone: '',
          endereco: '',
          convenio: '',
          categoria: 'domiciliar',
          observacoes: ''
        });
      }
    } catch (error) {
      setMessage({ type: 'danger', text: 'Erro ao salvar paciente: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{pacienteId ? 'Editar Paciente' : 'Novo Paciente'}</h2>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nome">Nome Completo*</label>
          <div className="flex items-center">
            <FiUser className="mr-2 text-secondary" />
            <input
              type="text"
              id="nome"
              name="nome"
              className="form-control"
              value={paciente.nome}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="idade">Idade</label>
          <input
            type="number"
            id="idade"
            name="idade"
            className="form-control"
            value={paciente.idade}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="telefone">Telefone*</label>
          <div className="flex items-center">
            <FiPhone className="mr-2 text-secondary" />
            <input
              type="tel"
              id="telefone"
              name="telefone"
              className="form-control"
              value={paciente.telefone}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="endereco">Endereço Completo</label>
          <div className="flex items-center">
            <FiMapPin className="mr-2 text-secondary" />
            <input
              type="text"
              id="endereco"
              name="endereco"
              className="form-control"
              value={paciente.endereco}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="convenio">Convênio</label>
          <div className="flex items-center">
            <FiCreditCard className="mr-2 text-secondary" />
            <input
              type="text"
              id="convenio"
              name="convenio"
              className="form-control"
              value={paciente.convenio}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="categoria">Categoria de Atendimento*</label>
          <select
            id="categoria"
            name="categoria"
            className="form-control"
            value={paciente.categoria}
            onChange={handleChange}
            required
          >
            <option value="domiciliar">Atendimento Domiciliar</option>
            <option value="hospitalar">Atendimento Hospitalar</option>
            <option value="freelancer">Atendimento Freelancer</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="observacoes">Observações</label>
          <textarea
            id="observacoes"
            name="observacoes"
            className="form-control"
            rows="4"
            value={paciente.observacoes}
            onChange={handleChange}
          ></textarea>
        </div>
        
        <button 
          type="submit" 
          className="btn-save" 
          disabled={loading}
        >
          <FiSave />
          {loading ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>
    </div>
  );
};

export default PacienteForm;
