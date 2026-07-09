import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { BORDER_CROSSINGS, getBorderCrossing } from '../services/borderCrossings';
import { saveCheckinLocally } from '../services/offlineDb';
import { createCheckin } from '../services/api';
import { Icon, CheckinTypeIcon } from '../components/icons';
import CheckinQr from '../components/CheckinQr';

const initForm = {
  fullName: '',
  rut: '',
  nationality: 'Chilena',
  email: '',
  phone: '',
  borderCrossing: '',
  checkinType: 'vehicle',
  patent: '', brand: '', model: '', vehicleYear: '', vehicleType: 'particular',
  minorName: '', minorRut: '', minorAccompaniedBy: 'both', hasMinorAuthorization: false,
  petType: 'dog', petName: '', petBreed: '', petHasVaccines: false, petHasMicrochip: false,
  documentType: 'ci', passportNumber: '', nationalityCountry: 'Chile', hasCriminalRecord: false, pdiNotes: '',
  generalDescription: '',
  comments: '',
};

const CHECKIN_TYPES = [
  { id: 'vehicle', label: 'Vehículo' },
  { id: 'minor', label: 'Menor' },
  { id: 'pet', label: 'Mascota' },
  { id: 'general', label: 'General' },
];

function OfficialNewCheckin() {
  const { user, online } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initForm);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdCheckin, setCreatedCheckin] = useState(null);

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const c = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.checked }));

  const selectedAduana = getBorderCrossing(form.borderCrossing);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const details = {};
    if (form.checkinType === 'vehicle') {
      details.patent = form.patent; details.brand = form.brand; details.model = form.model;
      details.vehicleYear = form.vehicleYear; details.vehicleType = form.vehicleType;
      details.maxDays = form.vehicleType === 'diplomatic' ? 90 : 180;
    } else if (form.checkinType === 'minor') {
      details.minorName = form.minorName; details.minorRut = form.minorRut;
      details.minorAccompaniedBy = form.minorAccompaniedBy; details.hasMinorAuthorization = form.hasMinorAuthorization;
    } else if (form.checkinType === 'pet') {
      details.petType = form.petType; details.petName = form.petName; details.petBreed = form.petBreed;
      details.petHasVaccines = form.petHasVaccines; details.petHasMicrochip = form.petHasMicrochip;
    } else if (form.checkinType === 'general') {
      details.description = form.generalDescription.trim();
    }
    details.pdi = {
      documentType: form.documentType, passportNumber: form.passportNumber,
      nationalityCountry: form.nationalityCountry, hasCriminalRecord: form.hasCriminalRecord,
      pdiNotes: form.pdiNotes,
    };

    const checkinData = {
      localId: crypto.randomUUID(),
      userId: null,
      userName: form.fullName,
      rut: form.rut, nationality: form.nationality, email: form.email, phone: form.phone,
      checkinType: form.checkinType,
      borderCrossing: form.borderCrossing,
      source: 'inperson',
      createdBy: user?.name || 'Funcionario',
      status: 'accepted',
      details, comments: form.comments,
      createdAt: new Date().toISOString(), synced: false, version: 1,
      processedAt: new Date().toISOString(), processedBy: user?.name || 'Funcionario',
    };

    try {
      await saveCheckinLocally(checkinData);
      if (online) {
        try { await createCheckin(checkinData); } catch {}
      }
      setCreatedCheckin(checkinData);
      setSuccess(`Trámite creado para ${form.fullName} en ${selectedAduana?.name || 'aduana seleccionada'}`);
      setForm(initForm);
      setStep(2);
    } catch (err) {
      setError('Error: ' + err.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="page-container">
      <button className="btn-back" onClick={() => navigate('/oficial')}>← Volver al Panel</button>

      <div className="page-header">
        <h2 className="page-title-with-icon">
          <Icon name="edit" size="md" /> Nuevo Trámite Presencial
        </h2>
        <p>Registra manualmente el trámite de un viajero que llegó sin check-in anticipado</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {step === 2 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div className="confirmation-icon-wrap">
            <Icon name="check" size="xl" />
          </div>
          <h3 style={{ margin: '12px 0' }}>Trámite Registrado Exitosamente</h3>
          <p>El viajero fue registrado como <strong>trámite presencial</strong> y marcado como aceptado.</p>
          {createdCheckin && (
            <CheckinQr
              checkinId={createdCheckin.localId || createdCheckin.id}
              initialStatus={createdCheckin.status || 'accepted'}
              live={online}
            />
          )}
          <div className="form-actions" style={{ justifyContent: 'center', marginTop: 20 }}>
            <button className="btn btn-primary" onClick={() => { setStep(1); setSuccess(''); setCreatedCheckin(null); }}>Nuevo Trámite</button>
            <button className="btn btn-secondary" onClick={() => navigate('/oficial')}>Volver al Panel</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3 className="page-title-with-icon"><Icon name="globe" size="sm" /> Paso Fronterizo</h3>
              <div className="form-group">
                <select value={form.borderCrossing} onChange={f('borderCrossing')} required>
                  <option value="">— Selecciona paso fronterizo —</option>
                  {BORDER_CROSSINGS.map(bc => (
                    <option key={bc.id} value={bc.id}>{bc.code} — {bc.name} ({bc.region})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de Trámite</label>
                <div className="type-row">
                  {CHECKIN_TYPES.map(t => (
                    <label key={t.id} className={`type-radio ${form.checkinType === t.id ? 'active' : ''}`}>
                      <input type="radio" name="checkinType" value={t.id} checked={form.checkinType === t.id} onChange={f('checkinType')} />
                      <span className="type-radio-label">
                        <CheckinTypeIcon type={t.id} size="sm" /> {t.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="page-title-with-icon"><Icon name="user" size="sm" /> Datos del Viajero</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input type="text" value={form.fullName} onChange={f('fullName')} placeholder="Nombre y apellido" required />
                </div>
                <div className="form-group">
                  <label>RUT / Pasaporte</label>
                  <input type="text" value={form.rut} onChange={f('rut')} placeholder="12.345.678-9" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nacionalidad</label>
                  <select value={form.nationality} onChange={f('nationality')}>
                    <option value="Chilena">Chilena</option>
                    <option value="Argentina">Argentina</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={f('email')} placeholder="opcional" />
                </div>
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="tel" value={form.phone} onChange={f('phone')} placeholder="+569 ..." />
              </div>
            </div>

            <div className="form-section">
              <h3 className="page-title-with-icon"><Icon name="shield" size="sm" /> Control Migratorio — PDI</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo Documento</label>
                  <select value={form.documentType} onChange={f('documentType')}>
                    <option value="ci">Cédula de Identidad</option>
                    <option value="passport">Pasaporte</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>N° Pasaporte</label>
                  <input type="text" value={form.passportNumber} onChange={f('passportNumber')} placeholder="Si aplica" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nacionalidad</label>
                  <input type="text" value={form.nationalityCountry} onChange={f('nationalityCountry')} placeholder="Chile, Argentina..." />
                </div>
                <div className="form-group checkbox-group" style={{ justifyContent: 'center', paddingTop: 24 }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={form.hasCriminalRecord} onChange={c('hasCriminalRecord')} />
                    <span>Antecedentes penales</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Observaciones PDI</label>
                <input type="text" value={form.pdiNotes} onChange={f('pdiNotes')} placeholder="Visas, permisos, etc." />
              </div>
            </div>

            {form.checkinType === 'vehicle' && (
              <div className="form-section">
                <h3 className="page-title-with-icon"><Icon name="vehicle" size="sm" /> Vehículo</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Patente</label>
                    <input type="text" value={form.patent} onChange={f('patent')} placeholder="ABCD-12" required />
                  </div>
                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={form.vehicleType} onChange={f('vehicleType')}>
                      <option value="particular">Particular (180 días)</option>
                      <option value="diplomatic">Diplomático (90 días)</option>
                    </select>
                  </div>
                </div>
                <div className="form-row three">
                  <div className="form-group">
                    <label>Marca</label>
                    <input type="text" value={form.brand} onChange={f('brand')} placeholder="Toyota" />
                  </div>
                  <div className="form-group">
                    <label>Modelo</label>
                    <input type="text" value={form.model} onChange={f('model')} placeholder="Corolla" />
                  </div>
                  <div className="form-group">
                    <label>Año</label>
                    <input type="number" value={form.vehicleYear} onChange={f('vehicleYear')} placeholder="2024" />
                  </div>
                </div>
              </div>
            )}

            {form.checkinType === 'minor' && (
              <div className="form-section">
                <h3 className="page-title-with-icon"><Icon name="minor" size="sm" /> Menor de Edad</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre del Menor</label>
                    <input type="text" value={form.minorName} onChange={f('minorName')} placeholder="Nombre completo" required />
                  </div>
                  <div className="form-group">
                    <label>RUT</label>
                    <input type="text" value={form.minorRut} onChange={f('minorRut')} placeholder="Opcional" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Viaja con:</label>
                    <select value={form.minorAccompaniedBy} onChange={f('minorAccompaniedBy')}>
                      <option value="both">Ambos padres</option>
                      <option value="one_parent">Un progenitor</option>
                      <option value="neither">Sin compañía</option>
                    </select>
                  </div>
                  <div className="form-group checkbox-group" style={{ justifyContent: 'center', paddingTop: 24 }}>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={form.hasMinorAuthorization} onChange={c('hasMinorAuthorization')} />
                      <span>Autorización notarial</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {form.checkinType === 'pet' && (
              <div className="form-section">
                <h3 className="page-title-with-icon"><Icon name="pet" size="sm" /> Mascota</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={form.petType} onChange={f('petType')}>
                      <option value="dog">Perro</option><option value="cat">Gato</option><option value="other">Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nombre</label>
                    <input type="text" value={form.petName} onChange={f('petName')} placeholder="Nombre" required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Raza</label>
                    <input type="text" value={form.petBreed} onChange={f('petBreed')} placeholder="Labrador, etc." />
                  </div>
                  <div className="form-group checkbox-group" style={{ paddingTop: 24 }}>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={form.petHasVaccines} onChange={c('petHasVaccines')} />
                      <span>Vacunas al día</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={form.petHasMicrochip} onChange={c('petHasMicrochip')} />
                      <span>Microchip</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {form.checkinType === 'general' && (
              <div className="form-section">
                <h3 className="page-title-with-icon"><Icon name="general" size="sm" /> Descripción</h3>
                <div className="form-group">
                  <textarea
                    id="general-description"
                    name="generalDescription"
                    autoComplete="off"
                    value={form.generalDescription}
                    onChange={f('generalDescription')}
                    rows="3"
                    placeholder="Describe el trámite..."
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-section">
              <h3 className="page-title-with-icon"><Icon name="comment" size="sm" /> Comentarios{form.checkinType === 'general' ? ' (opcional)' : ''}</h3>
              <div className="form-group">
                <textarea
                  id="checkin-comments"
                  name="comments"
                  autoComplete="off"
                  value={form.comments}
                  onChange={f('comments')}
                  rows="2"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/oficial')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Registrar Trámite Presencial'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default OfficialNewCheckin;
