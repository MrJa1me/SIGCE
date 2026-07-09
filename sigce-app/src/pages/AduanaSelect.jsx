import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBorderCrossings } from '../context/BorderCrossingsContext';
import { Icon } from '../components/icons';

function AduanaSelect() {
  const navigate = useNavigate();
  const { crossings, loading } = useBorderCrossings();

  const byCountry = crossings.reduce((acc, bc) => {
    const key = bc.country || 'Otro';
    if (!acc[key]) acc[key] = [];
    acc[key].push(bc);
    return acc;
  }, {});

  return (
    <div className="aduana-select-page">
      <div className="aduana-hero">
        <div className="hero-content">
          <Icon name="logo" size="xl" className="hero-icon-svg" />
          <h1>SIGCE</h1>
          <p className="hero-subtitle">Sistema Integrado de Gestión de Comercio Exterior</p>
          <p className="hero-desc">
            Realiza tu check-in anticipado y agiliza tu paso por la aduana chilena.
            Selecciona el paso fronterizo para comenzar.
          </p>
        </div>
      </div>

      <div className="aduana-grid-section">
        <h2 className="section-title">
          <Icon name="globe" size="md" className="section-title-icon" />
          Pasos Fronterizos de Chile
        </h2>
        <p className="section-subtitle">Elige tu punto de cruce para iniciar el check-in anticipado</p>

        {loading && <div className="loading">Cargando pasos fronterizos...</div>}

        {Object.entries(byCountry).map(([country, list]) => (
          <div key={country} className="aduana-country-group">
            <h3 className="aduana-country-title">Frontera con {country}</h3>
            <div className="aduana-grid">
              {list.map(aduana => (
            <button
              key={aduana.id}
              className="aduana-card"
              onClick={() => navigate(`/aduana/${aduana.id}`)}
              style={{
                '--card-gradient': aduana.gradient,
                '--card-color': aduana.color,
                '--card-bg': aduana.colorBg,
              }}
            >
              <div className="aduana-card-bg" style={{ background: aduana.gradient }}>
                <span className="aduana-card-code">{aduana.code}</span>
              </div>
              <div className="aduana-card-body">
                <h3>{aduana.name}</h3>
                <p className="aduana-region">{aduana.region}</p>
                <p className="aduana-desc">{aduana.description}</p>
                <div className="aduana-stats">
                  <div className="aduana-stat">
                    <span className="stat-value">{aduana.stats.dailyFlow}</span>
                    <span className="stat-label">Flujo diario</span>
                  </div>
                  <div className="aduana-stat">
                    <span className="stat-value">{aduana.stats.avgWait}</span>
                    <span className="stat-label">Espera promedio</span>
                  </div>
                  <div className="aduana-stat">
                    <span className="stat-value">{aduana.stats.altitude}</span>
                    <span className="stat-label">Altitud</span>
                  </div>
                </div>
                <div className="aduana-card-action">
                  <span className="btn-aduana">Ingresar a {aduana.shortName} →</span>
                </div>
              </div>
            </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="aduana-footer-info">
        <div className="info-cards">
          <div className="info-mini-card">
            <span className="info-icon-wrap"><Icon name="check" size="lg" /></span>
            <h4>Check-In Anticipado</h4>
            <p>Completa tus trámites antes de llegar a la frontera</p>
          </div>
          <div className="info-mini-card">
            <span className="info-icon-wrap"><Icon name="offline" size="lg" /></span>
            <h4>Modo Offline</h4>
            <p>Funciona sin internet, sincroniza automáticamente</p>
          </div>
          <div className="info-mini-card">
            <span className="info-icon-wrap"><Icon name="lock" size="lg" /></span>
            <h4>Cuenta de Viajero</h4>
            <p>Crea tu cuenta para gestionar y seguir tus trámites</p>
          </div>
        </div>
        <div className="entities-bar">
          <span>Entidades participantes en el control fronterizo:</span>
          <span className="entity-badge">Aduanas Chile</span>
          <span className="entity-badge">PDI — Policía de Investigaciones</span>
          <span className="entity-badge">SAG — Servicio Agrícola y Ganadero</span>
        </div>
      </div>
    </div>
  );
}

export default AduanaSelect;
