import React, { useState, useEffect } from 'react';
import { FiPlus, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const PacientesLista = () => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchPacientes();
  }, []);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      let query = supabase.from('pacientes').select('*').order('nome');
      
      if (filtroCategoria) {
        query = query.eq('categoria', filtroCategoria);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setPacientes(data || []);
    } catch (error) {
      setMessage({ type: 'danger', text: 'Erro ao carregar pacientes: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este paciente?')) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setPacientes(pacientes.filter(p => p.id !== id));
      setMessage({ type: 'success', text: 'Paciente excluído com sucesso!' });
    } catch (error) {
      setMessage({ type: 'danger', text: 'Erro ao excluir paciente: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const filteredPacientes = pacientes.filter(paciente => 
    paciente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    paciente.telefone.includes(searchTerm) ||
    (paciente.convenio && paciente.convenio.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCategoriaLabel = (categoria) => {
    switch (categoria) {
      case 'domiciliar': return 'Domiciliar';
      case 'hospitalar': return 'Hospitalar';
      case 'freelancer': return 'Freelancer';
      default: return categoria;
    }
  };

  const getCategoriaClass = (categoria) => {
    switch (categoria) {
      case 'domiciliar': return 'category-domiciliar';
      case 'hospitalar': return 'category-hospitalar';
      case 'freelancer': return 'category-freelancer';
      default: return '';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Pacientes</h1>
        <Link to="/pacientes/novo" className="btn btn-primary flex items-center gap-2">
          <FiPlus /> Novo Paciente
        </Link>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type} mb-4`}>
          {message.text}
        </div>
      )}
      
      <div className="card mb-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="form-group flex-1">
            <div className="flex items-center">
              <FiSearch className="mr-2 text-secondary" />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nome, telefone ou convênio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="form-group" style={{ minWidth: '200px' }}>
            <select
              className="form-control"
              value={filtroCategoria}
              onChange={(e) => {
                setFiltroCategoria(e.target.value);
                fetchPacientes();
              }}
            >
              <option value="">Todas as categorias</option>
              <option value="domiciliar">Atendimento Domiciliar</option>
              <option value="hospitalar">Atendimento Hospitalar</option>
              <option value="freelancer">Atendimento Freelancer</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center p-4">Carregando pacientes...</div>
        ) : filteredPacientes.length === 0 ? (
          <div className="text-center p-4">Nenhum paciente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Telefone</th>
                  <th>Convênio</th>
                  <th>Categoria</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPacientes.map(paciente => (
                  <tr key={paciente.id}>
                    <td>{paciente.nome}</td>
                    <td>{paciente.telefone}</td>
                    <td>{paciente.convenio || '-'}</td>
                    <td>
                      <span className={`patient-category ${getCategoriaClass(paciente.categoria)}`}>
                        {getCategoriaLabel(paciente.categoria)}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link 
                          to={`/pacientes/${paciente.id}`} 
                          className="btn btn-secondary btn-sm"
                          title="Editar"
                        >
                          <FiEdit />
                        </Link>
                        <button 
                          onClick={() => handleDelete(paciente.id)} 
                          className="btn btn-danger btn-sm"
                          title="Excluir"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PacientesLista;
