import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiMenu } from 'react-icons/fi';

const Header = ({ toggleSidebar }) => {
  const { signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="header">
      <div className="container header-container">
        <div className="flex items-center gap-4">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <FiMenu size={24} />
          </button>
          <Link to="/dashboard">
            <img src="/images/logo.jpeg" alt="Macena Health" className="header-logo" />
          </Link>
        </div>
        <nav className="header-nav">
          <Link 
            to="/dashboard" 
            className={`header-nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/pacientes" 
            className={`header-nav-item ${location.pathname.includes('/pacientes') ? 'active' : ''}`}
          >
            Pacientes
          </Link>
          <Link 
            to="/sinais-vitais" 
            className={`header-nav-item ${location.pathname.includes('/sinais-vitais') ? 'active' : ''}`}
          >
            Sinais Vitais
          </Link>
          <button onClick={handleSignOut} className="header-nav-item flex items-center gap-2">
            <FiLogOut /> Sair
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
