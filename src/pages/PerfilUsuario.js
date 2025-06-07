import React, { useState, useEffect } from 'react';
import { FiUser, FiCamera, FiSave, FiPhone, FiMail, FiMapPin, FiClipboard } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { CryptManager } from '../utils/CryptManager';

const PerfilUsuario = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para o formulário
  const [formData, setFormData] = useState({
    nome: '',
    idade: '',
    endereco: '',
    telefone: '',
    email: '',
    registro_profissional: '',
    funcao: ''
  });
  
  // Estado para upload de foto
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  useEffect(() => {
    if (profile) {
      setFormData({
        nome: profile.nome || '',
        idade: profile.idade || '',
        endereco: profile.endereco || '',
        telefone: profile.telefone || '',
        email: profile.email || user?.email || '',
        registro_profissional: profile.registro_profissional || '',
        funcao: profile.funcao || ''
      });
      
      if (profile.avatar_url) {
        setFotoPreview(profile.avatar_url);
      }
    }
  }, [profile, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFotoChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    const fileReader = new FileReader();
    
    fileReader.onload = (e) => {
      setFotoPreview(e.target.result);
    };
    
    fileReader.readAsDataURL(file);
    setFoto(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      setLoading(true);
      
      // Validar formulário
      if (!formData.nome) {
        throw new Error('O nome é obrigatório.');
      }
      
      // Atualizar perfil
      const updates = {
        nome: formData.nome,
        idade: formData.idade || null,
        endereco: CryptManager.encrypt(formData.endereco || ''),
        telefone: formData.telefone || null,
        email: formData.email || user?.email || null,
        registro_profissional: formData.registro_profissional || null,
        funcao: formData.funcao || null,
        updated_at: new Date().toISOString()
      };
      
      const { error: updateError } = await supabase
        .from('perfis')
        .update(updates)
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      // Upload de foto, se houver
      if (foto) {
        setUploading(true);
        
        // Gerar nome único para o arquivo
        const fileExt = foto.name.split('.').pop();
        const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        
        // Upload para o storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, foto);
          
        if (uploadError) throw uploadError;
        
        // Obter URL pública
        const { data: urlData } = await supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
          
        const avatarUrl = urlData.publicUrl;
        
        // Atualizar perfil com URL da foto
        const { error: avatarError } = await supabase
          .from('perfis')
          .update({ avatar_url: avatarUrl })
          .eq('id', profile.id);
          
        if (avatarError) throw avatarError;
        
        setUploading(false);
      }
      
      setSuccess('Perfil atualizado com sucesso!');
      
      // Atualizar perfil no contexto
      await refreshProfile();
      
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error.message);
      setError('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Meu Perfil</h2>
      </div>
      
      <div className="card-body">
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
        
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3 mb-6 md:mb-0 flex flex-col items-center">
              <div className="avatar-upload">
                <div className="avatar-preview">
                  {fotoPreview ? (
                    <img
                      src={fotoPreview}
                      alt="Avatar"
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      <FiUser size={64} />
                    </div>
                  )}
                </div>
                
                <label htmlFor="avatar-input" className="avatar-edit-btn">
                  <FiCamera size={20} />
                  <span className="ml-2">Alterar foto</span>
                </label>
                
                <input
                  type="file"
                  id="avatar-input"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
              </div>
              
              <div className="text-center mt-4">
                <p className="text-sm text-gray-500">
                  Clique na imagem para alterar sua foto de perfil
                </p>
              </div>
            </div>
            
            <div className="md:w-2/3 md:pl-6">
              <div className="form-group">
                <label htmlFor="nome">
                  <FiUser className="inline mr-2" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  className="form-control"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="email">
                    <FiMail className="inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="telefone">
                    <FiPhone className="inline mr-2" />
                    Telefone
                  </label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    className="form-control"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="idade">Idade</label>
                  <input
                    type="number"
                    id="idade"
                    name="idade"
                    className="form-control"
                    value={formData.idade}
                    onChange={handleChange}
                    min="18"
                    max="100"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="registro_profissional">
                    <FiClipboard className="inline mr-2" />
                    Registro Profissional (COREM)
                  </label>
                  <input
                    type="text"
                    id="registro_profissional"
                    name="registro_profissional"
                    className="form-control"
                    value={formData.registro_profissional}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="funcao">Função</label>
                  <select
                    id="funcao"
                    name="funcao"
                    className="form-control"
                    value={formData.funcao}
                    onChange={handleChange}
                  >
                    <option value="">Selecione uma função</option>
                    <option value="enfermeiro">Enfermeiro(a)</option>
                    <option value="tecnico">Técnico(a) de Enfermagem</option>
                    <option value="cuidador">Cuidador(a)</option>
                    <option value="gestor">Gestor(a)</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                
                <div className="form-group md:col-span-2">
                  <label htmlFor="endereco">
                    <FiMapPin className="inline mr-2" />
                    Endereço
                  </label>
                  <textarea
                    id="endereco"
                    name="endereco"
                    className="form-control"
                    value={formData.endereco}
                    onChange={handleChange}
                    rows={3}
                  ></textarea>
                </div>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary mt-4"
                disabled={loading || uploading}
              >
                <FiSave className="mr-2" />
                {loading || uploading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PerfilUsuario;
