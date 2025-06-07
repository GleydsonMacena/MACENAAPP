import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiActivity, FiEdit2, FiAlertCircle } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Parâmetros normais da OMS
const parametrosNormais = {
  pressao_sistolica: { min: 90, max: 120 },
  pressao_diastolica: { min: 60, max: 80 },
  temperatura: { min: 36, max: 37.5 },
  frequencia_cardiaca: { min: 60, max: 100 },
  frequencia_respiratoria: { min: 12, max: 20 },
  saturacao: { min: 95, max: 100 },
  glicemia: { min: 70, max: 100 }
};

const PacienteSinaisVitais = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const [paciente, setPaciente] = useState(null);
  const [sinaisVitais, setSinaisVitais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodo, setPeriodo] = useState(30); // Padrão: últimos 30 dias
  const [editandoId, setEditandoId] = useState(null);
  const [formSinal, setFormSinal] = useState({
    pressao_arterial: '',
    temperatura: '',
    frequencia_cardiaca: '',
    frequencia_respiratoria: '',
    saturacao: '',
    glicemia: '',
    peso: '',
    altura: '',
    observacoes: ''
  });

  // Verificar se o usuário tem permissão para editar
  const podeEditar = ['admin', 'enfermeiro', 'gestor'].includes(profile?.role);

  useEffect(() => {
    fetchPaciente();
    fetchSinaisVitais();
  }, [id, periodo]);

  const fetchPaciente = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPaciente(data);
    } catch (error) {
      console.error('Erro ao buscar paciente:', error.message);
      setError('Não foi possível carregar os dados do paciente.');
    }
  };

  const fetchSinaisVitais = async () => {
    try {
      setLoading(true);
      
      // Calcular data inicial com base no período selecionado
      const dataInicial = new Date();
      dataInicial.setDate(dataInicial.getDate() - periodo);
      
      const { data, error } = await supabase
        .from('sinais_vitais')
        .select('*')
        .eq('paciente_id', id)
        .gte('data_hora', dataInicial.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      
      setSinaisVitais(data || []);
    } catch (error) {
      console.error('Erro ao buscar sinais vitais:', error.message);
      setError('Não foi possível carregar os sinais vitais.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarClick = (sinal) => {
    setEditandoId(sinal.id);
    
    // Extrair valores de pressão sistólica e diastólica
    let sistolica = '';
    let diastolica = '';
    
    if (sinal.pressao_arterial) {
      const partes = sinal.pressao_arterial.split('/');
      if (partes.length === 2) {
        sistolica = partes[0].trim();
        diastolica = partes[1].trim();
      }
    }
    
    setFormSinal({
      pressao_sistolica: sistolica,
      pressao_diastolica: diastolica,
      temperatura: sinal.temperatura || '',
      frequencia_cardiaca: sinal.frequencia_cardiaca || '',
      frequencia_respiratoria: sinal.frequencia_respiratoria || '',
      saturacao: sinal.saturacao || '',
      glicemia: sinal.glicemia || '',
      peso: sinal.peso || '',
      altura: sinal.altura || '',
      observacoes: sinal.observacoes || ''
    });
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setFormSinal({
      pressao_sistolica: '',
      pressao_diastolica: '',
      temperatura: '',
      frequencia_cardiaca: '',
      frequencia_respiratoria: '',
      saturacao: '',
      glicemia: '',
      peso: '',
      altura: '',
      observacoes: ''
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormSinal(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSalvarEdicao = async () => {
    try {
      setLoading(true);
      
      // Validar dados
      const pressao_arterial = formSinal.pressao_sistolica && formSinal.pressao_diastolica
        ? `${formSinal.pressao_sistolica}/${formSinal.pressao_diastolica}`
        : null;
      
      // Calcular IMC se peso e altura estiverem preenchidos
      let imc = null;
      if (formSinal.peso && formSinal.altura) {
        const pesoNum = parseFloat(formSinal.peso);
        const alturaMetros = parseFloat(formSinal.altura) / 100; // converter cm para metros
        if (!isNaN(pesoNum) && !isNaN(alturaMetros) && alturaMetros > 0) {
          imc = pesoNum / (alturaMetros * alturaMetros);
          imc = Math.round(imc * 10) / 10; // arredondar para 1 casa decimal
        }
      }
      
      // Verificar se há valores fora dos parâmetros normais
      const alertas = [];
      
      if (formSinal.pressao_sistolica) {
        const sistolica = parseInt(formSinal.pressao_sistolica);
        if (sistolica < parametrosNormais.pressao_sistolica.min) {
          alertas.push(`Pressão sistólica (${sistolica}) abaixo do normal (${parametrosNormais.pressao_sistolica.min})`);
        } else if (sistolica > parametrosNormais.pressao_sistolica.max) {
          alertas.push(`Pressão sistólica (${sistolica}) acima do normal (${parametrosNormais.pressao_sistolica.max})`);
        }
      }
      
      if (formSinal.pressao_diastolica) {
        const diastolica = parseInt(formSinal.pressao_diastolica);
        if (diastolica < parametrosNormais.pressao_diastolica.min) {
          alertas.push(`Pressão diastólica (${diastolica}) abaixo do normal (${parametrosNormais.pressao_diastolica.min})`);
        } else if (diastolica > parametrosNormais.pressao_diastolica.max) {
          alertas.push(`Pressão diastólica (${diastolica}) acima do normal (${parametrosNormais.pressao_diastolica.max})`);
        }
      }
      
      if (formSinal.temperatura) {
        const temperatura = parseFloat(formSinal.temperatura);
        if (temperatura < parametrosNormais.temperatura.min) {
          alertas.push(`Temperatura (${temperatura}°C) abaixo do normal (${parametrosNormais.temperatura.min}°C)`);
        } else if (temperatura > parametrosNormais.temperatura.max) {
          alertas.push(`Temperatura (${temperatura}°C) acima do normal (${parametrosNormais.temperatura.max}°C)`);
        }
      }
      
      if (formSinal.frequencia_cardiaca) {
        const fc = parseInt(formSinal.frequencia_cardiaca);
        if (fc < parametrosNormais.frequencia_cardiaca.min) {
          alertas.push(`Frequência cardíaca (${fc} bpm) abaixo do normal (${parametrosNormais.frequencia_cardiaca.min} bpm)`);
        } else if (fc > parametrosNormais.frequencia_cardiaca.max) {
          alertas.push(`Frequência cardíaca (${fc} bpm) acima do normal (${parametrosNormais.frequencia_cardiaca.max} bpm)`);
        }
      }
      
      if (formSinal.frequencia_respiratoria) {
        const fr = parseInt(formSinal.frequencia_respiratoria);
        if (fr < parametrosNormais.frequencia_respiratoria.min) {
          alertas.push(`Frequência respiratória (${fr} irpm) abaixo do normal (${parametrosNormais.frequencia_respiratoria.min} irpm)`);
        } else if (fr > parametrosNormais.frequencia_respiratoria.max) {
          alertas.push(`Frequência respiratória (${fr} irpm) acima do normal (${parametrosNormais.frequencia_respiratoria.max} irpm)`);
        }
      }
      
      if (formSinal.saturacao) {
        const sat = parseInt(formSinal.saturacao);
        if (sat < parametrosNormais.saturacao.min) {
          alertas.push(`Saturação (${sat}%) abaixo do normal (${parametrosNormais.saturacao.min}%)`);
        }
      }
      
      if (formSinal.glicemia) {
        const glicemia = parseInt(formSinal.glicemia);
        if (glicemia < parametrosNormais.glicemia.min) {
          alertas.push(`Glicemia (${glicemia} mg/dL) abaixo do normal (${parametrosNormais.glicemia.min} mg/dL)`);
        } else if (glicemia > parametrosNormais.glicemia.max) {
          alertas.push(`Glicemia (${glicemia} mg/dL) acima do normal (${parametrosNormais.glicemia.max} mg/dL)`);
        }
      }
      
      // Atualizar registro no banco de dados
      const { error } = await supabase
        .from('sinais_vitais')
        .update({
          pressao_arterial,
          temperatura: formSinal.temperatura || null,
          frequencia_cardiaca: formSinal.frequencia_cardiaca || null,
          frequencia_respiratoria: formSinal.frequencia_respiratoria || null,
          saturacao: formSinal.saturacao || null,
          glicemia: formSinal.glicemia || null,
          peso: formSinal.peso || null,
          altura: formSinal.altura || null,
          imc,
          observacoes: formSinal.observacoes,
          updated_at: new Date().toISOString(),
          updated_by: profile.id
        })
        .eq('id', editandoId);

      if (error) throw error;
      
      // Se houver alertas, enviar notificações para administradores e enfermeiros
      if (alertas.length > 0) {
        const mensagemAlerta = `Paciente: ${paciente.nome}\n${alertas.join('\n')}`;
        
        await supabase
          .from('notificacoes')
          .insert([
            {
              tipo: 'alerta',
              titulo: 'Alerta de Sinais Vitais',
              mensagem: mensagemAlerta,
              data: new Date().toISOString(),
              lida: false,
              user_id: null, // null indica que é para todos os administradores e enfermeiros
              dados_adicionais: JSON.stringify({
                paciente_id: paciente.id,
                paciente_nome: paciente.nome,
                sinais_vitais_id: editandoId,
                alertas
              })
            }
          ]);
      }
      
      // Atualizar lista de sinais vitais
      fetchSinaisVitais();
      
      // Limpar formulário e sair do modo de edição
      handleCancelarEdicao();
      
    } catch (error) {
      console.error('Erro ao salvar edição:', error.message);
      setError('Não foi possível salvar as alterações.');
    } finally {
      setLoading(false);
    }
  };

  // Preparar dados para os gráficos
  const prepararDadosGraficos = () => {
    // Extrair datas formatadas para labels
    const labels = sinaisVitais.map(sinal => {
      const data = new Date(sinal.data_hora);
      return `${data.getDate()}/${data.getMonth() + 1}`;
    });

    // Extrair valores de pressão arterial
    const pressaoSistolica = [];
    const pressaoDiastolica = [];
    
    sinaisVitais.forEach(sinal => {
      if (sinal.pressao_arterial) {
        const partes = sinal.pressao_arterial.split('/');
        if (partes.length === 2) {
          pressaoSistolica.push(parseInt(partes[0].trim()));
          pressaoDiastolica.push(parseInt(partes[1].trim()));
        } else {
          pressaoSistolica.push(null);
          pressaoDiastolica.push(null);
        }
      } else {
        pressaoSistolica.push(null);
        pressaoDiastolica.push(null);
      }
    });

    // Extrair outros valores
    const temperatura = sinaisVitais.map(sinal => sinal.temperatura);
    const frequenciaCardiaca = sinaisVitais.map(sinal => sinal.frequencia_cardiaca);
    const saturacao = sinaisVitais.map(sinal => sinal.saturacao);
    const glicemia = sinaisVitais.map(sinal => sinal.glicemia);

    // Dados para o gráfico de pressão arterial
    const dadosPressao = {
      labels,
      datasets: [
        {
          label: 'Sistólica',
          data: pressaoSistolica,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          tension: 0.4,
          pointRadius: 4
        },
        {
          label: 'Diastólica',
          data: pressaoDiastolica,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.4,
          pointRadius: 4
        }
      ]
    };

    // Dados para o gráfico de frequência cardíaca
    const dadosFC = {
      labels,
      datasets: [
        {
          label: 'Frequência Cardíaca (bpm)',
          data: frequenciaCardiaca,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          tension: 0.4,
          pointRadius: 4
        }
      ]
    };

    // Dados para o gráfico de saturação
    const dadosSaturacao = {
      labels,
      datasets: [
        {
          label: 'Saturação (%)',
          data: saturacao,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.4,
          pointRadius: 4
        }
      ]
    };

    // Dados para o gráfico de temperatura
    const dadosTemperatura = {
      labels,
      datasets: [
        {
          label: 'Temperatura (°C)',
          data: temperatura,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.2)',
          tension: 0.4,
          pointRadius: 4
        }
      ]
    };

    // Dados para o gráfico de glicemia
    const dadosGlicemia = {
      labels,
      datasets: [
        {
          label: 'Glicemia (mg/dL)',
          data: glicemia,
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.2)',
          tension: 0.4,
          pointRadius: 4
        }
      ]
    };

    return {
      pressao: dadosPressao,
      fc: dadosFC,
      saturacao: dadosSaturacao,
      temperatura: dadosTemperatura,
      glicemia: dadosGlicemia
    };
  };

  // Opções comuns para os gráficos
  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: false,
      }
    }
  };

  // Verificar se há dados para exibir gráficos
  const temDadosParaGraficos = sinaisVitais.length > 0;
  
  // Preparar dados para gráficos se houver registros
  const dadosGraficos = temDadosParaGraficos ? prepararDadosGraficos() : null;

  // Função para verificar se um valor está fora dos parâmetros normais
  const verificarAlerta = (tipo, valor) => {
    if (!valor) return false;
    
    switch (tipo) {
      case 'sistolica':
        return valor < parametrosNormais.pressao_sistolica.min || valor > parametrosNormais.pressao_sistolica.max;
      case 'diastolica':
        return valor < parametrosNormais.pressao_diastolica.min || valor > parametrosNormais.pressao_diastolica.max;
      case 'temperatura':
        return valor < parametrosNormais.temperatura.min || valor > parametrosNormais.temperatura.max;
      case 'fc':
        return valor < parametrosNormais.frequencia_cardiaca.min || valor > parametrosNormais.frequencia_cardiaca.max;
      case 'fr':
        return valor < parametrosNormais.frequencia_respiratoria.min || valor > parametrosNormais.frequencia_respiratoria.max;
      case 'saturacao':
        return valor < parametrosNormais.saturacao.min;
      case 'glicemia':
        return valor < parametrosNormais.glicemia.min || valor > parametrosNormais.glicemia.max;
      default:
        return false;
    }
  };

  // Função para calcular IMC com base no peso e altura
  const calcularIMC = () => {
    if (!formSinal.peso || !formSinal.altura) return '';
    
    const peso = parseFloat(formSinal.peso);
    const alturaMetros = parseFloat(formSinal.altura) / 100; // converter cm para metros
    
    if (isNaN(peso) || isNaN(alturaMetros) || alturaMetros <= 0) return '';
    
    const imc = peso / (alturaMetros * alturaMetros);
    return (Math.round(imc * 10) / 10).toFixed(1);
  };

  // Classificação do IMC
  const classificarIMC = (imc) => {
    if (!imc) return '';
    
    const imcNum = parseFloat(imc);
    
    if (imcNum < 18.5) return 'Abaixo do peso';
    if (imcNum < 25) return 'Peso normal';
    if (imcNum < 30) return 'Sobrepeso';
    if (imcNum < 35) return 'Obesidade grau I';
    if (imcNum < 40) return 'Obesidade grau II';
    return 'Obesidade grau III';
  };

  // Formatar data
  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR');
  };

  return (
    <div>
      <div className="flex items-center mb-4">
        <Link to="/dashboard" className="btn btn-outline btn-sm mr-2">
          <FiArrowLeft /> Voltar
        </Link>
        <h1 className="text-xl font-bold">Sinais Vitais do Paciente</h1>
      </div>
      
      {error && (
        <div className="alert alert-danger mb-4">
          {error}
        </div>
      )}
      
      {loading && !paciente ? (
        <div className="text-center p-4">Carregando dados do paciente...</div>
      ) : paciente ? (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="card-title">{paciente.nome}</h2>
            <div className="card-subtitle">
              <span className={`badge badge-${
                paciente.categoria === 'domiciliar' ? 'primary' : 
                paciente.categoria === 'hospitalar' ? 'danger' : 'warning'
              } mr-2`}>
                {paciente.categoria}
              </span>
              {paciente.idade && <span>Idade: {paciente.idade} anos</span>}
            </div>
          </div>
          
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <strong>Telefone:</strong> {paciente.telefone || 'Não informado'}
              </div>
              <div>
                <strong>Endereço:</strong> {paciente.endereco || 'Não informado'}
              </div>
              <div>
                <strong>Convênio:</strong> {paciente.convenio || 'Não informado'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning mb-4">
          Paciente não encontrado.
        </div>
      )}
      
      <div className="card mb-6">
        <div className="card-header">
          <h2 className="card-title">Gráficos de Sinais Vitais</h2>
          
          <div className="flex items-center">
            <label htmlFor="periodo" className="mr-2">Período:</label>
            <select
              id="periodo"
              className="form-control"
              value={periodo}
              onChange={(e) => setPeriodo(parseInt(e.target.value))}
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={15}>Últimos 15 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center p-4">Carregando gráficos...</div>
        ) : !temDadosParaGraficos ? (
          <div className="text-center p-4">
            Não há registros de sinais vitais no período selecionado.
          </div>
        ) : (
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gráfico de Pressão Arterial */}
              <div className="chart-container">
                <h3 className="chart-title">Pressão Arterial</h3>
                <div style={{ height: '250px' }}>
                  <Line data={dadosGraficos.pressao} options={opcoesGrafico} />
                </div>
              </div>
              
              {/* Gráfico de Frequência Cardíaca */}
              <div className="chart-container">
                <h3 className="chart-title">Frequência Cardíaca</h3>
                <div style={{ height: '250px' }}>
                  <Line data={dadosGraficos.fc} options={opcoesGrafico} />
                </div>
              </div>
              
              {/* Gráfico de Saturação */}
              <div className="chart-container">
                <h3 className="chart-title">Saturação de O₂</h3>
                <div style={{ height: '250px' }}>
                  <Line data={dadosGraficos.saturacao} options={opcoesGrafico} />
                </div>
              </div>
              
              {/* Gráfico de Temperatura */}
              <div className="chart-container">
                <h3 className="chart-title">Temperatura</h3>
                <div style={{ height: '250px' }}>
                  <Line data={dadosGraficos.temperatura} options={opcoesGrafico} />
                </div>
              </div>
              
              {/* Gráfico de Glicemia */}
              <div className="chart-container">
                <h3 className="chart-title">Glicemia</h3>
                <div style={{ height: '250px' }}>
                  <Line data={dadosGraficos.glicemia} options={opcoesGrafico} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Histórico de Registros</h2>
        </div>
        
        {loading && sinaisVitais.length === 0 ? (
          <div className="text-center p-4">Carregando registros...</div>
        ) : sinaisVitais.length === 0 ? (
          <div className="text-center p-4">
            Não há registros de sinais vitais para este paciente no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Pressão</th>
                  <th>Temp.</th>
                  <th>FC</th>
                  <th>FR</th>
                  <th>Sat. O₂</th>
                  <th>Glicemia</th>
                  <th>Peso/Altura</th>
                  <th>IMC</th>
                  {podeEditar && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {sinaisVitais.map(sinal => {
                  // Extrair valores de pressão sistólica e diastólica
                  let sistolica = '';
                  let diastolica = '';
                  
                  if (sinal.pressao_arterial) {
                    const partes = sinal.pressao_arterial.split('/');
                    if (partes.length === 2) {
                      sistolica = partes[0].trim();
                      diastolica = partes[1].trim();
                    }
                  }
                  
                  // Verificar alertas
                  const alertaSistolica = verificarAlerta('sistolica', sistolica);
                  const alertaDiastolica = verificarAlerta('diastolica', diastolica);
                  const alertaTemperatura = verificarAlerta('temperatura', sinal.temperatura);
                  const alertaFC = verificarAlerta('fc', sinal.frequencia_cardiaca);
                  const alertaFR = verificarAlerta('fr', sinal.frequencia_respiratoria);
                  const alertaSaturacao = verificarAlerta('saturacao', sinal.saturacao);
                  const alertaGlicemia = verificarAlerta('glicemia', sinal.glicemia);
                  
                  return (
                    <tr key={sinal.id}>
                      <td>{formatarData(sinal.data_hora)}</td>
                      <td>
                        {sinal.pressao_arterial ? (
                          <span className={alertaSistolica || alertaDiastolica ? 'text-danger' : ''}>
                            {sinal.pressao_arterial}
                            {(alertaSistolica || alertaDiastolica) && (
                              <FiAlertCircle className="ml-1 text-danger" />
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {sinal.temperatura ? (
                          <span className={alertaTemperatura ? 'text-danger' : ''}>
                            {sinal.temperatura} °C
                            {alertaTemperatura && (
                              <FiAlertCircle className="ml-1 text-danger" />
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {sinal.frequencia_cardiaca ? (
                          <span className={alertaFC ? 'text-danger' : ''}>
                            {sinal.frequencia_cardiaca} bpm
                            {alertaFC && (
                              <FiAlertCircle className="ml-1 text-danger" />
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {sinal.frequencia_respiratoria ? (
                          <span className={alertaFR ? 'text-danger' : ''}>
                            {sinal.frequencia_respiratoria} irpm
                            {alertaFR && (
                              <FiAlertCircle className="ml-1 text-danger" />
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {sinal.saturacao ? (
                          <span className={alertaSaturacao ? 'text-danger' : ''}>
                            {sinal.saturacao}%
                            {alertaSaturacao && (
                              <FiAlertCircle className="ml-1 text-danger" />
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {sinal.glicemia ? (
                          <span className={alertaGlicemia ? 'text-danger' : ''}>
                            {sinal.glicemia} mg/dL
                            {alertaGlicemia && (
                              <FiAlertCircle className="ml-1 text-danger" />
                            )}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        {sinal.peso ? `${sinal.peso} kg` : '-'}
                        {sinal.altura ? ` / ${sinal.altura} cm` : ''}
                      </td>
                      <td>
                        {sinal.imc ? (
                          <span title={classificarIMC(sinal.imc)}>
                            {sinal.imc}
                          </span>
                        ) : '-'}
                      </td>
                      {podeEditar && (
                        <td>
                          {editandoId === sinal.id ? (
                            <div className="flex">
                              <button
                                className="btn btn-sm btn-success mr-1"
                                onClick={handleSalvarEdicao}
                                disabled={loading}
                              >
                                Salvar
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={handleCancelarEdicao}
                                disabled={loading}
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleEditarClick(sinal)}
                              disabled={loading || editandoId !== null}
                            >
                              <FiEdit2 size={16} /> Editar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Formulário de edição */}
        {editandoId && (
          <div className="card-body border-t">
            <h3 className="text-lg font-semibold mb-4">Editar Registro</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-group">
                <label htmlFor="pressao_sistolica">Pressão Sistólica</label>
                <input
                  type="number"
                  id="pressao_sistolica"
                  name="pressao_sistolica"
                  className="form-control"
                  value={formSinal.pressao_sistolica}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="pressao_diastolica">Pressão Diastólica</label>
                <input
                  type="number"
                  id="pressao_diastolica"
                  name="pressao_diastolica"
                  className="form-control"
                  value={formSinal.pressao_diastolica}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="temperatura">Temperatura (°C)</label>
                <input
                  type="number"
                  id="temperatura"
                  name="temperatura"
                  className="form-control"
                  value={formSinal.temperatura}
                  onChange={handleFormChange}
                  step="0.1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="frequencia_cardiaca">Frequência Cardíaca (bpm)</label>
                <input
                  type="number"
                  id="frequencia_cardiaca"
                  name="frequencia_cardiaca"
                  className="form-control"
                  value={formSinal.frequencia_cardiaca}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="frequencia_respiratoria">Frequência Respiratória (irpm)</label>
                <input
                  type="number"
                  id="frequencia_respiratoria"
                  name="frequencia_respiratoria"
                  className="form-control"
                  value={formSinal.frequencia_respiratoria}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="saturacao">Saturação (%)</label>
                <input
                  type="number"
                  id="saturacao"
                  name="saturacao"
                  className="form-control"
                  value={formSinal.saturacao}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="glicemia">Glicemia (mg/dL)</label>
                <input
                  type="number"
                  id="glicemia"
                  name="glicemia"
                  className="form-control"
                  value={formSinal.glicemia}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="peso">Peso (kg)</label>
                <input
                  type="number"
                  id="peso"
                  name="peso"
                  className="form-control"
                  value={formSinal.peso}
                  onChange={handleFormChange}
                  step="0.1"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="altura">Altura (cm)</label>
                <input
                  type="number"
                  id="altura"
                  name="altura"
                  className="form-control"
                  value={formSinal.altura}
                  onChange={handleFormChange}
                />
              </div>
              
              <div className="form-group">
                <label>IMC</label>
                <div className="form-control bg-light">
                  {calcularIMC() ? (
                    <>
                      <strong>{calcularIMC()}</strong>
                      <span className="text-muted ml-2">
                        ({classificarIMC(calcularIMC())})
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">
                      Informe peso e altura para calcular
                    </span>
                  )}
                </div>
              </div>
              
              <div className="form-group md:col-span-3">
                <label htmlFor="observacoes">Observações</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  className="form-control"
                  value={formSinal.observacoes}
                  onChange={handleFormChange}
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

export default PacienteSinaisVitais;
