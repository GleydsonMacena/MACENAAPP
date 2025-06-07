import React, { useState, useEffect } from 'react';
import { FiActivity, FiAlertCircle, FiSave } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

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

const RegistroSinais = () => {
  const { user, profile } = useAuth();
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [alertas, setAlertas] = useState([]);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  
  const [formData, setFormData] = useState({
    paciente_id: '',
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
  
  const [imc, setImc] = useState(null);
  const [classificacaoImc, setClassificacaoImc] = useState('');

  useEffect(() => {
    fetchPacientes();
  }, []);
  
  useEffect(() => {
    // Calcular IMC quando peso ou altura mudar
    if (formData.peso && formData.altura) {
      const peso = parseFloat(formData.peso);
      const alturaMetros = parseFloat(formData.altura) / 100; // converter cm para metros
      
      if (!isNaN(peso) && !isNaN(alturaMetros) && alturaMetros > 0) {
        const imcCalculado = peso / (alturaMetros * alturaMetros);
        const imcArredondado = Math.round(imcCalculado * 10) / 10;
        setImc(imcArredondado);
        
        // Classificar IMC
        if (imcArredondado < 18.5) {
          setClassificacaoImc('Abaixo do peso');
        } else if (imcArredondado < 25) {
          setClassificacaoImc('Peso normal');
        } else if (imcArredondado < 30) {
          setClassificacaoImc('Sobrepeso');
        } else if (imcArredondado < 35) {
          setClassificacaoImc('Obesidade grau I');
        } else if (imcArredondado < 40) {
          setClassificacaoImc('Obesidade grau II');
        } else {
          setClassificacaoImc('Obesidade grau III');
        }
      } else {
        setImc(null);
        setClassificacaoImc('');
      }
    } else {
      setImc(null);
      setClassificacaoImc('');
    }
  }, [formData.peso, formData.altura]);

  const fetchPacientes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setPacientes(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error.message);
      setError('Erro ao carregar lista de pacientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const verificarAlertas = () => {
    const novosAlertas = [];
    
    // Verificar pressão sistólica
    if (formData.pressao_sistolica) {
      const sistolica = parseInt(formData.pressao_sistolica);
      if (sistolica < parametrosNormais.pressao_sistolica.min) {
        novosAlertas.push(`Pressão sistólica (${sistolica}) abaixo do normal (${parametrosNormais.pressao_sistolica.min})`);
      } else if (sistolica > parametrosNormais.pressao_sistolica.max) {
        novosAlertas.push(`Pressão sistólica (${sistolica}) acima do normal (${parametrosNormais.pressao_sistolica.max})`);
      }
    }
    
    // Verificar pressão diastólica
    if (formData.pressao_diastolica) {
      const diastolica = parseInt(formData.pressao_diastolica);
      if (diastolica < parametrosNormais.pressao_diastolica.min) {
        novosAlertas.push(`Pressão diastólica (${diastolica}) abaixo do normal (${parametrosNormais.pressao_diastolica.min})`);
      } else if (diastolica > parametrosNormais.pressao_diastolica.max) {
        novosAlertas.push(`Pressão diastólica (${diastolica}) acima do normal (${parametrosNormais.pressao_diastolica.max})`);
      }
    }
    
    // Verificar temperatura
    if (formData.temperatura) {
      const temperatura = parseFloat(formData.temperatura);
      if (temperatura < parametrosNormais.temperatura.min) {
        novosAlertas.push(`Temperatura (${temperatura}°C) abaixo do normal (${parametrosNormais.temperatura.min}°C)`);
      } else if (temperatura > parametrosNormais.temperatura.max) {
        novosAlertas.push(`Temperatura (${temperatura}°C) acima do normal (${parametrosNormais.temperatura.max}°C)`);
      }
    }
    
    // Verificar frequência cardíaca
    if (formData.frequencia_cardiaca) {
      const fc = parseInt(formData.frequencia_cardiaca);
      if (fc < parametrosNormais.frequencia_cardiaca.min) {
        novosAlertas.push(`Frequência cardíaca (${fc} bpm) abaixo do normal (${parametrosNormais.frequencia_cardiaca.min} bpm)`);
      } else if (fc > parametrosNormais.frequencia_cardiaca.max) {
        novosAlertas.push(`Frequência cardíaca (${fc} bpm) acima do normal (${parametrosNormais.frequencia_cardiaca.max} bpm)`);
      }
    }
    
    // Verificar frequência respiratória
    if (formData.frequencia_respiratoria) {
      const fr = parseInt(formData.frequencia_respiratoria);
      if (fr < parametrosNormais.frequencia_respiratoria.min) {
        novosAlertas.push(`Frequência respiratória (${fr} irpm) abaixo do normal (${parametrosNormais.frequencia_respiratoria.min} irpm)`);
      } else if (fr > parametrosNormais.frequencia_respiratoria.max) {
        novosAlertas.push(`Frequência respiratória (${fr} irpm) acima do normal (${parametrosNormais.frequencia_respiratoria.max} irpm)`);
      }
    }
    
    // Verificar saturação
    if (formData.saturacao) {
      const sat = parseInt(formData.saturacao);
      if (sat < parametrosNormais.saturacao.min) {
        novosAlertas.push(`Saturação (${sat}%) abaixo do normal (${parametrosNormais.saturacao.min}%)`);
      }
    }
    
    // Verificar glicemia
    if (formData.glicemia) {
      const glicemia = parseInt(formData.glicemia);
      if (glicemia < parametrosNormais.glicemia.min) {
        novosAlertas.push(`Glicemia (${glicemia} mg/dL) abaixo do normal (${parametrosNormais.glicemia.min} mg/dL)`);
      } else if (glicemia > parametrosNormais.glicemia.max) {
        novosAlertas.push(`Glicemia (${glicemia} mg/dL) acima do normal (${parametrosNormais.glicemia.max} mg/dL)`);
      }
    }
    
    return novosAlertas;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAlertas([]);
    setMostrarAlertas(false);
    
    try {
      setLoading(true);
      
      // Validar formulário
      if (!formData.paciente_id) {
        throw new Error('Selecione um paciente.');
      }
      
      // Verificar alertas
      const novosAlertas = verificarAlertas();
      
      // Formatar pressão arterial
      const pressao_arterial = formData.pressao_sistolica && formData.pressao_diastolica
        ? `${formData.pressao_sistolica}/${formData.pressao_diastolica}`
        : null;
      
      // Inserir registro
      const { data, error } = await supabase
        .from('sinais_vitais')
        .insert([
          {
            paciente_id: formData.paciente_id,
            data_hora: new Date().toISOString(),
            pressao_arterial,
            temperatura: formData.temperatura || null,
            frequencia_cardiaca: formData.frequencia_cardiaca || null,
            frequencia_respiratoria: formData.frequencia_respiratoria || null,
            saturacao: formData.saturacao || null,
            glicemia: formData.glicemia || null,
            peso: formData.peso || null,
            altura: formData.altura || null,
            imc: imc || null,
            observacoes: formData.observacoes,
            created_by: user.id
          }
        ])
        .select();

      if (error) throw error;
      
      // Se houver alertas, mostrar para o usuário e enviar notificações
      if (novosAlertas.length > 0) {
        setAlertas(novosAlertas);
        setMostrarAlertas(true);
        
        // Buscar nome do paciente
        const { data: pacienteData } = await supabase
          .from('pacientes')
          .select('nome')
          .eq('id', formData.paciente_id)
          .single();
        
        const pacienteNome = pacienteData?.nome || 'Paciente';
        
        // Enviar notificação para administradores e enfermeiros
        const mensagemAlerta = `Paciente: ${pacienteNome}\n${novosAlertas.join('\n')}`;
        
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
                paciente_id: formData.paciente_id,
                paciente_nome: pacienteNome,
                sinais_vitais_id: data[0].id,
                alertas: novosAlertas
              })
            }
          ]);
      }
      
      // Limpar formulário
      setFormData({
        paciente_id: '',
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
      
      setSuccess('Registro de sinais vitais salvo com sucesso!');
      
    } catch (error) {
      console.error('Erro ao salvar registro:', error.message);
      setError('Erro ao salvar registro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Registrar Sinais Vitais</h2>
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
        
        {mostrarAlertas && alertas.length > 0 && (
          <div className="alert alert-warning mb-4">
            <div className="flex items-center mb-2">
              <FiAlertCircle size={20} className="mr-2" />
              <strong>Atenção! Valores fora dos parâmetros normais:</strong>
            </div>
            <ul className="list-disc pl-5">
              {alertas.map((alerta, index) => (
                <li key={index}>{alerta}</li>
              ))}
            </ul>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="paciente_id">Paciente</label>
            <select
              id="paciente_id"
              name="paciente_id"
              className="form-control"
              value={formData.paciente_id}
              onChange={handleChange}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="pressao_sistolica">Pressão Sistólica</label>
              <input
                type="number"
                id="pressao_sistolica"
                name="pressao_sistolica"
                className="form-control"
                value={formData.pressao_sistolica}
                onChange={handleChange}
                placeholder="Ex: 120"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="pressao_diastolica">Pressão Diastólica</label>
              <input
                type="number"
                id="pressao_diastolica"
                name="pressao_diastolica"
                className="form-control"
                value={formData.pressao_diastolica}
                onChange={handleChange}
                placeholder="Ex: 80"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label htmlFor="temperatura">Temperatura (°C)</label>
              <input
                type="number"
                id="temperatura"
                name="temperatura"
                className="form-control"
                value={formData.temperatura}
                onChange={handleChange}
                placeholder="Ex: 36.5"
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
                value={formData.frequencia_cardiaca}
                onChange={handleChange}
                placeholder="Ex: 75"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="frequencia_respiratoria">Frequência Respiratória (irpm)</label>
              <input
                type="number"
                id="frequencia_respiratoria"
                name="frequencia_respiratoria"
                className="form-control"
                value={formData.frequencia_respiratoria}
                onChange={handleChange}
                placeholder="Ex: 16"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label htmlFor="saturacao">Saturação (%)</label>
              <input
                type="number"
                id="saturacao"
                name="saturacao"
                className="form-control"
                value={formData.saturacao}
                onChange={handleChange}
                placeholder="Ex: 98"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="glicemia">Glicemia (mg/dL)</label>
              <input
                type="number"
                id="glicemia"
                name="glicemia"
                className="form-control"
                value={formData.glicemia}
                onChange={handleChange}
                placeholder="Ex: 90"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label htmlFor="peso">Peso (kg)</label>
              <input
                type="number"
                id="peso"
                name="peso"
                className="form-control"
                value={formData.peso}
                onChange={handleChange}
                placeholder="Ex: 70.5"
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
                value={formData.altura}
                onChange={handleChange}
                placeholder="Ex: 170"
              />
            </div>
            
            <div className="form-group">
              <label>IMC</label>
              <div className="form-control bg-light">
                {imc ? (
                  <>
                    <strong>{imc.toFixed(1)}</strong>
                    <span className="text-muted ml-2">
                      ({classificacaoImc})
                    </span>
                  </>
                ) : (
                  <span className="text-muted">
                    Informe peso e altura para calcular
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="observacoes">Observações</label>
            <textarea
              id="observacoes"
              name="observacoes"
              className="form-control"
              value={formData.observacoes}
              onChange={handleChange}
              rows={3}
            ></textarea>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary mt-4"
            disabled={loading}
          >
            <FiSave className="mr-2" />
            {loading ? 'Salvando...' : 'Salvar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistroSinais;
