import React from 'react';
import { Icon } from './icons';

const DEFAULT_STEPS = [
  { key: 'data', label: 'Datos' },
  { key: 'documents', label: 'Documentos' },
  { key: 'qr', label: 'Código QR' },
];

function CheckinStepBar({ current, steps = DEFAULT_STEPS }) {
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <div className="checkin-step-bar" aria-label="Progreso del trámite">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <React.Fragment key={step.key}>
            <div className={`checkin-step-item ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
              <span className="checkin-step-num">
                {done ? <Icon name="check" size="xs" /> : index + 1}
              </span>
              <span className="checkin-step-label">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <span className={`checkin-step-line ${index < currentIndex ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default CheckinStepBar;
