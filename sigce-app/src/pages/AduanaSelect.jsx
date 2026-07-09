import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BORDER_CROSSINGS } from '../services/borderCrossings';

function AduanaSelect() {
  const navigate = useNavigate();

  return (
    <div className="aduana-select-page">
      <div className="aduana-hero">
        <div className="hero-content">
          <span className="hero-icon">🛂</span>
          <h1>SIGCE</h1>
          <p className="hero-subtitle">Sistema Integrado de Gestión de Comercio Exterior</p>
          <p className="hero-desc">
            Realiza tu check-in anticipado y agiliza tu paso por la aduana chilena.
            Selecciona el paso fronterizo para comenzar.
          </p>
        </div>
      </div>

      <div className="aduana-grid-section">
        <h2 className="section-title">🌎 Pasos Fronterizos — República Argentina</h2>
        <p className="section-subtitle">Elige tu punto de cruce para iniciar el check-in anticipado</p>

        <div className="aduana-grid">
          {BORDER_CROSSINGS.map(aduana => (
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
                <span className="aduana-card-icon">{aduana.icon}</span>
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

      <div className="aduana-footer-info">
        <div className="info-cards">
          <div className="info-mini-card">
            <span className="info-icon">✅</span>
            <h4>Check-In Anticipado</h4>
            <p>Completa tus trámites antes de llegar a la frontera</p>
          </div>
          <div className="info-mini-card">
            <span className="info-icon">📴</span>
            <h4>Modo Offline</h4>
            <p>Funciona sin internet, sincroniza automáticamente</p>
          </div>
          <div className="info-mini-card">
            <span className="info-icon">🔐</span>
            <h4>Cuenta de Viajero</h4>
            <p>Crea tu cuenta para gestionar y seguir tus trámites</p>
          </div>
        </div>
        <div className="entities-bar">
          <span>Entidades participantes en el control fronterizo:</span>
          <span className="entity-badge">🛂 Aduanas Chile</span>
          <span className="entity-badge">🕵️ PDI — Policía de Investigaciones</span>
          <span className="entity-badge">🌱 SAG — Servicio Agrícola y Ganadero</span>
        </div>
      </div>
    </div>
  );
}

export default AduanaSelect;
