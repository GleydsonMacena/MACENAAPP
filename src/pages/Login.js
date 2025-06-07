import React, { useState } from 'react';
import { FiUser, FiLock, FiMail, FiPhone, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Estados para o formulário de cadastro
  const [registerForm, setRegisterForm] = useState({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: ''
  });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn({ email, password });
      
      if (error) throw error;
      
      navigate('/dashboard');
    } catch (error) {
      setError('Falha no login. Verifique seu email e senha.');
      console.error('Erro de login:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setLoading(true);

    // Validar formulário
    if (registerForm.senha !== registerForm.confirmarSenha) {
      setRegisterError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    if (registerForm.senha.length < 6) {
      setRegisterError('A senha deve ter pelo menos 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // 1. Registrar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: registerForm.email,
        password: registerForm.senha
      });

      if (authError) throw authError;

      // 2. Criar registro na tabela de solicitações pendentes
      const { error: profileError } = await supabase
        .from('cadastros_pendentes')
        .insert([
          {
            user_id: authData.user.id,
            nome: registerForm.nome,
            email: registerForm.email,
            telefone: registerForm.telefone,
            status: 'pendente',
            created_at: new Date().toISOString()
          }
        ]);

      if (profileError) throw profileError;

      // 3. Enviar notificação para administradores
      const { error: notificationError } = await supabase
        .from('notificacoes')
        .insert([
          {
            tipo: 'cadastro_pendente',
            titulo: 'Novo cadastro pendente',
            mensagem: `${registerForm.nome} solicitou acesso ao sistema.`,
            data: new Date().toISOString(),
            lida: false,
            user_id: null, // null indica que é para todos os administradores
            dados_adicionais: JSON.stringify({
              solicitante_id: authData.user.id,
              solicitante_nome: registerForm.nome,
              solicitante_email: registerForm.email
            })
          }
        ]);

      if (notificationError) throw notificationError;

      // Limpar formulário e mostrar mensagem de sucesso
      setRegisterForm({
        nome: '',
        email: '',
        telefone: '',
        senha: '',
        confirmarSenha: ''
      });

      setRegisterSuccess('Cadastro realizado com sucesso! Aguarde a aprovação do administrador para acessar o sistema.');
      
      // Voltar para a tela de login após 5 segundos
      setTimeout(() => {
        setShowRegister(false);
        setRegisterSuccess('');
      }, 5000);

    } catch (error) {
      console.error('Erro ao registrar:', error.message);
      setRegisterError('Erro ao realizar cadastro. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <img src="/images/logo.jpeg" alt="Macena Health" className="login-logo" />
      
      <div className="login-card">
        <h1 className="login-title">Macena Health</h1>
        <h2 className="text-center mb-4">Cuidados domiciliares</h2>
        
        {!showRegister ? (
          // Formulário de Login
          <>
            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="flex items-center">
                  <FiUser className="mr-2 text-secondary" />
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Senha</label>
                <div className="flex items-center">
                  <FiLock className="mr-2 text-secondary" />
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary w-100 mt-4" 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            
            <div className="text-center mt-4">
              <button 
                onClick={() => setShowRegister(true)}
                className="btn btn-link"
              >
                Não tem uma conta? Cadastre-se
              </button>
            </div>
          </>
        ) : (
          // Formulário de Cadastro
          <>
            <h3 className="text-center mb-4">Cadastro de Funcionário</h3>
            
            {registerError && (
              <div className="alert alert-danger">
                {registerError}
              </div>
            )}
            
            {registerSuccess && (
              <div className="alert alert-success">
                {registerSuccess}
              </div>
            )}
            
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label htmlFor="nome">Nome Completo</label>
                <div className="flex items-center">
                  <FiUser className="mr-2 text-secondary" />
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    className="form-control"
                    value={registerForm.nome}
                    onChange={handleRegisterChange}
                    required
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
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="telefone">Telefone</label>
                <div className="flex items-center">
                  <FiPhone className="mr-2 text-secondary" />
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    className="form-control"
                    value={registerForm.telefone}
                    onChange={handleRegisterChange}
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="senha">Senha</label>
                <div className="flex items-center">
                  <FiLock className="mr-2 text-secondary" />
                  <input
                    type="password"
                    id="senha"
                    name="senha"
                    className="form-control"
                    value={registerForm.senha}
                    onChange={handleRegisterChange}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmarSenha">Confirmar Senha</label>
                <div className="flex items-center">
                  <FiLock className="mr-2 text-secondary" />
                  <input
                    type="password"
                    id="confirmarSenha"
                    name="confirmarSenha"
                    className="form-control"
                    value={registerForm.confirmarSenha}
                    onChange={handleRegisterChange}
                    required
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary w-100 mt-4" 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Enviando...' : 'Cadastrar'}
              </button>
            </form>
            
            <div className="text-center mt-4">
              <button 
                onClick={() => setShowRegister(false)}
                className="btn btn-link"
              >
                Já tem uma conta? Faça login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
