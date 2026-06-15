import React from 'react';

function ConnectionStatus({ online, syncStatus }) {
  return (
    <div className={`connection-bar ${online ? 'online' : 'offline'}`}>
      <span className="connection-dot"></span>
      <span>{online ? '🟢 Conectado al servidor' : '🔴 Sin conexión — funcionando en modo local'}</span>
      {syncStatus && <span className="sync-status">{syncStatus}</span>}
    </div>
  );
}

export default ConnectionStatus;
