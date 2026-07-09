import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Icon } from '../components/icons';

function RoleSelect() {
  const { user } = useAuth();

  if (user?.role === 'traveler') return <Navigate to="/pasos" replace />;
  if (user?.role === 'official') return <Navigate to="/oficial" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;

  return (
    <div className="traveler-landing-page">
      <div className="traveler-landing-hero">
        <Icon name="logo" size="xl" className="traveler-landing-icon" />
        <h1>Check-In Fronterizo</h1>
        <p className="traveler-landing-subtitle">SIGCE — Sistema Integrado de Gestión de Comercio Exterior</p>
        <p className="traveler-landing-desc">
          Realiza tu trámite anticipado antes de llegar al paso fronterizo y agiliza tu ingreso a Chile.
        </p>
      </div>

      <div className="traveler-landing-actions">
        <Link to="/pasos" className="traveler-landing-cta">
          <Icon name="globe" size="lg" />
          <span>
            <strong>Comenzar check-in</strong>
            <small>Selecciona tu paso fronterizo</small>
          </span>
        </Link>

        <Link to="/viajero/registro" className="traveler-landing-secondary">
          <Icon name="userPlus" size="md" />
          <span>Crear cuenta de viajero</span>
        </Link>

        <Link to="/viajero/ingreso" className="traveler-landing-secondary">
          <Icon name="lock" size="md" />
          <span>Ya tengo cuenta — iniciar sesión</span>
        </Link>
      </div>

      <div className="traveler-landing-benefits">
        <div className="landing-benefit">
          <Icon name="check" size="md" />
          <span>Trámites anticipados en línea</span>
        </div>
        <div className="landing-benefit">
          <Icon name="offline" size="md" />
          <span>Funciona sin conexión</span>
        </div>
        <div className="landing-benefit">
          <Icon name="file" size="md" />
          <span>Adjunta documentos en el mismo formulario</span>
        </div>
      </div>

      <details className="staff-access-panel">
        <summary className="staff-access-summary">
          <Icon name="shield" size="sm" />
          Acceso personal de aduana
        </summary>
        <div className="staff-access-body">
          <p>Área restringida para funcionarios y administradores del sistema.</p>
          <Link to="/portal" className="btn btn-secondary btn-sm">
            Ingresar al portal interno →
          </Link>
        </div>
      </details>
    </div>
  );
}

export default RoleSelect;
