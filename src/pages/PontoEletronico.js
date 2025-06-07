import React, { useState, useEffect } from 'react';
import { FiClock, FiMapPin, FiPlay, FiPause, FiSave, FiList, FiCalendar } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const PontoEletronico = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para controle do ponto
  const [pontoAtivo, setPontoAtivo] = useState(false);
  const [inicioPonto, setInicioPonto] = useState(null);
  const [localizacaoInicio, setLocalizacaoInicio] = useState(null);
  const [localizacaoAtual, setLocalizacaoAtual] = useState(null);
  
  // Estado para histórico de pontos
  const [historicoPontos, setHistoricoPontos] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  
  // Estado para filtros de busca
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: ''
  });
  
  useEffect(() => {
    // Verificar se há um ponto ativo
    verificarPontoAtivo();
    
    // Carregar histórico de pontos
    carregarHistoricoPontos();
    
    // Obter localização atual
    obterLocalizacaoAtual();
  }, []);
  
  const verificarPontoAtivo = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('pontos_eletronicos')
        .select('*')
        .eq('user_id', user.id)
        .is('hora_fim', null)
        .order('hora_inicio', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setPontoAtivo(true);
        setInicioPonto(new Date(data.hora_inicio));
        setLocalizacaoInicio({
          latitude: data.latitude_inicio,
          longitude: data.longitude_inicio,
          endereco: data.endereco_inicio
        });
      }
    } catch (error) {
      console.error('Erro ao verificar ponto ativo:', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const carregarHistoricoPontos = async () => {
    try {
      setLoadingHistorico(true);
      
      // Definir período padrão (últimos 30 dias)
      const hoje = new Date();
      const ha30Dias = new Date();
      ha30Dias.setDate(hoje.getDate() - 30);
      
      const dataInicio = filtros.data_inicio || ha30Dias.toISOString().split('T')[0];
      const dataFim = filtros.data_fim || hoje.toISOString().split('T')[0];
      
      // Atualizar filtros com datas padrão
      if (!filtros.data_inicio || !filtros.data_fim) {
        setFiltros({
          data_inicio: dataInicio,
          data_fim: dataFim
        });
      }
      
      let query = supabase
        .from('pontos_eletronicos')
        .select('*')
        .eq('user_id', user.id)
        .order('hora_inicio', { ascending: false });
      
      if (dataInicio) {
        query = query.gte('hora_inicio', `${dataInicio}T00:00:00`);
      }
      
      if (dataFim) {
        // Adicionar um dia para incluir todo o dia final
        const proximoDia = new Date(dataFim);
        proximoDia.setDate(proximoDia.getDate() + 1);
        const dataFimFormatada = proximoDia.toISOString().split('T')[0];
        
        query = query.lt('hora_inicio', `${dataFimFormatada}T00:00:00`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setHistoricoPontos(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de pontos:', error.message);
      setError('Erro ao carregar histórico de pontos.');
    } finally {
      setLoadingHistorico(false);
    }
  };
  
  const obterLocalizacaoAtual = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Obter endereço a partir das coordenadas
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            
            const data = await response.json();
            const endereco = data.display_name;
            
            setLocalizacaoAtual({
              latitude,
              longitude,
              endereco
            });
          } catch (error) {
            console.error('Erro ao obter endereço:', error);
            setLocalizacaoAtual({
              latitude,
              longitude,
              endereco: 'Endereço não disponível'
            });
          }
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          setError('Não foi possível obter sua localização. Verifique as permissões do navegador.');
        }
      );
    } else {
      setError('Seu navegador não suporta geolocalização.');
    }
  };
  
  const handleIniciarPonto = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Verificar se a localização está disponível
      if (!localizacaoAtual) {
        throw new Error('Não foi possível obter sua localização. Tente novamente.');
      }
      
      // Registrar início do ponto
      const agora = new Date();
      
      const { data, error } = await supabase
        .from('pontos_eletronicos')
        .insert([
          {
            user_id: user.id,
            hora_inicio: agora.toISOString(),
            latitude_inicio: localizacaoAtual.latitude,
            longitude_inicio: localizacaoAtual.longitude,
            endereco_inicio: localizacaoAtual.endereco
          }
        ])
        .select();
      
      if (error) throw error;
      
      setPontoAtivo(true);
      setInicioPonto(agora);
      setLocalizacaoInicio(localizacaoAtual);
      
      setSuccess('Ponto iniciado com sucesso!');
      
      // Atualizar histórico
      await carregarHistoricoPontos();
    } catch (error) {
      console.error('Erro ao iniciar ponto:', error.message);
      setError('Erro ao iniciar ponto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFinalizarPonto = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      // Verificar se a localização está disponível
      if (!localizacaoAtual) {
        throw new Error('Não foi possível obter sua localização. Tente novamente.');
      }
      
      // Buscar o ponto ativo
      const { data: pontoAtual, error: errorBusca } = await supabase
        .from('pontos_eletronicos')
        .select('*')
        .eq('user_id', user.id)
        .is('hora_fim', null)
        .order('hora_inicio', { ascending: false })
        .limit(1)
        .single();
      
      if (errorBusca) throw errorBusca;
      
      // Registrar fim do ponto
      const agora = new Date();
      const inicio = new Date(pontoAtual.hora_inicio);
      
      // Calcular duração em horas
      const diferencaMs = agora.getTime() - inicio.getTime();
      const duracaoHoras = diferencaMs / (1000 * 60 * 60);
      
      const { error: errorUpdate } = await supabase
        .from('pontos_eletronicos')
        .update({
          hora_fim: agora.toISOString(),
          latitude_fim: localizacaoAtual.latitude,
          longitude_fim: localizacaoAtual.longitude,
          endereco_fim: localizacaoAtual.endereco,
          duracao_horas: duracaoHoras
        })
        .eq('id', pontoAtual.id);
      
      if (errorUpdate) throw errorUpdate;
      
      setPontoAtivo(false);
      setInicioPonto(null);
      setLocalizacaoInicio(null);
      
      setSuccess('Ponto finalizado com sucesso!');
      
      // Atualizar histórico
      await carregarHistoricoPontos();
    } catch (error) {
      console.error('Erro ao finalizar ponto:', error.message);
      setError('Erro ao finalizar ponto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleBuscar = () => {
    carregarHistoricoPontos();
  };
  
  // Formatar data e hora
  const formatarDataHora = (dataHoraString) => {
    if (!dataHoraString) return '-';
    const data = new Date(dataHoraString);
    return data.toLocaleString('pt-BR');
  };
  
  // Formatar duração
  const formatarDuracao = (duracaoHoras) => {
    if (!duracaoHoras && duracaoHoras !== 0) return '-';
    
    const horas = Math.floor(duracaoHoras);
    const minutos = Math.round((duracaoHoras - horas) * 60);
    
    return `${horas}h ${minutos}min`;
  };
  
  // Calcular tempo decorrido
  const calcularTempoDecorrido = () => {
    if (!inicioPonto) return '';
    
    const agora = new Date();
    const diferencaMs = agora.getTime() - inicioPonto.getTime();
    
    const horas = Math.floor(diferencaMs / (1000 * 60 * 60));
    const minutos = Math.floor((diferencaMs % (1000 * 60 * 60)) / (1000 * 60));
    const segundos = Math.floor((diferencaMs % (1000 * 60)) / 1000);
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
  };
  
  // Atualizar tempo decorrido a cada segundo
  const [tempoDecorrido, setTempoDecorrido] = useState('');
  
  useEffect(() => {
    let intervalId;
    
    if (pontoAtivo) {
      intervalId = setInterval(() => {
        setTempoDecorrido(calcularTempoDecorrido());
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pontoAtivo, inicioPonto]);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Ponto Eletrônico</h1>
      
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
        {/* Controle de Ponto */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Registrar Ponto</h2>
          </div>
          
          <div className="card-body">
            <div className="mb-6">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold mb-2">
                  {pontoAtivo ? tempoDecorrido : '00:00:00'}
                </div>
                <div className="text-sm text-gray-500">
                  {pontoAtivo ? 'Jornada em andamento' : 'Jornada não iniciada'}
                </div>
              </div>
              
              {pontoAtivo ? (
                <div className="bg-light p-3 rounded mb-4">
                  <div className="flex items-center mb-2">
                    <FiClock className="text-primary mr-2" />
                    <strong>Início:</strong>
                    <span className="ml-2">{formatarDataHora(inicioPonto?.toISOString())}</span>
                  </div>
                  
                  {localizacaoInicio && (
                    <div className="flex items-start mb-2">
                      <FiMapPin className="text-primary mr-2 mt-1" />
                      <div>
                        <strong>Local de início:</strong>
                        <div className="text-sm text-gray-600 mt-1">
                          {localizacaoInicio.endereco}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              
              <div className="flex justify-center">
                {!pontoAtivo ? (
                  <button
                    className="btn btn-success"
                    onClick={handleIniciarPonto}
                    disabled={loading || !localizacaoAtual}
                  >
                    <FiPlay className="mr-2" />
                    {loading ? 'Iniciando...' : 'Iniciar Jornada'}
                  </button>
                ) : (
                  <button
                    className="btn btn-danger"
                    onClick={handleFinalizarPonto}
                    disabled={loading || !localizacaoAtual}
                  >
                    <FiPause className="mr-2" />
                    {loading ? 'Finalizando...' : 'Finalizar Jornada'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="divider">Localização Atual</div>
            
            {localizacaoAtual ? (
              <div className="bg-light p-3 rounded">
                <div className="flex items-start">
                  <FiMapPin className="text-primary mr-2 mt-1" />
                  <div>
                    <div className="text-sm text-gray-600">
                      {localizacaoAtual.endereco}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Lat: {localizacaoAtual.latitude.toFixed(6)}, 
                      Long: {localizacaoAtual.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p>Obtendo localização...</p>
                <button
                  className="btn btn-sm btn-outline mt-2"
                  onClick={obterLocalizacaoAtual}
                >
                  Atualizar Localização
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Histórico de Pontos */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Histórico de Pontos</h2>
          </div>
          
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="form-group">
                <label htmlFor="data_inicio">
                  <FiCalendar className="inline mr-2" />
                  Data Inicial
                </label>
                <input
                  type="date"
                  id="data_inicio"
                  name="data_inicio"
                  className="form-control"
                  value={filtros.data_inicio}
                  onChange={handleFiltroChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="data_fim">
                  <FiCalendar className="inline mr-2" />
                  Data Final
                </label>
                <input
                  type="date"
                  id="data_fim"
                  name="data_fim"
                  className="form-control"
                  value={filtros.data_fim}
                  onChange={handleFiltroChange}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <button
                className="btn btn-primary"
                onClick={handleBuscar}
                disabled={loadingHistorico}
              >
                <FiList className="mr-2" />
                {loadingHistorico ? 'Buscando...' : 'Buscar Registros'}
              </button>
            </div>
            
            {loadingHistorico ? (
              <div className="text-center p-4">Carregando histórico...</div>
            ) : historicoPontos.length === 0 ? (
              <div className="text-center p-4">
                Nenhum registro encontrado para o período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Entrada</th>
                      <th>Saída</th>
                      <th>Duração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoPontos.map(ponto => (
                      <tr key={ponto.id}>
                        <td>{new Date(ponto.hora_inicio).toLocaleDateString('pt-BR')}</td>
                        <td>{new Date(ponto.hora_inicio).toLocaleTimeString('pt-BR')}</td>
                        <td>
                          {ponto.hora_fim 
                            ? new Date(ponto.hora_fim).toLocaleTimeString('pt-BR')
                            : <span className="badge badge-warning">Em andamento</span>
                          }
                        </td>
                        <td>{formatarDuracao(ponto.duracao_horas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PontoEletronico;
