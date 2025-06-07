import React, { useState } from 'react';
import { FiHome, FiUsers, FiActivity, FiSettings, FiFileText, FiCalendar } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: <FiHome size={20} />, label: 'Dashboard' },
    { path: '/pacientes', icon: <FiUsers size={20} />, label: 'Pacientes' },
    { path: '/sinais-vitais', icon: <FiActivity size={20} />, label: 'Sinais Vitais' },
    { path: '/agendamentos', icon: <FiCalendar size={20} />, label: 'Agendamentos' },
    { path: '/relatorios', icon: <FiFileText size={20} />, label: 'Relatórios' },
    { path: '/configuracoes', icon: <FiSettings size={20} />, label: 'Configurações' },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src="/images/logo.jpeg" alt="Macena Health" className="sidebar-logo" />
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
