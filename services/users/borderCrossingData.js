/** Catálogo de pasos fronterizos Chile — datos para seed y selección admin */

const COUNTRY_THEMES = {
  Argentina: {
    color: '#1a5276',
    colorLight: '#2980b9',
    colorBg: '#eaf2f8',
    gradient: 'linear-gradient(135deg, #1a5276, #2980b9)',
  },
  Perú: {
    color: '#922b21',
    colorLight: '#c0392b',
    colorBg: '#fdedec',
    gradient: 'linear-gradient(135deg, #922b21, #c0392b)',
  },
  Bolivia: {
    color: '#1e6f3d',
    colorLight: '#27ae60',
    colorBg: '#eafaf1',
    gradient: 'linear-gradient(135deg, #1e6f3d, #27ae60)',
  },
};

const CROSSING_CATALOG = [
  {
    id: 'los-libertadores',
    name: 'Paso Los Libertadores',
    shortName: 'Los Libertadores',
    region: 'Región de Valparaíso',
    country: 'Argentina',
    location: 'Cordillera de los Andes, comuna de Los Andes',
    code: 'LL',
    description: 'Principal paso entre Chile y Argentina. Conecta Santiago con Mendoza.',
    dailyFlow: '12,000+',
    avgWait: '4-8 hrs',
    altitude: '3,175 m s.n.m.',
  },
  {
    id: 'jama',
    name: 'Paso Jama',
    shortName: 'Paso Jama',
    region: 'Región de Antofagasta',
    country: 'Argentina',
    location: 'Provincia de Jujuy (Argentina) — El Loa (Chile)',
    code: 'PJ',
    description: 'Cruce de altura en el norte de Chile, conecta la puna con el noroeste argentino.',
    dailyFlow: '3,500+',
    avgWait: '1-3 hrs',
    altitude: '4,200 m s.n.m.',
  },
  {
    id: 'agua-negra',
    name: 'Paso Agua Negra',
    shortName: 'Agua Negra',
    region: 'Región de Coquimbo',
    country: 'Argentina',
    location: 'Provincia de San Juan (Argentina) — Región de Coquimbo',
    code: 'AN',
    description: 'Paso cordillerano que une la Región de Coquimbo con San Juan, Argentina.',
    dailyFlow: '2,000+',
    avgWait: '1-2 hrs',
    altitude: '4,780 m s.n.m.',
  },
  {
    id: 'cardenal-samore',
    name: 'Paso Cardenal Samoré',
    shortName: 'Cardenal Samoré',
    region: 'Región de Los Lagos',
    country: 'Argentina',
    location: 'Osorno — Bariloche (Patagonia norte)',
    code: 'CS',
    description: 'Paso patagónico clave que conecta Puerto Montt con Bariloche, Argentina.',
    dailyFlow: '4,000+',
    avgWait: '2-4 hrs',
    altitude: '1,210 m s.n.m.',
  },
  {
    id: 'pino-hachado',
    name: 'Paso Pino Hachado',
    shortName: 'Pino Hachado',
    region: 'Región de La Araucanía',
    country: 'Argentina',
    location: 'Lonquimay — Neuquén (Argentina)',
    code: 'PH',
    description: 'Conecta la Araucanía con la Patagonia argentina, ruta Lonquimay — Caviahue.',
    dailyFlow: '1,800+',
    avgWait: '1-3 hrs',
    altitude: '1,884 m s.n.m.',
  },
  {
    id: 'cristo-redentor',
    name: 'Paso Cristo Redentor',
    shortName: 'Cristo Redentor',
    region: "Región de O'Higgins",
    country: 'Argentina',
    location: 'Los Andes — Uspallata (Mendoza, Argentina)',
    code: 'CR',
    description: 'Ruta histórica Los Andes–Mendoza, alternativa al paso Los Libertadores.',
    dailyFlow: '5,500+',
    avgWait: '2-5 hrs',
    altitude: '3,832 m s.n.m.',
  },
  {
    id: 'chacalluta',
    name: 'Paso Chacalluta',
    shortName: 'Chacalluta',
    region: 'Región de Arica y Parinacota',
    country: 'Perú',
    location: 'Arica — Tacna (Perú)',
    code: 'CH',
    description: 'Principal cruce terrestre Chile–Perú en el extremo norte del país.',
    dailyFlow: '6,000+',
    avgWait: '1-2 hrs',
    altitude: '35 m s.n.m.',
  },
  {
    id: 'santa-rosa',
    name: 'Paso Santa Rosa',
    shortName: 'Santa Rosa',
    region: 'Región de Arica y Parinacota',
    country: 'Perú',
    location: 'Altiplano de Putre — frontera con Tacna',
    code: 'SR',
    description: 'Paso de altura en la frontera norte, conecta el altiplano chileno con Tacna.',
    dailyFlow: '800+',
    avgWait: '30-90 min',
    altitude: '3,600 m s.n.m.',
  },
  {
    id: 'chungara-tambo-quemado',
    name: 'Paso Chungará–Tambo Quemado',
    shortName: 'Chungará–Tambo Quemado',
    region: 'Región de Arica y Parinacota',
    country: 'Bolivia',
    location: 'Parque Nacional Lauca — Oruro (Bolivia)',
    code: 'CT',
    description: 'Cruce altiplánico Chile–Bolivia por el lago Chungará.',
    dailyFlow: '600+',
    avgWait: '45-90 min',
    altitude: '4,687 m s.n.m.',
  },
  {
    id: 'ollague',
    name: 'Paso Ollagüe',
    shortName: 'Ollagüe',
    region: 'Región de Antofagasta',
    country: 'Bolivia',
    location: 'Comuna de Ollagüe — Potosí (Bolivia)',
    code: 'OL',
    description: 'Paso minero y comercial en el altiplano antofagastino hacia Bolivia.',
    dailyFlow: '400+',
    avgWait: '30-60 min',
    altitude: '3,695 m s.n.m.',
  },
  {
    id: 'visviri',
    name: 'Paso Visviri',
    shortName: 'Visviri',
    region: 'Región de Arica y Parinacota',
    country: 'Perú',
    location: 'Comuna de General Lagos — frontera con Perú',
    code: 'VV',
    description: 'Paso remoto del altiplano, acceso restringido y bajo flujo.',
    dailyFlow: '150+',
    avgWait: '30-60 min',
    altitude: '4,095 m s.n.m.',
  },
  {
    id: 'laguna-del-desierto',
    name: 'Paso Laguna del Desierto',
    shortName: 'Laguna del Desierto',
    region: 'Región de Aysén',
    country: 'Argentina',
    location: 'Villa O\'Higgins — El Chaltén (Argentina)',
    code: 'LD',
    description: 'Paso patagónico sur, acceso estacional por vía lacustre y terrestre.',
    dailyFlow: '300+',
    avgWait: '1-2 hrs',
    altitude: '510 m s.n.m.',
  },
];

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function initials(name, code) {
  if (code) return code.slice(0, 2).toUpperCase();
  const words = name.replace(/^paso\s+/i, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function enrichCrossing(raw) {
  const theme = COUNTRY_THEMES[raw.country] || COUNTRY_THEMES.Argentina;
  return {
    id: raw.id,
    name: raw.name,
    short_name: raw.shortName || raw.name.replace(/^Paso\s+/i, ''),
    region: raw.region,
    country: raw.country,
    location: raw.location,
    type: 'terrestrial',
    code: raw.code || initials(raw.name, raw.code),
    description: raw.description,
    color: theme.color,
    color_light: theme.colorLight,
    color_bg: theme.colorBg,
    gradient: theme.gradient,
    daily_flow: raw.dailyFlow,
    avg_wait: raw.avgWait,
    altitude: raw.altitude,
  };
}

function buildCustomCrossing(name, country) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('El nombre del paso es requerido');
  if (!COUNTRY_THEMES[country]) throw new Error('País vecino no válido');

  const id = slugify(trimmed);
  const altMatch = trimmed.match(/(\d[\d.,]*)\s*m/i);
  const altitudeNum = altMatch ? parseFloat(altMatch[1].replace(',', '.')) : null;

  let dailyFlow = '2,000+';
  let avgWait = '1-3 hrs';
  let altitude = '1,500 m s.n.m.';

  if (altitudeNum !== null) {
    altitude = `${altitudeNum.toLocaleString('es-CL')} m s.n.m.`;
    if (altitudeNum >= 4000) {
      dailyFlow = '500+';
      avgWait = '45-90 min';
    } else if (altitudeNum >= 2500) {
      dailyFlow = '1,500+';
      avgWait = '1-2 hrs';
    } else if (altitudeNum < 500) {
      dailyFlow = '4,000+';
      avgWait = '30-90 min';
    }
  } else if (country === 'Perú') {
    dailyFlow = '3,000+';
    avgWait = '1-2 hrs';
    altitude = '800 m s.n.m.';
  } else if (country === 'Bolivia') {
    dailyFlow = '600+';
    avgWait = '45-90 min';
    altitude = '3,800 m s.n.m.';
  }

  const regionByCountry = {
    Argentina: 'Región de Los Lagos',
    Perú: 'Región de Arica y Parinacota',
    Bolivia: 'Región de Antofagasta',
  };

  return enrichCrossing({
    id,
    name: trimmed.startsWith('Paso') ? trimmed : `Paso ${trimmed}`,
    shortName: trimmed.replace(/^Paso\s+/i, ''),
    region: regionByCountry[country],
    country,
    location: `Frontera Chile — ${country}`,
    code: initials(trimmed),
    description: `Paso fronterizo terrestre entre Chile y ${country}.`,
    dailyFlow,
    avgWait,
    altitude,
  });
}

const SEED_CROSSINGS = CROSSING_CATALOG.slice(0, 10).map(enrichCrossing);

function mapRowToApi(row) {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    region: row.region,
    country: row.country,
    location: row.location,
    type: row.type || 'terrestrial',
    color: row.color,
    colorLight: row.color_light,
    colorBg: row.color_bg,
    gradient: row.gradient,
    code: row.code,
    description: row.description,
    stats: {
      dailyFlow: row.daily_flow,
      avgWait: row.avg_wait,
      altitude: row.altitude,
    },
    createdAt: row.created_at,
  };
}

module.exports = {
  CROSSING_CATALOG,
  COUNTRY_THEMES,
  SEED_CROSSINGS,
  enrichCrossing,
  buildCustomCrossing,
  slugify,
  mapRowToApi,
};
