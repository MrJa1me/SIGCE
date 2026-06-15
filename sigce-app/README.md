# 🛂 SIGCE - Sistema Integrado de Gestión de Comercio Exterior

**Prototipo funcional — Evaluación Parcial N°3 | Ingeniería de Software | DUOC UC**

## 📋 Descripción

SIGCE es un sistema de check-in anticipado para pasos fronterizos terrestres (Caso: Los Libertadores, Chile-Argentina). Permite a viajeros realizar su trámite antes de llegar a la aduana ("hotel-style check-in") y a funcionarios procesar las solicitudes (aceptar, rechazar, enviar a revisión).

### Funcionalidades principales

- **Check-In Anticipado** para viajeros con 3 tipos de trámite:
  - 🚗 **Vehículo**: Salida/entrada temporal (particular 180 días / diplomático 90 días)
  - 👶 **Menor de Edad**: Autorizaciones notariales para viaje
  - 🐾 **Mascota**: Declaración jurada SAG
  - 📋 **Trámite General**: Consultas y otros

- **Panel Oficial** con:
  - Dashboard de estadísticas en tiempo real
  - Filtros por estado (pendiente, en revisión, aprobado, rechazado)
  - Acciones: ✅ Aceptar, 🔍 Enviar a revisión, ❌ Rechazar

- **Modo Offline-First**:
  - Funciona sin conexión a internet (IndexedDB local)
  - Sincronización automática al recuperar conexión
  - Acciones offline encoladas y sincronizadas en segundo plano

## 🏗️ Arquitectura

### Vistas 4+1 (IEEE 1471 / Kruchten)

| Vista | Descripción |
|-------|-------------|
| **Casos de Uso** | Check-in anticipado, procesamiento oficial, autenticación |
| **Lógica** | React (frontend) + Express (backend) — Capas separadas |
| **Procesos** | Sincronización asíncrona, cola de pendientes, sync automático |
| **Componentes** | Frontend Web, API REST, IndexedDB, JSON Store |
| **Despliegue** | Localhost (dev) — servidor Express + Vite |

### Patrones de Diseño (GoF)

| Patrón | Uso |
|--------|-----|
| **Repository** | Capa de acceso a datos (IndexedDB + API) encapsulada en services/ |
| **Singleton** | Única instancia de conexión a IndexedDB por pestaña |
| **Factory Method** | Creación de check-ins según tipo (vehicle/minor/pet/general) |

### Calidad ISO/IEC 25010

| Característica | Implementación |
|----------------|----------------|
| **Functional Suitability** | 24 casos de prueba cubriendo todos los requisitos funcionales |
| **Reliability** | Modo offline con IndexedDB, cola de sync, tolerancia a fallos de red |
| **Usability** | Interfaz responsiva, paso a paso, placeholders, info contextual |
| **Performance** | Carga asíncrona, refresco automático cada 10s en panel oficial |
| **Portability** | Compatible Chrome, Edge, Firefox. Diseño responsive mobile/desktop |
| **Security** | Autenticación por roles (prototipo), aunque contraseñas en texto plano |

## 🚀 Instalación y Ejecución

### Requisitos

- Node.js v18+
- Navegador web moderno

### 1. Backend (API)

```bash
cd server
npm install
npm start
```

El API corre en `http://localhost:3001`

### 2. Frontend (React + Vite)

```bash
cd sigce-app
npm install
npm run dev
```

El frontend corre en `http://localhost:5173`

### 3. Inicio rápido (todo junto)

```bash
npm run start-all
```

## 👤 Credenciales de Prueba

### Funcionarios
| Usuario | Contraseña | Nombre |
|---------|-----------|--------|
| `admin` | `admin123` | Admin Aduanas |
| `oficial1` | `aduana2026` | María González |
| `oficial2` | `aduana2026` | Carlos Muñoz |

### Viajeros
| Usuario | Contraseña | Nombre |
|---------|-----------|--------|
| `viajero1` | `viajero123` | Juan Pérez |
| `viajero2` | `viajero123` | Ana Soto |

## 📂 Estructura del Proyecto

```
C:\sigce\
├── fuentes/                          # Documentos del caso
│   ├── EFT_FormaA.docx               # Caso semestral
│   ├── Informe de Arquitectura...docx # Arquitectura y diseño
│   ├── Parcial_1 grupo 4.docx        # ERS (IEEE 830)
│   ├── Arquitectura y Diseño SIGCE.pptx
│   └── RQY1102 Evaluación Parcial 3.pdf  # Rúbrica
├── sigce-app/                        # Prototipo funcional
│   ├── src/
│   │   ├── pages/                    # Páginas principales
│   │   │   ├── Login.jsx
│   │   │   ├── TravelerCheckIn.jsx
│   │   │   ├── TravelerDashboard.jsx
│   │   │   ├── OfficialPanel.jsx
│   │   │   └── OfficialDetail.jsx
│   │   ├── services/
│   │   │   ├── api.js                # API REST client
│   │   │   ├── offlineDb.js          # IndexedDB wrapper
│   │   │   └── syncService.js        # Sincronización offline
│   │   ├── components/               # Componentes reutilizables
│   │   └── App.jsx                   # Router + Auth context
│   ├── server/
│   │   ├── server.js                 # Express API (3001)
│   │   └── data.json                 # Persistencia
│   └── docs/
│       ├── planilla-pruebas.csv      # 24 casos de prueba
│       └── control-cambios.csv       # Historial de versiones
```

## 📊 Documentos Entregables (EV3)

| Documento | Archivo | Descripción |
|-----------|---------|-------------|
| ✅ Prototipo funcional | `sigce-app/` | React + Vite + Express + IndexedDB |
| ✅ Planilla casos de prueba | `docs/planilla-pruebas.csv` | 24 casos según ISO 25010 |
| ✅ Control de cambios | `docs/control-cambios.csv` | 7 versiones documentadas |
| ✅ PPT Presentación | *(pendiente)* | Para la Situación Evaluativa 2 |

## 🔄 Flujo Offline

```
Usuario llena formulario
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│   ¿Hay red?     │────→│   Guardar en    │
│                  │  NO │   IndexedDB     │
└────────┬────────┘     │   (local)       │
         │ SÍ           └────────┬────────┘
         ▼                       │
┌─────────────────┐              │
│   Enviar al     │              │
│   servidor API  │              │
└────────┬────────┘              │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   Sync OK?      │     │  ¿Red vuelve?   │
│   → ✅ Marcado   │     │  → Sync autom.  │
│   → ❌ Pendiente │     │  → Cola procesa  │
└─────────────────┘     └─────────────────┘
```

## 📱 Tecnologías

- **Frontend**: React 19, React Router, Vite 8
- **Backend**: Node.js, Express, UUID
- **Almacenamiento local**: IndexedDB (API nativa)
- **Estilos**: CSS nativo + variables, responsive design

---

*DUOC UC — Escuela de Informática y Telecomunicaciones*
*Asignatura: Ingeniería de Software — Profesor: (nombre)*
*Integrantes: Nicolas Guajardo, Alanis Verdugo*
