import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/icons';

function RoleSelect() {
  return (
    <div className="role-select-page">
      <div className="role-hero">
        <Icon name="logo" size="xl" className="role-hero-icon-svg" />
        <h1>SIGCE</h1>
        <p className="role-hero-subtitle">Sistema Integrado de Gestión de Comercio Exterior</p>
        <p className="role-hero-desc">Selecciona cómo deseas ingresar al sistema</p>
      </div>

      <div className="role-cards">
        <Link to="/viajero" className="role-card role-card-traveler">
          <span className="role-card-icon-wrap"><Icon name="traveler" size="lg" /></span>
          <h2>Soy Viajero</h2>
          <p>Realiza tu check-in anticipado en pasos fronterizos terrestres</p>
          <ul className="role-card-features">
            <li>Crear cuenta y gestionar trámites</li>
            <li>Consultar estado de solicitudes</li>
            <li>Modo offline disponible</li>
          </ul>
          <span className="role-card-action">Continuar como viajero →</span>
        </Link>

        <Link to="/login" className="role-card role-card-staff">
          <span className="role-card-icon-wrap"><Icon name="user" size="lg" /></span>
          <h2>Soy Funcionario</h2>
          <p>Acceso para personal de aduana y administración</p>
          <ul className="role-card-features">
            <li>Procesar solicitudes de viajeros</li>
            <li>Revisión PDI y gestión de estados</li>
            <li>Panel de control oficial</li>
          </ul>
          <span className="role-card-action">Ingresar al panel →</span>
        </Link>
      </div>

      <p className="role-footer-note">
        ¿Eres administrador? Usa el acceso de funcionario con tus credenciales de admin.
      </p>
    </div>
  );
}

export default RoleSelect;
