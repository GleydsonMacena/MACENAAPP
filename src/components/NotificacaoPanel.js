import React, { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiX, FiUser, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const NotificacaoPanel = () => {
  const { user, profile } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [cadastrosPendentes, setCadastrosPendentes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [contadorNaoLidas, setContadorNaoLidas] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Verificar se o usuário é administrador
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (user) {
      fetchNotificacoes();
      
      // Se for admin, buscar cadastros pendentes
      if (isAdmin) {
        fetchCadastrosPendentes();
      }
      
      // Configurar subscription para notificações em tempo real
      const notificacoesSubscription = supabase
        .channel('notificacoes_changes')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notificacoes',
            filter: isAdmin ? undefined : `user_id=eq.${user.id}`
          }, 
          (payload) => {
            // Atualizar lista de notificações quando uma nova for inserida
            fetchNotificacoes();
          }
        )
        .subscribe();
        
      // Se for admin, configurar subscription para cadastros pendentes
      let cadastrosSubscription;
      if (isAdmin) {
        cadastrosSubscription = supabase
          .channel('cadastros_pendentes_changes')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'cadastros_pendentes',
              filter: `status=eq.pendente`
            }, 
            (payload) => {
              // Atualizar lista de cadastros pendentes
              fetchCadastrosPendentes();
            }
          )
          .subscribe();
      }
      
      // Cleanup subscriptions
      return () => {
        supabase.removeChannel(notificacoesSubscription);
        if (cadastrosSubscription) {
          supabase.removeChannel(cadastrosSubscription);
        }
      };
    }
  }, [user, isAdmin]);

  const fetchNotificacoes = async () => {
    try {
      setLoading(true);
      
      // Buscar notificações para o usuário atual ou para todos os admins
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('data', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      setNotificacoes(data || []);
      
      // Contar notificações não lidas
      const naoLidas = (data || []).filter(n => !n.lida).length;
      setContadorNaoLidas(naoLidas);
      
    } catch (error) {
      console.error('Erro ao buscar notificações:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCadastrosPendentes = async () => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('cadastros_pendentes')
        .select('*')
        .eq('status', 'pendente')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCadastrosPendentes(data || []);
      
    } catch (error) {
      console.error('Erro ao buscar cadastros pendentes:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLida = async (id) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);
      
      if (error) throw error;
      
      // Atualizar lista de notificações
      setNotificacoes(prev => 
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
      
      // Atualizar contador
      setContadorNaoLidas(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error.message);
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq('lida', false);
      
      if (error) throw error;
      
      // Atualizar lista de notificações
      setNotificacoes(prev => 
        prev.map(n => ({ ...n, lida: true }))
      );
      
      // Zerar contador
      setContadorNaoLidas(0);
      
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error.message);
    }
  };

  const aprovarCadastro = async (cadastroId, userId) => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      
      // 1. Atualizar status do cadastro pendente
      const { error: updateError } = await supabase
        .from('cadastros_pendentes')
        .update({ 
          status: 'aprovado',
          updated_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', cadastroId);
      
      if (updateError) throw updateError;
      
      // 2. Criar perfil do usuário com role 'cuidador' (padrão)
      const cadastro = cadastrosPendentes.find(c => c.id === cadastroId);
      
      if (!cadastro) throw new Error('Cadastro não encontrado');
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: userId,
            nome: cadastro.nome,
            email: cadastro.email,
            telefone: cadastro.telefone,
            role: 'cuidador', // Papel padrão para novos usuários
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      
      if (profileError) throw profileError;
      
      // 3. Enviar notificação para o usuário
      const { error: notificationError } = await supabase
        .from('notificacoes')
        .insert([
          {
            tipo: 'cadastro_aprovado',
            titulo: 'Cadastro aprovado',
            mensagem: 'Seu cadastro foi aprovado. Você já pode acessar o sistema.',
            data: new Date().toISOString(),
            lida: false,
            user_id: userId
          }
        ]);
      
      if (notificationError) throw notificationError;
      
      // Atualizar lista de cadastros pendentes
      setCadastrosPendentes(prev => 
        prev.filter(c => c.id !== cadastroId)
      );
      
      setMessage({ type: 'success', text: 'Cadastro aprovado com sucesso!' });
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao aprovar cadastro:', error.message);
      setMessage({ type: 'danger', text: 'Erro ao aprovar cadastro: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const recusarCadastro = async (cadastroId, userId) => {
    if (!isAdmin) return;
    
    try {
      setLoading(true);
      
      // 1. Atualizar status do cadastro pendente
      const { error: updateError } = await supabase
        .from('cadastros_pendentes')
        .update({ 
          status: 'recusado',
          updated_at: new Date().toISOString(),
          approved_by: user.id
        })
        .eq('id', cadastroId);
      
      if (updateError) throw updateError;
      
      // 2. Enviar notificação para o usuário
      const { error: notificationError } = await supabase
        .from('notificacoes')
        .insert([
          {
            tipo: 'cadastro_recusado',
            titulo: 'Cadastro recusado',
            mensagem: 'Seu cadastro foi recusado. Entre em contato com o administrador para mais informações.',
            data: new Date().toISOString(),
            lida: false,
            user_id: userId
          }
        ]);
      
      if (notificationError) throw notificationError;
      
      // Atualizar lista de cadastros pendentes
      setCadastrosPendentes(prev => 
        prev.filter(c => c.id !== cadastroId)
      );
      
      setMessage({ type: 'success', text: 'Cadastro recusado com sucesso!' });
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao recusar cadastro:', error.message);
      setMessage({ type: 'danger', text: 'Erro ao recusar cadastro: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR');
  };

  return (
    <div className="notificacao-container">
      {/* Ícone de sino com contador */}
      <button 
        className="notificacao-icon"
        onClick={() => setShowPanel(!showPanel)}
      >
        <FiBell size={24} />
        {contadorNaoLidas > 0 && (
          <span className="notificacao-badge">{contadorNaoLidas}</span>
        )}
      </button>
      
      {/* Painel de notificações */}
      {showPanel && (
        <div className="notificacao-panel">
          <div className="notificacao-header">
            <h3>Notificações</h3>
            {contadorNaoLidas > 0 && (
              <button 
                className="btn btn-sm btn-outline"
                onClick={marcarTodasComoLidas}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          
          {message.text && (
            <div className={`alert alert-${message.type} mb-3`}>
              {message.text}
            </div>
          )}
          
          {/* Seção de cadastros pendentes (apenas para admin) */}
          {isAdmin && cadastrosPendentes.length > 0 && (
            <div className="cadastros-pendentes-section">
              <h4 className="section-title">Cadastros Pendentes</h4>
              
              {cadastrosPendentes.map(cadastro => (
                <div key={cadastro.id} className="cadastro-pendente-item">
                  <div className="cadastro-info">
                    <div className="user-icon">
                      <FiUser size={20} />
                    </div>
                    <div className="user-details">
                      <div className="user-name">{cadastro.nome}</div>
                      <div className="user-email">{cadastro.email}</div>
                      <div className="user-date">
                        Solicitado em: {formatarData(cadastro.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="cadastro-actions">
                    <button 
                      className="btn btn-sm btn-success"
                      onClick={() => aprovarCadastro(cadastro.id, cadastro.user_id)}
                      disabled={loading}
                    >
                      <FiCheck size={16} />
                      Aprovar
                    </button>
                    
                    <button 
                      className="btn btn-sm btn-danger ml-2"
                      onClick={() => recusarCadastro(cadastro.id, cadastro.user_id)}
                      disabled={loading}
                    >
                      <FiX size={16} />
                      Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Lista de notificações */}
          <div className="notificacoes-list">
            <h4 className="section-title">Histórico</h4>
            
            {loading && notificacoes.length === 0 ? (
              <div className="loading-message">Carregando notificações...</div>
            ) : notificacoes.length === 0 ? (
              <div className="empty-message">Nenhuma notificação encontrada.</div>
            ) : (
              notificacoes.map(notificacao => (
                <div 
                  key={notificacao.id} 
                  className={`notificacao-item ${!notificacao.lida ? 'nao-lida' : ''}`}
                  onClick={() => marcarComoLida(notificacao.id)}
                >
                  <div className="notificacao-icon">
                    {notificacao.tipo === 'cadastro_pendente' && <FiUser size={20} />}
                    {notificacao.tipo === 'cadastro_aprovado' && <FiCheck size={20} />}
                    {notificacao.tipo === 'cadastro_recusado' && <FiX size={20} />}
                    {notificacao.tipo === 'alerta' && <FiAlertCircle size={20} />}
                  </div>
                  
                  <div className="notificacao-content">
                    <div className="notificacao-titulo">{notificacao.titulo}</div>
                    <div className="notificacao-mensagem">{notificacao.mensagem}</div>
                    <div className="notificacao-data">{formatarData(notificacao.data)}</div>
                  </div>
                  
                  {!notificacao.lida && (
                    <div className="notificacao-status"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificacaoPanel;
