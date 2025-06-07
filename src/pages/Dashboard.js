import React, { useState, useEffect } from 'react';
import { FiUsers, FiActivity, FiCalendar, FiPieChart, FiHome, FiHospital, FiBriefcase } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { Link } from 'react-router-dom';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    pacientesPorCategoria: { domiciliar: 0, hospitalar: 0, freelancer: 0 },
    registrosSinaisUltimos30Dias: 0,
    agendamentosProximos7Dias: 0
  });
  
  const [sinaisVitaisData, setSinaisVitaisData] = useState({
    labels: [],
    datasets: []
  });
  
  const [pacientesRecentes, setPacientesRecentes] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Buscar total de pacientes
      const { data: pacientes, error: pacientesError } = await supabase
        .from('pacientes')
        .select('id, nome, categoria')
        .order('created_at', { ascending: false });
      
      if (pacientesError) throw pacientesError;
      
      // Calcular estatísticas de pacientes
      const totalPacientes = pacientes?.length || 0;
      const pacientesPorCategoria = {
        domiciliar: pacientes?.filter(p => p.categoria === 'domiciliar').length || 0,
        hospitalar: pacientes?.filter(p => p.categoria === 'hospitalar').length || 0,
        freelancer: pacientes?.filter(p => p.categoria === 'freelancer').length || 0
      };
      
      // Pegar os 5 pacientes mais recentes para exibição rápida
      const pacientesRecentes = pacientes?.slice(0, 5) || [];
      setPacientesRecentes(pacientesRecentes);
      
      // Buscar registros de sinais vitais dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: sinaisVitais, error: sinaisError } = await supabase
        .from('sinais_vitais')
        .select('*')
        .gte('data_hora', thirtyDaysAgo.toISOString());
      
      if (sinaisError) throw sinaisError;
      
      const registrosSinaisUltimos30Dias = sinaisVitais?.length || 0;
      
      // Buscar agendamentos dos próximos 7 dias
      const today = new Date();
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      
      const { data: agendamentos, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('*')
        .gte('data', today.toISOString())
        .lte('data', sevenDaysLater.toISOString());
      
      if (agendamentosError) throw agendamentosError;
      
      const agendamentosProximos7Dias = agendamentos?.length || 0;
      
      // Preparar dados para o gráfico de sinais vitais
      // Agrupar registros por dia para o gráfico de linha
      const registrosPorDia = {};
      
      // Criar array com os últimos 7 dias
      const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      });
      
      // Inicializar contagem para cada dia
      ultimos7Dias.forEach(dia => {
        registrosPorDia[dia] = 0;
      });
      
      // Contar registros por dia
      sinaisVitais?.forEach(registro => {
        const dia = registro.data_hora.split('T')[0];
        if (ultimos7Dias.includes(dia)) {
          registrosPorDia[dia] = (registrosPorDia[dia] || 0) + 1;
        }
      });
      
      // Formatar datas para exibição
      const datasFormatadas = ultimos7Dias.map(dia => {
        const [ano, mes, diaMes] = dia.split('-');
        return `${diaMes}/${mes}`;
      });
      
      const dadosGrafico = {
        labels: datasFormatadas,
        datasets: [
          {
            label: 'Registros de Sinais Vitais',
            data: ultimos7Dias.map(dia => registrosPorDia[dia]),
            borderColor: '#0ea5e9',
            backgroundColor: 'rgba(14, 165, 233, 0.2)',
            tension: 0.4
          }
        ]
      };
      
      setSinaisVitaisData(dadosGrafico);
      
      // Atualizar estatísticas
      setStats({
        totalPacientes,
        pacientesPorCategoria,
        registrosSinaisUltimos30Dias,
        agendamentosProximos7Dias
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Dados para o gráfico de pizza
  const pieData = {
    labels: ['Domiciliar', 'Hospitalar', 'Freelancer'],
    datasets: [
      {
        data: [
          stats.pacientesPorCategoria.domiciliar,
          stats.pacientesPorCategoria.hospitalar,
          stats.pacientesPorCategoria.freelancer
        ],
        backgroundColor: [
          '#3b82f6',
          '#ef4444',
          '#f59e0b'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>
      
      {loading ? (
        <div className="text-center p-4">Carregando dados...</div>
      ) : (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-title">Total de Pacientes</div>
              <div className="stat-value">{stats.totalPacientes}</div>
              <div className="stat-icon"><FiUsers /></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Pacientes Domiciliares</div>
              <div className="stat-value">{stats.pacientesPorCategoria.domiciliar}</div>
              <div className="stat-icon"><FiHome /></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Pacientes Hospitalares</div>
              <div className="stat-value">{stats.pacientesPorCategoria.hospitalar}</div>
              <div className="stat-icon"><FiHospital /></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Pacientes Freelancer</div>
              <div className="stat-value">{stats.pacientesPorCategoria.freelancer}</div>
              <div className="stat-icon"><FiBriefcase /></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Registros de Sinais (30 dias)</div>
              <div className="stat-value">{stats.registrosSinaisUltimos30Dias}</div>
              <div className="stat-icon"><FiActivity /></div>
            </div>
            
            <div className="stat-card">
              <div className="stat-title">Agendamentos (7 dias)</div>
              <div className="stat-value">{stats.agendamentosProximos7Dias}</div>
              <div className="stat-icon"><FiCalendar /></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="chart-container">
              <div className="chart-header">
                <h2 className="chart-title">Distribuição de Pacientes</h2>
              </div>
              <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
                <Pie data={pieData} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-header">
                <h2 className="chart-title">Registros de Sinais Vitais (7 dias)</h2>
              </div>
              <div style={{ height: '250px' }}>
                <Line 
                  data={sinaisVitaisData} 
                  options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }} 
                />
              </div>
            </div>
          </div>
          
          {/* Seção de pacientes recentes com link para gráficos individuais */}
          <div className="mt-6">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Pacientes Recentes</h2>
                <p className="card-subtitle">Clique em um paciente para ver seus sinais vitais</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Categoria</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pacientesRecentes.map(paciente => (
                      <tr key={paciente.id}>
                        <td>{paciente.nome}</td>
                        <td>
                          <span className={`badge badge-${
                            paciente.categoria === 'domiciliar' ? 'primary' : 
                            paciente.categoria === 'hospitalar' ? 'danger' : 'warning'
                          }`}>
                            {paciente.categoria}
                          </span>
                        </td>
                        <td>
                          <Link 
                            to={`/paciente/${paciente.id}/sinais`} 
                            className="btn btn-sm btn-primary"
                          >
                            <FiActivity className="mr-1" /> Ver Sinais Vitais
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {pacientesRecentes.length === 0 && (
                <div className="text-center p-4">
                  Nenhum paciente cadastrado ainda.
                </div>
              )}
              
              <div className="card-footer">
                <Link to="/pacientes" className="btn btn-outline">
                  Ver todos os pacientes
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
