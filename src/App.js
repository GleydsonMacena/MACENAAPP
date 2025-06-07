import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Componentes
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PacientesLista from './pages/PacientesLista';
import PacienteDetalhe from './pages/PacienteDetalhe';
import SinaisVitais from './pages/SinaisVitais';
import Agendamentos from './pages/Agendamentos';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

// Estilos
import './styles/global.css';

// Rota protegida que verifica autenticação
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Carregando...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Navigate to="/dashboard" />
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/pacientes" element={
            <ProtectedRoute>
              <AppLayout>
                <PacientesLista />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/pacientes/:id" element={
            <ProtectedRoute>
              <AppLayout>
                <PacienteDetalhe />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/sinais-vitais" element={
            <ProtectedRoute>
              <AppLayout>
                <SinaisVitais />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/agendamentos" element={
            <ProtectedRoute>
              <AppLayout>
                <Agendamentos />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/relatorios" element={
            <ProtectedRoute>
              <AppLayout>
                <Relatorios />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/configuracoes" element={
            <ProtectedRoute>
              <AppLayout>
                <Configuracoes />
              </AppLayout>
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
