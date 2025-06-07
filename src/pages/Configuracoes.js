import React, { useState } from 'react';
import { FiSave, FiUser, FiMail, FiLock, FiSettings } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

const Configuracoes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('perfil');
  
  const [perfilForm, setPerfilForm] = useState({
    nome: '',
    email: user?.email || '',
    telefone: ''
  });
  
  const [senhaForm, setSenhaForm] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  });
  
  const [configForm, setConfigForm] = useState({
    notificacoes_email: true,
    tema: 'claro',
    idioma: 'pt-BR'
  });

  const handlePerfilChange = (e) => {
    const { name, value } = e.target;
    setPerfilForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSenhaChange = (e) => {
    const { name, value } = e.target;
    setSenhaForm(prev => ({ ...prev, [name]: value }));
  };

  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfigForm(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handlePerfilSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      // Simulação de atualização de perfil
      // Em um ambiente real, isso seria conectado ao Supabase
      
      setTimeout(() => {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      setMessage({ type: 'danger', text: 'Erro ao atualizar perfil: ' + error.message });
      setLoading(false);
    }
  };

  const handleSenhaSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      // Validação
      if (senhaForm.nova_senha !== senhaForm.confirmar_senha) {
        setMessage({ type: 'danger', text: 'As senhas não coincidem.' });
        setLoading(false);
        return;
      }
      
      if (senhaForm.nova_senha.length < 6) {
        setMessage({ type: 'danger', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
        setLoading(false);
        return;
      }
      
      // Simulação de atualização de senha
      // Em um ambiente real, isso seria conectado ao Supabase
      
      setTimeout(() => {
        setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setSenhaForm({
          senha_atual: '',
          nova_senha: '',
          confirmar_senha: ''
        });
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      setMessage({ type: 'danger', text: 'Erro ao atualizar senha: ' + error.message });
      setLoading(false);
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      // Simulação de atualização de configurações
      // Em um ambiente real, isso seria conectado ao Supabase
      
      setTimeout(() => {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      setMessage({ type: 'danger', text: 'Erro ao salvar configurações: ' + error.message });
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Configurações</h1>
      
      <div className="card">
        <div className="mb-4">
          <div className="flex border-b">
            <button
              className={`px-4 py-2 ${activeTab === 'perfil' ? 'border-b-2 border-primary font-semibold' : ''}`}
              onClick={() => setActiveTab('perfil')}
            >
              Perfil
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'senha' ? 'border-b-2 border-primary font-semibold' : ''}`}
              onClick={() => setActiveTab('senha')}
            >
              Alterar Senha
            </button>
            <button
              className={`px-4 py-2 ${activeTab === 'config' ? 'border-b-2 border-primary font-semibold' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              Preferências
            </button>
          </div>
        </div>
        
        {message.text && (
          <div className={`alert alert-${message.type} mb-4`}>
            {message.text}
          </div>
        )}
        
        {activeTab === 'perfil' && (
          <form onSubmit={handlePerfilSubmit}>
            <div className="form-group">
              <label htmlFor="nome">Nome Completo</label>
              <div className="flex items-center">
                <FiUser className="mr-2 text-secondary" />
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  className="form-control"
                  value={perfilForm.nome}
                  onChange={handlePerfilChange}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="flex items-center">
                <FiMail className="mr-2 text-secondary" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-control"
                  value={perfilForm.email}
                  onChange={handlePerfilChange}
                  disabled
                />
              </div>
              <small className="text-sm text-gray-500">O email não pode ser alterado.</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="telefone">Telefone</label>
              <input
                type="tel"
                id="telefone"
                name="telefone"
                className="form-control"
                value={perfilForm.telefone}
                onChange={handlePerfilChange}
              />
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
        )}
        
        {activeTab === 'senha' && (
          <form onSubmit={handleSenhaSubmit}>
            <div className="form-group">
              <label htmlFor="senha_atual">Senha Atual</label>
              <div className="flex items-center">
                <FiLock className="mr-2 text-secondary" />
                <input
                  type="password"
                  id="senha_atual"
                  name="senha_atual"
                  className="form-control"
                  value={senhaForm.senha_atual}
                  onChange={handleSenhaChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="nova_senha">Nova Senha</label>
              <div className="flex items-center">
                <FiLock className="mr-2 text-secondary" />
                <input
                  type="password"
                  id="nova_senha"
                  name="nova_senha"
                  className="form-control"
                  value={senhaForm.nova_senha}
                  onChange={handleSenhaChange}
                  required
                />
              </div>
              <small className="text-sm text-gray-500">Mínimo de 6 caracteres.</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmar_senha">Confirmar Nova Senha</label>
              <div className="flex items-center">
                <FiLock className="mr-2 text-secondary" />
                <input
                  type="password"
                  id="confirmar_senha"
                  name="confirmar_senha"
                  className="form-control"
                  value={senhaForm.confirmar_senha}
                  onChange={handleSenhaChange}
                  required
                />
              </div>
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
        )}
        
        {activeTab === 'config' && (
          <form onSubmit={handleConfigSubmit}>
            <div className="form-group">
              <label htmlFor="tema">Tema</label>
              <select
                id="tema"
                name="tema"
                className="form-control"
                value={configForm.tema}
                onChange={handleConfigChange}
              >
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="idioma">Idioma</label>
              <select
                id="idioma"
                name="idioma"
                className="form-control"
                value={configForm.idioma}
                onChange={handleConfigChange}
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es">Español</option>
              </select>
            </div>
            
            <div className="form-group">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notificacoes_email"
                  name="notificacoes_email"
                  checked={configForm.notificacoes_email}
                  onChange={handleConfigChange}
                  className="mr-2"
                />
                <label htmlFor="notificacoes_email">Receber notificações por email</label>
              </div>
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
        )}
      </div>
    </div>
  );
};

export default Configuracoes;
