import React, { useState, useEffect } from 'react';
import { FiFileText, FiDownload, FiSearch, FiEdit2, FiEye, FiSave, FiX, FiPrinter } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Relatorios = () => {
  const { profile } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para o formulário de novo relatório
  const [formData, setFormData] = useState({
    titulo: '',
    paciente_id: '',
    tipo: 'sinais_vitais',
    periodo_inicio: '',
    periodo_fim: '',
    observacoes: ''
  });
  
  // Estado para busca e filtros
  const [busca, setBusca] = useState({
    titulo: '',
    paciente_id: '',
    tipo: '',
    periodo_inicio: '',
    periodo_fim: ''
  });
  
  // Estado para edição
  const [editandoId, setEditandoId] = useState(null);
  const [formEdicao, setFormEdicao] = useState({
    titulo: '',
    paciente_id: '',
    tipo: '',
    periodo_inicio: '',
    periodo_fim: '',
    observacoes: ''
  });
  
  // Estado para preview
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Verificar permissões
  const podeEditar = ['admin', 'enfermeiro', 'gestor'].includes(profile?.role);

  useEffect(() => {
    fetchPacientes();
    fetchRelatorios();
  }, []);

  const fetchPacientes = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error.message);
      setError('Erro ao carregar lista de pacientes.');
    }
  };

  const fetchRelatorios = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('relatorios')
        .select(`
          *,
          pacientes:paciente_id (id, nome),
          usuarios:created_by (id, nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setRelatorios(data || []);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error.message);
      setError('Erro ao carregar relatórios.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleBuscaChange = (e) => {
    const { name, value } = e.target;
    setBusca(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdicaoChange = (e) => {
    const { name, value } = e.target;
    setFormEdicao(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      setLoading(true);
      
      // Validar formulário
      if (!formData.titulo || !formData.paciente_id || !formData.tipo) {
        throw new Error('Preencha todos os campos obrigatórios.');
      }
      
      // Gerar dados do relatório
      const dadosRelatorio = await gerarDadosRelatorio(
        formData.paciente_id,
        formData.tipo,
        formData.periodo_inicio,
        formData.periodo_fim
      );
      
      // Inserir relatório
      const { data, error } = await supabase
        .from('relatorios')
        .insert([
          {
            titulo: formData.titulo,
            paciente_id: formData.paciente_id,
            tipo: formData.tipo,
            periodo_inicio: formData.periodo_inicio || null,
            periodo_fim: formData.periodo_fim || null,
            observacoes: formData.observacoes,
            dados: dadosRelatorio,
            created_by: profile.id
          }
        ])
        .select();

      if (error) throw error;
      
      // Limpar formulário
      setFormData({
        titulo: '',
        paciente_id: '',
        tipo: 'sinais_vitais',
        periodo_inicio: '',
        periodo_fim: '',
        observacoes: ''
      });
      
      setSuccess('Relatório criado com sucesso!');
      
      // Atualizar lista de relatórios
      await fetchRelatorios();
      
    } catch (error) {
      console.error('Erro ao criar relatório:', error.message);
      setError('Erro ao criar relatório: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Construir query
      let query = supabase
        .from('relatorios')
        .select(`
          *,
          pacientes:paciente_id (id, nome),
          usuarios:created_by (id, nome)
        `)
        .order('created_at', { ascending: false });
      
      // Aplicar filtros
      if (busca.titulo) {
        query = query.ilike('titulo', `%${busca.titulo}%`);
      }
      
      if (busca.paciente_id) {
        query = query.eq('paciente_id', busca.paciente_id);
      }
      
      if (busca.tipo) {
        query = query.eq('tipo', busca.tipo);
      }
      
      if (busca.periodo_inicio) {
        query = query.gte('created_at', busca.periodo_inicio);
      }
      
      if (busca.periodo_fim) {
        // Adicionar um dia para incluir todo o dia final
        const dataFim = new Date(busca.periodo_fim);
        dataFim.setDate(dataFim.getDate() + 1);
        query = query.lt('created_at', dataFim.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setRelatorios(data || []);
      
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error.message);
      setError('Erro ao buscar relatórios: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditarClick = (relatorio) => {
    if (!podeEditar) return;
    
    setEditandoId(relatorio.id);
    setFormEdicao({
      titulo: relatorio.titulo,
      paciente_id: relatorio.paciente_id,
      tipo: relatorio.tipo,
      periodo_inicio: relatorio.periodo_inicio || '',
      periodo_fim: relatorio.periodo_fim || '',
      observacoes: relatorio.observacoes || ''
    });
  };

  const handleCancelarEdicao = () => {
    setEditandoId(null);
    setFormEdicao({
      titulo: '',
      paciente_id: '',
      tipo: '',
      periodo_inicio: '',
      periodo_fim: '',
      observacoes: ''
    });
  };

  const handleSalvarEdicao = async () => {
    if (!podeEditar) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Validar formulário
      if (!formEdicao.titulo || !formEdicao.paciente_id || !formEdicao.tipo) {
        throw new Error('Preencha todos os campos obrigatórios.');
      }
      
      // Gerar novos dados do relatório
      const dadosRelatorio = await gerarDadosRelatorio(
        formEdicao.paciente_id,
        formEdicao.tipo,
        formEdicao.periodo_inicio,
        formEdicao.periodo_fim
      );
      
      // Atualizar relatório
      const { error } = await supabase
        .from('relatorios')
        .update({
          titulo: formEdicao.titulo,
          paciente_id: formEdicao.paciente_id,
          tipo: formEdicao.tipo,
          periodo_inicio: formEdicao.periodo_inicio || null,
          periodo_fim: formEdicao.periodo_fim || null,
          observacoes: formEdicao.observacoes,
          dados: dadosRelatorio,
          updated_at: new Date().toISOString(),
          updated_by: profile.id
        })
        .eq('id', editandoId);

      if (error) throw error;
      
      setSuccess('Relatório atualizado com sucesso!');
      
      // Limpar formulário de edição
      handleCancelarEdicao();
      
      // Atualizar lista de relatórios
      await fetchRelatorios();
      
    } catch (error) {
      console.error('Erro ao atualizar relatório:', error.message);
      setError('Erro ao atualizar relatório: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id) => {
    if (!podeEditar) return;
    
    if (!window.confirm('Tem certeza que deseja excluir este relatório?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('relatorios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setSuccess('Relatório excluído com sucesso!');
      
      // Atualizar lista de relatórios
      await fetchRelatorios();
      
    } catch (error) {
      console.error('Erro ao excluir relatório:', error.message);
      setError('Erro ao excluir relatório: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (relatorio) => {
    try {
      setLoading(true);
      setError('');
      
      // Buscar dados atualizados do paciente
      const { data: pacienteData, error: pacienteError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', relatorio.paciente_id)
        .single();
      
      if (pacienteError) throw pacienteError;
      
      // Preparar dados para preview
      const previewInfo = {
        relatorio,
        paciente: pacienteData,
        dados: relatorio.dados
      };
      
      setPreviewData(previewInfo);
      setShowPreview(true);
      
    } catch (error) {
      console.error('Erro ao gerar preview:', error.message);
      setError('Erro ao gerar preview: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewData(null);
  };

  const gerarDadosRelatorio = async (pacienteId, tipo, periodoInicio, periodoFim) => {
    // Buscar dados do paciente
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('*')
      .eq('id', pacienteId)
      .single();
    
    let dados = {
      paciente,
      registros: [],
      estatisticas: {}
    };
    
    // Construir query base para o período
    let query = supabase;
    
    if (tipo === 'sinais_vitais') {
      query = query.from('sinais_vitais').select('*').eq('paciente_id', pacienteId);
      
      if (periodoInicio) {
        query = query.gte('data_hora', periodoInicio);
      }
      
      if (periodoFim) {
        // Adicionar um dia para incluir todo o dia final
        const dataFim = new Date(periodoFim);
        dataFim.setDate(dataFim.getDate() + 1);
        query = query.lt('data_hora', dataFim.toISOString());
      }
      
      query = query.order('data_hora', { ascending: false });
      
      const { data: registros } = await query;
      
      dados.registros = registros || [];
      
      // Calcular estatísticas
      if (registros && registros.length > 0) {
        // Extrair valores numéricos
        const pressaoSistolica = [];
        const pressaoDiastolica = [];
        const temperatura = [];
        const frequenciaCardiaca = [];
        const saturacao = [];
        const glicemia = [];
        
        registros.forEach(registro => {
          if (registro.pressao_arterial) {
            const partes = registro.pressao_arterial.split('/');
            if (partes.length === 2) {
              pressaoSistolica.push(parseInt(partes[0].trim()));
              pressaoDiastolica.push(parseInt(partes[1].trim()));
            }
          }
          
          if (registro.temperatura) temperatura.push(parseFloat(registro.temperatura));
          if (registro.frequencia_cardiaca) frequenciaCardiaca.push(parseInt(registro.frequencia_cardiaca));
          if (registro.saturacao) saturacao.push(parseInt(registro.saturacao));
          if (registro.glicemia) glicemia.push(parseInt(registro.glicemia));
        });
        
        // Função para calcular média
        const calcularMedia = arr => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
        
        // Função para encontrar valor mínimo
        const encontrarMinimo = arr => arr.length > 0 ? Math.min(...arr) : null;
        
        // Função para encontrar valor máximo
        const encontrarMaximo = arr => arr.length > 0 ? Math.max(...arr) : null;
        
        dados.estatisticas = {
          total_registros: registros.length,
          pressao_sistolica: {
            media: calcularMedia(pressaoSistolica)?.toFixed(0) || null,
            minima: encontrarMinimo(pressaoSistolica) || null,
            maxima: encontrarMaximo(pressaoSistolica) || null
          },
          pressao_diastolica: {
            media: calcularMedia(pressaoDiastolica)?.toFixed(0) || null,
            minima: encontrarMinimo(pressaoDiastolica) || null,
            maxima: encontrarMaximo(pressaoDiastolica) || null
          },
          temperatura: {
            media: calcularMedia(temperatura)?.toFixed(1) || null,
            minima: encontrarMinimo(temperatura) || null,
            maxima: encontrarMaximo(temperatura) || null
          },
          frequencia_cardiaca: {
            media: calcularMedia(frequenciaCardiaca)?.toFixed(0) || null,
            minima: encontrarMinimo(frequenciaCardiaca) || null,
            maxima: encontrarMaximo(frequenciaCardiaca) || null
          },
          saturacao: {
            media: calcularMedia(saturacao)?.toFixed(0) || null,
            minima: encontrarMinimo(saturacao) || null,
            maxima: encontrarMaximo(saturacao) || null
          },
          glicemia: {
            media: calcularMedia(glicemia)?.toFixed(0) || null,
            minima: encontrarMinimo(glicemia) || null,
            maxima: encontrarMaximo(glicemia) || null
          }
        };
      }
    } else if (tipo === 'agendamentos') {
      query = query.from('agendamentos').select('*').eq('paciente_id', pacienteId);
      
      if (periodoInicio) {
        query = query.gte('data', periodoInicio);
      }
      
      if (periodoFim) {
        query = query.lte('data', periodoFim);
      }
      
      query = query.order('data', { ascending: false });
      
      const { data: registros } = await query;
      
      dados.registros = registros || [];
      
      // Calcular estatísticas
      if (registros && registros.length > 0) {
        const tiposAgendamento = {};
        
        registros.forEach(registro => {
          tiposAgendamento[registro.tipo] = (tiposAgendamento[registro.tipo] || 0) + 1;
        });
        
        dados.estatisticas = {
          total_agendamentos: registros.length,
          tipos_agendamento: tiposAgendamento
        };
      }
    }
    
    return dados;
  };

  const exportarPDF = (relatorio) => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text(relatorio.titulo, 14, 22);
      
      // Informações do paciente
      doc.setFontSize(12);
      doc.text(`Paciente: ${relatorio.pacientes?.nome}`, 14, 32);
      
      // Período
      let periodoTexto = 'Período: ';
      if (relatorio.periodo_inicio && relatorio.periodo_fim) {
        periodoTexto += `${formatarData(relatorio.periodo_inicio)} a ${formatarData(relatorio.periodo_fim)}`;
      } else if (relatorio.periodo_inicio) {
        periodoTexto += `A partir de ${formatarData(relatorio.periodo_inicio)}`;
      } else if (relatorio.periodo_fim) {
        periodoTexto += `Até ${formatarData(relatorio.periodo_fim)}`;
      } else {
        periodoTexto += 'Todos os registros';
      }
      doc.text(periodoTexto, 14, 40);
      
      // Data de geração
      doc.text(`Gerado em: ${formatarDataHora(relatorio.created_at)}`, 14, 48);
      
      // Observações
      if (relatorio.observacoes) {
        doc.text('Observações:', 14, 56);
        doc.setFontSize(10);
        const linhasObservacoes = doc.splitTextToSize(relatorio.observacoes, 180);
        doc.text(linhasObservacoes, 14, 64);
      }
      
      // Dados do relatório
      const dados = relatorio.dados;
      
      if (relatorio.tipo === 'sinais_vitais') {
        // Estatísticas
        const estatisticas = dados.estatisticas;
        
        if (estatisticas && estatisticas.total_registros > 0) {
          doc.setFontSize(14);
          doc.text('Estatísticas', 14, 80);
          
          doc.setFontSize(10);
          doc.text(`Total de registros: ${estatisticas.total_registros}`, 14, 88);
          
          // Tabela de estatísticas
          const estatisticasData = [
            ['Parâmetro', 'Média', 'Mínimo', 'Máximo'],
            ['Pressão Sistólica', estatisticas.pressao_sistolica.media || '-', estatisticas.pressao_sistolica.minima || '-', estatisticas.pressao_sistolica.maxima || '-'],
            ['Pressão Diastólica', estatisticas.pressao_diastolica.media || '-', estatisticas.pressao_diastolica.minima || '-', estatisticas.pressao_diastolica.maxima || '-'],
            ['Temperatura (°C)', estatisticas.temperatura.media || '-', estatisticas.temperatura.minima || '-', estatisticas.temperatura.maxima || '-'],
            ['Freq. Cardíaca (bpm)', estatisticas.frequencia_cardiaca.media || '-', estatisticas.frequencia_cardiaca.minima || '-', estatisticas.frequencia_cardiaca.maxima || '-'],
            ['Saturação (%)', estatisticas.saturacao.media || '-', estatisticas.saturacao.minima || '-', estatisticas.saturacao.maxima || '-'],
            ['Glicemia (mg/dL)', estatisticas.glicemia.media || '-', estatisticas.glicemia.minima || '-', estatisticas.glicemia.maxima || '-']
          ];
          
          doc.autoTable({
            startY: 95,
            head: [estatisticasData[0]],
            body: estatisticasData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
          });
          
          // Registros
          doc.setFontSize(14);
          doc.text('Registros', 14, doc.autoTable.previous.finalY + 15);
          
          const registrosData = [
            ['Data/Hora', 'Pressão', 'Temp.', 'FC', 'Sat.', 'Glicemia']
          ];
          
          dados.registros.forEach(registro => {
            registrosData.push([
              formatarDataHora(registro.data_hora),
              registro.pressao_arterial || '-',
              registro.temperatura ? `${registro.temperatura} °C` : '-',
              registro.frequencia_cardiaca ? `${registro.frequencia_cardiaca} bpm` : '-',
              registro.saturacao ? `${registro.saturacao}%` : '-',
              registro.glicemia ? `${registro.glicemia} mg/dL` : '-'
            ]);
          });
          
          doc.autoTable({
            startY: doc.autoTable.previous.finalY + 20,
            head: [registrosData[0]],
            body: registrosData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
          });
        }
      } else if (relatorio.tipo === 'agendamentos') {
        // Estatísticas
        const estatisticas = dados.estatisticas;
        
        if (estatisticas && estatisticas.total_agendamentos > 0) {
          doc.setFontSize(14);
          doc.text('Estatísticas', 14, 80);
          
          doc.setFontSize(10);
          doc.text(`Total de agendamentos: ${estatisticas.total_agendamentos}`, 14, 88);
          
          // Tabela de tipos de agendamento
          const tiposData = [
            ['Tipo', 'Quantidade']
          ];
          
          Object.entries(estatisticas.tipos_agendamento).forEach(([tipo, quantidade]) => {
            tiposData.push([tipo, quantidade]);
          });
          
          doc.autoTable({
            startY: 95,
            head: [tiposData[0]],
            body: tiposData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
          });
          
          // Registros
          doc.setFontSize(14);
          doc.text('Agendamentos', 14, doc.autoTable.previous.finalY + 15);
          
          const registrosData = [
            ['Data', 'Hora', 'Tipo', 'Observações']
          ];
          
          dados.registros.forEach(registro => {
            registrosData.push([
              formatarData(registro.data),
              registro.hora,
              registro.tipo,
              registro.observacoes || '-'
            ]);
          });
          
          doc.autoTable({
            startY: doc.autoTable.previous.finalY + 20,
            head: [registrosData[0]],
            body: registrosData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 }
          });
        }
      }
      
      // Rodapé
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Macena Health - Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
      }
      
      // Salvar o PDF
      doc.save(`${relatorio.titulo.replace(/\s+/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Erro ao exportar PDF:', error.message);
      setError('Erro ao exportar PDF: ' + error.message);
    }
  };

  const exportarExcel = (relatorio) => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Informações gerais
      const infoData = [
        ['Relatório', relatorio.titulo],
        ['Paciente', relatorio.pacientes?.nome],
        ['Tipo', relatorio.tipo === 'sinais_vitais' ? 'Sinais Vitais' : 'Agendamentos'],
        ['Período Início', relatorio.periodo_inicio ? formatarData(relatorio.periodo_inicio) : '-'],
        ['Período Fim', relatorio.periodo_fim ? formatarData(relatorio.periodo_fim) : '-'],
        ['Gerado em', formatarDataHora(relatorio.created_at)],
        ['Observações', relatorio.observacoes || '-']
      ];
      
      const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
      XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informações');
      
      const dados = relatorio.dados;
      
      if (relatorio.tipo === 'sinais_vitais') {
        // Estatísticas
        const estatisticas = dados.estatisticas;
        
        if (estatisticas && estatisticas.total_registros > 0) {
          const estatisticasData = [
            ['Parâmetro', 'Média', 'Mínimo', 'Máximo'],
            ['Pressão Sistólica', estatisticas.pressao_sistolica.media || '-', estatisticas.pressao_sistolica.minima || '-', estatisticas.pressao_sistolica.maxima || '-'],
            ['Pressão Diastólica', estatisticas.pressao_diastolica.media || '-', estatisticas.pressao_diastolica.minima || '-', estatisticas.pressao_diastolica.maxima || '-'],
            ['Temperatura (°C)', estatisticas.temperatura.media || '-', estatisticas.temperatura.minima || '-', estatisticas.temperatura.maxima || '-'],
            ['Freq. Cardíaca (bpm)', estatisticas.frequencia_cardiaca.media || '-', estatisticas.frequencia_cardiaca.minima || '-', estatisticas.frequencia_cardiaca.maxima || '-'],
            ['Saturação (%)', estatisticas.saturacao.media || '-', estatisticas.saturacao.minima || '-', estatisticas.saturacao.maxima || '-'],
            ['Glicemia (mg/dL)', estatisticas.glicemia.media || '-', estatisticas.glicemia.minima || '-', estatisticas.glicemia.maxima || '-']
          ];
          
          const estatisticasSheet = XLSX.utils.aoa_to_sheet(estatisticasData);
          XLSX.utils.book_append_sheet(workbook, estatisticasSheet, 'Estatísticas');
          
          // Registros
          const registrosData = [
            ['Data/Hora', 'Pressão', 'Temperatura', 'Freq. Cardíaca', 'Freq. Respiratória', 'Saturação', 'Glicemia', 'Peso', 'Altura', 'IMC', 'Observações']
          ];
          
          dados.registros.forEach(registro => {
            registrosData.push([
              formatarDataHora(registro.data_hora),
              registro.pressao_arterial || '-',
              registro.temperatura || '-',
              registro.frequencia_cardiaca || '-',
              registro.frequencia_respiratoria || '-',
              registro.saturacao || '-',
              registro.glicemia || '-',
              registro.peso || '-',
              registro.altura || '-',
              registro.imc || '-',
              registro.observacoes || '-'
            ]);
          });
          
          const registrosSheet = XLSX.utils.aoa_to_sheet(registrosData);
          XLSX.utils.book_append_sheet(workbook, registrosSheet, 'Registros');
        }
      } else if (relatorio.tipo === 'agendamentos') {
        // Estatísticas
        const estatisticas = dados.estatisticas;
        
        if (estatisticas && estatisticas.total_agendamentos > 0) {
          const tiposData = [
            ['Tipo', 'Quantidade']
          ];
          
          Object.entries(estatisticas.tipos_agendamento).forEach(([tipo, quantidade]) => {
            tiposData.push([tipo, quantidade]);
          });
          
          const estatisticasSheet = XLSX.utils.aoa_to_sheet(tiposData);
          XLSX.utils.book_append_sheet(workbook, estatisticasSheet, 'Estatísticas');
          
          // Registros
          const registrosData = [
            ['Data', 'Hora', 'Tipo', 'Status', 'Observações']
          ];
          
          dados.registros.forEach(registro => {
            registrosData.push([
              formatarData(registro.data),
              registro.hora,
              registro.tipo,
              registro.status,
              registro.observacoes || '-'
            ]);
          });
          
          const registrosSheet = XLSX.utils.aoa_to_sheet(registrosData);
          XLSX.utils.book_append_sheet(workbook, registrosSheet, 'Agendamentos');
        }
      }
      
      // Exportar arquivo
      XLSX.writeFile(workbook, `${relatorio.titulo.replace(/\s+/g, '_')}.xlsx`);
      
    } catch (error) {
      console.error('Erro ao exportar Excel:', error.message);
      setError('Erro ao exportar Excel: ' + error.message);
    }
  };

  // Formatar data
  const formatarData = (dataString) => {
    if (!dataString) return '-';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Formatar data e hora
  const formatarDataHora = (dataHoraString) => {
    if (!dataHoraString) return '-';
    const data = new Date(dataHoraString);
    return data.toLocaleString('pt-BR');
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Relatórios</h1>
      
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
        {/* Formulário de novo relatório */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Novo Relatório</h2>
          </div>
          
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="titulo">Título</label>
                <input
                  type="text"
                  id="titulo"
                  name="titulo"
                  className="form-control"
                  value={formData.titulo}
                  onChange={handleFormChange}
                  required
                  placeholder="Ex: Relatório de Sinais Vitais - Maio 2025"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="paciente_id">Paciente</label>
                <select
                  id="paciente_id"
                  name="paciente_id"
                  className="form-control"
                  value={formData.paciente_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="tipo">Tipo de Relatório</label>
                <select
                  id="tipo"
                  name="tipo"
                  className="form-control"
                  value={formData.tipo}
                  onChange={handleFormChange}
                  required
                >
                  <option value="sinais_vitais">Sinais Vitais</option>
                  <option value="agendamentos">Agendamentos</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label htmlFor="periodo_inicio">Período Início</label>
                  <input
                    type="date"
                    id="periodo_inicio"
                    name="periodo_inicio"
                    className="form-control"
                    value={formData.periodo_inicio}
                    onChange={handleFormChange}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="periodo_fim">Período Fim</label>
                  <input
                    type="date"
                    id="periodo_fim"
                    name="periodo_fim"
                    className="form-control"
                    value={formData.periodo_fim}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="observacoes">Observações</label>
                <textarea
                  id="observacoes"
                  name="observacoes"
                  className="form-control"
                  value={formData.observacoes}
                  onChange={handleFormChange}
                  rows={3}
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary mt-4"
                disabled={loading}
              >
                {loading ? 'Gerando...' : 'Gerar Relatório'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Filtros de busca */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Buscar Relatórios</h2>
          </div>
          
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="busca_titulo">Título</label>
              <input
                type="text"
                id="busca_titulo"
                name="titulo"
                className="form-control"
                value={busca.titulo}
                onChange={handleBuscaChange}
                placeholder="Buscar por título..."
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="busca_paciente_id">Paciente</label>
              <select
                id="busca_paciente_id"
                name="paciente_id"
                className="form-control"
                value={busca.paciente_id}
                onChange={handleBuscaChange}
              >
                <option value="">Todos os pacientes</option>
                {pacientes.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="busca_tipo">Tipo</label>
              <select
                id="busca_tipo"
                name="tipo"
                className="form-control"
                value={busca.tipo}
                onChange={handleBuscaChange}
              >
                <option value="">Todos os tipos</option>
                <option value="sinais_vitais">Sinais Vitais</option>
                <option value="agendamentos">Agendamentos</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="busca_periodo_inicio">Data Inicial</label>
                <input
                  type="date"
                  id="busca_periodo_inicio"
                  name="periodo_inicio"
                  className="form-control"
                  value={busca.periodo_inicio}
                  onChange={handleBuscaChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="busca_periodo_fim">Data Final</label>
                <input
                  type="date"
                  id="busca_periodo_fim"
                  name="periodo_fim"
                  className="form-control"
                  value={busca.periodo_fim}
                  onChange={handleBuscaChange}
                />
              </div>
            </div>
            
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={handleBuscar}
              disabled={loading}
            >
              <FiSearch className="mr-2" />
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Lista de relatórios */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="card-title">Relatórios Gerados</h2>
        </div>
        
        {loading && relatorios.length === 0 ? (
          <div className="text-center p-4">Carregando relatórios...</div>
        ) : relatorios.length === 0 ? (
          <div className="text-center p-4">
            Nenhum relatório encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Paciente</th>
                  <th>Tipo</th>
                  <th>Data de Criação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {relatorios.map(relatorio => (
                  <tr key={relatorio.id}>
                    <td>{relatorio.titulo}</td>
                    <td>{relatorio.pacientes?.nome}</td>
                    <td>
                      <span className={`badge badge-${
                        relatorio.tipo === 'sinais_vitais' ? 'primary' : 'success'
                      }`}>
                        {relatorio.tipo === 'sinais_vitais' ? 'Sinais Vitais' : 'Agendamentos'}
                      </span>
                    </td>
                    <td>{formatarDataHora(relatorio.created_at)}</td>
                    <td>
                      <div className="flex">
                        <button
                          className="btn btn-sm btn-info mr-1"
                          onClick={() => handlePreview(relatorio)}
                          disabled={loading}
                          title="Visualizar"
                        >
                          <FiEye size={16} />
                        </button>
                        
                        <button
                          className="btn btn-sm btn-primary mr-1"
                          onClick={() => exportarPDF(relatorio)}
                          disabled={loading}
                          title="Exportar PDF"
                        >
                          <FiFileText size={16} />
                        </button>
                        
                        <button
                          className="btn btn-sm btn-success mr-1"
                          onClick={() => exportarExcel(relatorio)}
                          disabled={loading}
                          title="Exportar Excel"
                        >
                          <FiDownload size={16} />
                        </button>
                        
                        {podeEditar && (
                          <>
                            <button
                              className="btn btn-sm btn-warning mr-1"
                              onClick={() => handleEditarClick(relatorio)}
                              disabled={loading || editandoId !== null}
                              title="Editar"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleExcluir(relatorio.id)}
                              disabled={loading}
                              title="Excluir"
                            >
                              <FiX size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Formulário de edição */}
        {editandoId && (
          <div className="card-body border-t">
            <h3 className="text-lg font-semibold mb-4">Editar Relatório</h3>
            
            <div className="form-group">
              <label htmlFor="edicao_titulo">Título</label>
              <input
                type="text"
                id="edicao_titulo"
                name="titulo"
                className="form-control"
                value={formEdicao.titulo}
                onChange={handleEdicaoChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="edicao_paciente_id">Paciente</label>
                <select
                  id="edicao_paciente_id"
                  name="paciente_id"
                  className="form-control"
                  value={formEdicao.paciente_id}
                  onChange={handleEdicaoChange}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(paciente => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="edicao_tipo">Tipo de Relatório</label>
                <select
                  id="edicao_tipo"
                  name="tipo"
                  className="form-control"
                  value={formEdicao.tipo}
                  onChange={handleEdicaoChange}
                  required
                >
                  <option value="sinais_vitais">Sinais Vitais</option>
                  <option value="agendamentos">Agendamentos</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="edicao_periodo_inicio">Período Início</label>
                <input
                  type="date"
                  id="edicao_periodo_inicio"
                  name="periodo_inicio"
                  className="form-control"
                  value={formEdicao.periodo_inicio}
                  onChange={handleEdicaoChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="edicao_periodo_fim">Período Fim</label>
                <input
                  type="date"
                  id="edicao_periodo_fim"
                  name="periodo_fim"
                  className="form-control"
                  value={formEdicao.periodo_fim}
                  onChange={handleEdicaoChange}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="edicao_observacoes">Observações</label>
              <textarea
                id="edicao_observacoes"
                name="observacoes"
                className="form-control"
                value={formEdicao.observacoes}
                onChange={handleEdicaoChange}
                rows={3}
              ></textarea>
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
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Preview */}
      {showPreview && previewData && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="modal-title">{previewData.relatorio.titulo}</h2>
              <button
                className="modal-close"
                onClick={handleClosePreview}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="preview-content">
                <div className="preview-header">
                  <div className="preview-info">
                    <p><strong>Paciente:</strong> {previewData.paciente.nome}</p>
                    <p>
                      <strong>Período:</strong>{' '}
                      {previewData.relatorio.periodo_inicio && previewData.relatorio.periodo_fim
                        ? `${formatarData(previewData.relatorio.periodo_inicio)} a ${formatarData(previewData.relatorio.periodo_fim)}`
                        : previewData.relatorio.periodo_inicio
                          ? `A partir de ${formatarData(previewData.relatorio.periodo_inicio)}`
                          : previewData.relatorio.periodo_fim
                            ? `Até ${formatarData(previewData.relatorio.periodo_fim)}`
                            : 'Todos os registros'
                      }
                    </p>
                    <p><strong>Gerado em:</strong> {formatarDataHora(previewData.relatorio.created_at)}</p>
                  </div>
                </div>
                
                {previewData.relatorio.observacoes && (
                  <div className="preview-section">
                    <h3>Observações</h3>
                    <p>{previewData.relatorio.observacoes}</p>
                  </div>
                )}
                
                {previewData.relatorio.tipo === 'sinais_vitais' && (
                  <>
                    {previewData.dados.estatisticas && previewData.dados.estatisticas.total_registros > 0 && (
                      <div className="preview-section">
                        <h3>Estatísticas</h3>
                        <p><strong>Total de registros:</strong> {previewData.dados.estatisticas.total_registros}</p>
                        
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>Parâmetro</th>
                              <th>Média</th>
                              <th>Mínimo</th>
                              <th>Máximo</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Pressão Sistólica</td>
                              <td>{previewData.dados.estatisticas.pressao_sistolica.media || '-'}</td>
                              <td>{previewData.dados.estatisticas.pressao_sistolica.minima || '-'}</td>
                              <td>{previewData.dados.estatisticas.pressao_sistolica.maxima || '-'}</td>
                            </tr>
                            <tr>
                              <td>Pressão Diastólica</td>
                              <td>{previewData.dados.estatisticas.pressao_diastolica.media || '-'}</td>
                              <td>{previewData.dados.estatisticas.pressao_diastolica.minima || '-'}</td>
                              <td>{previewData.dados.estatisticas.pressao_diastolica.maxima || '-'}</td>
                            </tr>
                            <tr>
                              <td>Temperatura (°C)</td>
                              <td>{previewData.dados.estatisticas.temperatura.media || '-'}</td>
                              <td>{previewData.dados.estatisticas.temperatura.minima || '-'}</td>
                              <td>{previewData.dados.estatisticas.temperatura.maxima || '-'}</td>
                            </tr>
                            <tr>
                              <td>Freq. Cardíaca (bpm)</td>
                              <td>{previewData.dados.estatisticas.frequencia_cardiaca.media || '-'}</td>
                              <td>{previewData.dados.estatisticas.frequencia_cardiaca.minima || '-'}</td>
                              <td>{previewData.dados.estatisticas.frequencia_cardiaca.maxima || '-'}</td>
                            </tr>
                            <tr>
                              <td>Saturação (%)</td>
                              <td>{previewData.dados.estatisticas.saturacao.media || '-'}</td>
                              <td>{previewData.dados.estatisticas.saturacao.minima || '-'}</td>
                              <td>{previewData.dados.estatisticas.saturacao.maxima || '-'}</td>
                            </tr>
                            <tr>
                              <td>Glicemia (mg/dL)</td>
                              <td>{previewData.dados.estatisticas.glicemia.media || '-'}</td>
                              <td>{previewData.dados.estatisticas.glicemia.minima || '-'}</td>
                              <td>{previewData.dados.estatisticas.glicemia.maxima || '-'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <div className="preview-section">
                      <h3>Registros</h3>
                      
                      {previewData.dados.registros.length === 0 ? (
                        <p>Nenhum registro encontrado para o período selecionado.</p>
                      ) : (
                        <div className="preview-table-container">
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>Data/Hora</th>
                                <th>Pressão</th>
                                <th>Temp.</th>
                                <th>FC</th>
                                <th>Sat.</th>
                                <th>Glicemia</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.dados.registros.map((registro, index) => (
                                <tr key={index}>
                                  <td>{formatarDataHora(registro.data_hora)}</td>
                                  <td>{registro.pressao_arterial || '-'}</td>
                                  <td>{registro.temperatura ? `${registro.temperatura} °C` : '-'}</td>
                                  <td>{registro.frequencia_cardiaca ? `${registro.frequencia_cardiaca} bpm` : '-'}</td>
                                  <td>{registro.saturacao ? `${registro.saturacao}%` : '-'}</td>
                                  <td>{registro.glicemia ? `${registro.glicemia} mg/dL` : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                {previewData.relatorio.tipo === 'agendamentos' && (
                  <>
                    {previewData.dados.estatisticas && previewData.dados.estatisticas.total_agendamentos > 0 && (
                      <div className="preview-section">
                        <h3>Estatísticas</h3>
                        <p><strong>Total de agendamentos:</strong> {previewData.dados.estatisticas.total_agendamentos}</p>
                        
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>Tipo</th>
                              <th>Quantidade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(previewData.dados.estatisticas.tipos_agendamento).map(([tipo, quantidade], index) => (
                              <tr key={index}>
                                <td>{tipo}</td>
                                <td>{quantidade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <div className="preview-section">
                      <h3>Agendamentos</h3>
                      
                      {previewData.dados.registros.length === 0 ? (
                        <p>Nenhum agendamento encontrado para o período selecionado.</p>
                      ) : (
                        <div className="preview-table-container">
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Observações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.dados.registros.map((registro, index) => (
                                <tr key={index}>
                                  <td>{formatarData(registro.data)}</td>
                                  <td>{registro.hora}</td>
                                  <td>{registro.tipo}</td>
                                  <td>{registro.observacoes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={handleClosePreview}
              >
                Fechar
              </button>
              <button
                className="btn btn-primary ml-2"
                onClick={() => exportarPDF(previewData.relatorio)}
              >
                <FiFileText className="mr-2" />
                Exportar PDF
              </button>
              <button
                className="btn btn-success ml-2"
                onClick={() => exportarExcel(previewData.relatorio)}
              >
                <FiDownload className="mr-2" />
                Exportar Excel
              </button>
              <button
                className="btn btn-info ml-2"
                onClick={() => window.print()}
              >
                <FiPrinter className="mr-2" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
