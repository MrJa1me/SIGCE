import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Icon } from '../components/icons';

function TravelerHome() {
  const { user } = useAuth();

  if (user?.role === 'traveler') {
    return <Navigate to="/pasos" replace />;
  }

  return (
    <div className="traveler-home-page">
      <div className="traveler-home-header">
        <Link to="/" className="back-link">← Volver</Link>
        <Icon name="traveler" size="xl" className="traveler-home-icon-svg" />
        <h1>Área de Viajeros</h1>
        <p>Crea tu cuenta o inicia sesión para gestionar tus trámites fronterizos</p>
      </div>

      <div className="traveler-home-actions">
        <Link to="/viajero/registro" className="traveler-action-card traveler-action-primary">
          <span className="action-icon-wrap"><Icon name="userPlus" size="lg" /></span>
          <div>
            <h3>Crear cuenta</h3>
            <p>Regístrate gratis para guardar y seguir tus trámites</p>
          </div>
        </Link>

        <Link to="/viajero/ingreso" className="traveler-action-card">
          <span className="action-icon-wrap"><Icon name="lock" size="lg" /></span>
          <div>
            <h3>Ya tengo cuenta</h3>
            <p>Inicia sesión con tu usuario y contraseña</p>
          </div>
        </Link>

        <Link to="/pasos" className="traveler-action-card traveler-action-muted">
          <span className="action-icon-wrap"><Icon name="globe" size="lg" /></span>
          <div>
            <h3>Ver pasos fronterizos</h3>
            <p>Explora los puntos de cruce disponibles</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default TravelerHome;
