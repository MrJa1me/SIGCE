import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../App';
import { BORDER_CROSSINGS, getBorderCrossing } from '../services/borderCrossings';
import { saveCheckinLocally } from '../services/offlineDb';
import { createCheckin } from '../services/api';

const initialForm = {
  fullName: '',
  rut: '',
  nationality: 'Chilena',
  email: '',
  phone: '',
  checkinType: '',
  // Vehicle fields
  patent: '',
  brand: '',
  model: '',
  vehicleYear: '',
  vehicleType: 'particular',
  // Minor fields
  minorName: '',
  minorRut: '',
  minorAccompaniedBy: 'both',
  hasMinorAuthorization: false,
  // Pet fields
  petType: 'dog',
  petName: '',
  petBreed: '',
  petHasVaccines: false,
  petHasMicrochip: false,
  // General
  // PDI / Migraciones
  passportNumber: '',
  documentType: 'ci',
  nationalityCountry: 'Chile',
  comments: '',
};

function AduanaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { online } = useAuth();
  const aduana = getBorderCrossing(id);

  const [step, setStep] = useState('select'); // 'select' | 'form' | 'confirmation'
  const [checkinType, setCheckinType] = useState('');
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState('');

  if (!aduana) {
    return (
      <div className="page-container">
        <div className="card empty-state">
          <span className="empty-icon">❌</span>
          <h3>Aduana no encontrada</h3>
          <p>El paso fronterizo que buscas no existe.</p>
          <Link to="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const selectType = (type) => {
    setCheckinType(type);
    setForm(initialForm);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const details = {};
    if (checkinType === 'vehicle') {
      details.patent = form.patent;
      details.brand = form.brand;
      details.model = form.model;
      details.vehicleYear = form.vehicleYear;
      details.vehicleType = form.vehicleType;
      details.maxDays = form.vehicleType === 'diplomatic' ? 90 : 180;
    } else if (checkinType === 'minor') {
      details.minorName = form.minorName;
      details.minorRut = form.minorRut;
      details.minorAccompaniedBy = form.minorAccompaniedBy;
      details.hasMinorAuthorization = form.hasMinorAuthorization;
    } else if (checkinType === 'pet') {
      details.petType = form.petType;
      details.petName = form.petName;
      details.petBreed = form.petBreed;
      details.petHasVaccines = form.petHasVaccines;
      details.petHasMicrochip = form.petHasMicrochip;
    }



    const checkinData = {
      localId: crypto.randomUUID(),
      userId: null,
      userName: form.fullName || 'Visitante',
      rut: form.rut,
      nationality: form.nationality,
      email: form.email,
      phone: form.phone,
      checkinType: checkinType,
      borderCrossing: aduana.id,
      status: 'pending',
      details,
      comments: form.comments,
      createdAt: new Date().toISOString(),
      synced: false,
      version: 1,
    };

    try {
      const localSaved = await saveCheckinLocally(checkinData);
      if (online) {
        try { await createCheckin(checkinData); } catch { /* sync later */ }
      }
      setConfirmation(localSaved);
      setStep('confirmation');
      setForm(initialForm);
    } catch (err) {
      setError('Error al guardar: ' + err.message);
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setStep('select');
    setCheckinType('');
    setConfirmation(null);
    setForm(initialForm);
  };

  return (
    <div className="aduana-page" style={{ '--aduana-color': aduana.color, '--aduana-light': aduana.colorLight, '--aduana-bg': aduana.colorBg }}>
      {/* Aduana Header */}
      <div className="aduana-header" style={{ background: aduana.gradient }}>
        <button className="aduana-back" onClick={() => navigate('/')}>← Volver a pasos fronterizos</button>
        <div className="aduana-header-info">
          <span className="aduana-big-icon">{aduana.icon}</span>
          <div>
            <h1>{aduana.name}</h1>
            <p className="aduana-header-region">{aduana.region} — Frontera Chile-{aduana.country}</p>
            <div className="aduana-header-stats">
              <span>📊 Flujo: {aduana.stats.dailyFlow} personas/día</span>
              <span>⏱ Espera: {aduana.stats.avgWait}</span>
              <span>🏔️ Altitud: {aduana.stats.altitude}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step: Select type */}
      {step === 'select' && (
        <div className="aduana-content">
          {!online && <div className="alert alert-warning">📴 Sin conexión — los datos se guardarán localmente y se sincronizarán después</div>}
          <h2 className="aduana-section-title">Check-In Anticipado — {aduana.shortName}</h2>
          <p className="aduana-section-subtitle">
            Selecciona el tipo de trámite que deseas realizar. Al llegar a la aduana, preséntate con tu código de confirmación.
          </p>

          <div className="type-grid aduana-type-grid">
            <button className="type-card vehicle" onClick={() => selectType('vehicle')} style={{ borderColor: aduana.color }}>
              <span className="type-icon">🚗</span>
              <span className="type-label">Vehículo</span>
              <span className="type-desc">Salida/entrada temporal de vehículo particular o diplomático</span>
              <span className="type-info">📄 Acuerdo Chileno-Argentino</span>
            </button>
            <button className="type-card minor" onClick={() => selectType('minor')} style={{ borderColor: aduana.color }}>
              <span className="type-icon">👶</span>
              <span className="type-label">Menor de Edad</span>
              <span className="type-desc">Autorización para viaje de menores con o sin compañía</span>
              <span className="type-info">📄 Cédula + Autorización notarial</span>
            </button>
            <button className="type-card pet" onClick={() => selectType('pet')} style={{ borderColor: aduana.color }}>
              <span className="type-icon">🐾</span>
              <span className="type-label">Mascota</span>
              <span className="type-desc">Declaración jurada SAG para ingreso con mascotas</span>
              <span className="type-info">📄 Vacunas al día + Microchip</span>
            </button>
            <button className="type-card general" onClick={() => selectType('general')} style={{ borderColor: aduana.color }}>
              <span className="type-icon">📋</span>
              <span className="type-label">Trámite General</span>
              <span className="type-desc">Otros trámites aduaneros o consultas</span>
              <span className="type-info">📄 Consulta general</span>
            </button>
          </div>
        </div>
      )}

      {/* Step: Form */}
      {step === 'form' && (
        <div className="aduana-content">
          <div className="card checkin-form aduana-form-card" style={{ borderTop: `4px solid ${aduana.color}` }}>
            <button className="btn-back" onClick={() => setStep('select')}>← Elegir otro trámite</button>
            <div className="form-badge" style={{ background: aduana.gradient }}>
              {aduana.icon} {aduana.shortName} —{' '}
              {checkinType === 'vehicle' ? '🚗 Vehículo' : checkinType === 'minor' ? '👶 Menor de Edad' : checkinType === 'pet' ? '🐾 Mascota' : '📋 General'}
            </div>
            <p className="card-subtitle">Completa tus datos. Si pierdes conexión, se guardarán localmente.</p>

            <form onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              {!online && <div className="alert alert-warning">📴 Sin conexión — datos guardados localmente</div>}

              <div className="form-section">
                <h3>👤 Tus Datos</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre Completo</label>
                    <input type="text" value={form.fullName} onChange={e => updateField('fullName', e.target.value)} placeholder="Ej: Juan Pérez" required />
                  </div>
                  <div className="form-group">
                    <label>RUT / Pasaporte</label>
                    <input type="text" value={form.rut} onChange={e => updateField('rut', e.target.value)} placeholder="12.345.678-9" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nacionalidad</label>
                    <select value={form.nationality} onChange={e => updateField('nationality', e.target.value)}>
                      <option value="Chilena">Chilena</option>
                      <option value="Argentina">Argentina</option>
                      <option value="Otra">Otra</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="correo@ejemplo.cl" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+569 1234 5678" />
                </div>
              </div>

              {/* Vehicle fields */}
              {checkinType === 'vehicle' && (
                <div className="form-section">
                  <h3>🚗 Datos del Vehículo</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Patente</label>
                      <input type="text" value={form.patent} onChange={e => updateField('patent', e.target.value)} placeholder="ABCD-12" required />
                    </div>
                    <div className="form-group">
                      <label>Tipo</label>
                      <select value={form.vehicleType} onChange={e => updateField('vehicleType', e.target.value)}>
                        <option value="particular">Particular (180 días)</option>
                        <option value="diplomatic">Diplomático (90 días)</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row three">
                    <div className="form-group">
                      <label>Marca</label>
                      <input type="text" value={form.brand} onChange={e => updateField('brand', e.target.value)} placeholder="Toyota" required />
                    </div>
                    <div className="form-group">
                      <label>Modelo</label>
                      <input type="text" value={form.model} onChange={e => updateField('model', e.target.value)} placeholder="Corolla" required />
                    </div>
                    <div className="form-group">
                      <label>Año</label>
                      <input type="number" value={form.vehicleYear} onChange={e => updateField('vehicleYear', e.target.value)} placeholder="2024" />
                    </div>
                  </div>
                  <div className="info-box" style={{ background: aduana.colorBg, borderColor: aduana.color }}>
                    <strong>📌 Acuerdo Chileno-Argentino:</strong> Particulares hasta 180 días. Diplomáticos (C.D., CC) hasta 90 días.
                  </div>
                </div>
              )}

              {/* Minor fields */}
              {checkinType === 'minor' && (
                <div className="form-section">
                  <h3>👶 Datos del Menor</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nombre del Menor</label>
                      <input type="text" value={form.minorName} onChange={e => updateField('minorName', e.target.value)} placeholder="Nombre completo" required />
                    </div>
                    <div className="form-group">
                      <label>RUT (si aplica)</label>
                      <input type="text" value={form.minorRut} onChange={e => updateField('minorRut', e.target.value)} placeholder="Opcional" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Viaja con:</label>
                      <select value={form.minorAccompaniedBy} onChange={e => updateField('minorAccompaniedBy', e.target.value)}>
                        <option value="both">Ambos padres</option>
                        <option value="one_parent">Un progenitor</option>
                        <option value="neither">Sin compañía de padres</option>
                      </select>
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.hasMinorAuthorization} onChange={e => updateField('hasMinorAuthorization', e.target.checked)} />
                        <span>¿Posee autorización notarial?</span>
                      </label>
                    </div>
                  </div>
                  <div className="info-box" style={{ background: aduana.colorBg, borderColor: aduana.color }}>
                    <strong>📌 Requisitos:</strong> Menores de 18 años requieren cédula/pasaporte vigente. Sin compañía de padres: autorización notarial sin legalización consular.
                  </div>
                </div>
              )}

              {/* Pet fields */}
              {checkinType === 'pet' && (
                <div className="form-section">
                  <h3>🐾 Datos de la Mascota</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo</label>
                      <select value={form.petType} onChange={e => updateField('petType', e.target.value)}>
                        <option value="dog">Perro</option>
                        <option value="cat">Gato</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input type="text" value={form.petName} onChange={e => updateField('petName', e.target.value)} placeholder="Nombre de la mascota" required />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Raza / Especie</label>
                      <input type="text" value={form.petBreed} onChange={e => updateField('petBreed', e.target.value)} placeholder="Labrador, Persa, etc." />
                    </div>
                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.petHasVaccines} onChange={e => updateField('petHasVaccines', e.target.checked)} />
                        <span>¿Vacunas al día?</span>
                      </label>
                      <label className="checkbox-label">
                        <input type="checkbox" checked={form.petHasMicrochip} onChange={e => updateField('petHasMicrochip', e.target.checked)} />
                        <span>¿Tiene microchip?</span>
                      </label>
                    </div>
                  </div>
                  <div className="info-box" style={{ background: aduana.colorBg, borderColor: aduana.color }}>
                    <strong>📌 Declaración SAG:</strong> Debes completar una declaración jurada ante SAG. Solo mayores de 18 años.
                  </div>
                </div>
              )}

              {/* General */}
              {checkinType === 'general' && (
                <div className="form-section">
                  <h3>📋 Describe tu trámite</h3>
                  <div className="form-group">
                    <textarea value={form.comments} onChange={e => updateField('comments', e.target.value)} rows="4" placeholder="Detalla el motivo de tu check-in..." required />
                  </div>
                </div>
              )}

              <div className="form-section">
                <h3>💬 Comentarios (opcional)</h3>
                <div className="form-group">
                  <textarea value={form.comments} onChange={e => updateField('comments', e.target.value)} rows="2" placeholder="Información adicional para el funcionario..." />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setStep('select')}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ background: aduana.color }}>
                  {submitting ? 'Guardando...' : `✅ Check-In en ${aduana.shortName}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Step: Confirmation */}
      {step === 'confirmation' && confirmation && (
        <div className="aduana-content">
          <div className="card confirmation-card" style={{ borderTop: `4px solid ${aduana.color}` }}>
            <div className="confirmation-icon">✅</div>
            <h2>¡Check-In Registrado!</h2>
            <p className="card-subtitle">Preséntate en <strong>{aduana.name}</strong> con tu código de confirmación.</p>

            <div className="confirmation-details">
              <div className="confirmation-code">
                <span className="code-label">Código de Confirmación</span>
                <span className="code-value">{confirmation.localId?.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="detail-row">
                <span>Paso Fronterizo:</span>
                <span style={{ color: aduana.color, fontWeight: 600 }}>{aduana.icon} {aduana.name}</span>
              </div>
              <div className="detail-row">
                <span>Trámite:</span>
                <span>{checkinType === 'vehicle' ? '🚗 Vehículo' : checkinType === 'minor' ? '👶 Menor' : checkinType === 'pet' ? '🐾 Mascota' : '📋 General'}</span>
              </div>
              <div className="detail-row">
                <span>Viajero:</span>
                <span>{confirmation.userName}</span>
              </div>
              <div className="detail-row">
                <span>Estado:</span>
                <span className="status-badge badge-pending">⏳ Pendiente</span>
              </div>
              <div className="detail-row">
                <span>Sincronización:</span>
                <span>{confirmation.synced ? '✅ Enviado' : '📴 Pendiente'}</span>
              </div>
            </div>

            <div className="form-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={resetForm} style={{ background: aduana.color }}>
                Nuevo Check-In en {aduana.shortName}
              </button>
              <Link to="/dashboard" className="btn btn-secondary">Ver Mis Trámites</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AduanaPage;
