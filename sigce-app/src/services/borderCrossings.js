export const BORDER_CROSSINGS = [
  {
    id: 'los-libertadores',
    name: 'Paso Los Libertadores',
    region: 'Región de Valparaíso',
    country: 'Argentina',
    type: 'terrestrial',
    color: '#1a5276',
    colorLight: '#2980b9',
    colorBg: '#eaf2f8',
    gradient: 'linear-gradient(135deg, #1a5276, #2980b9)',
    icon: '🏔️',
    shortName: 'Los Libertadores',
    description: 'Principal paso entre Chile y Argentina. Conecta Santiago con Mendoza.',
    stats: { dailyFlow: '12,000+', avgWait: '4-8 hrs', altitude: '3,175 m s.n.m.' }
  },
  {
    id: 'jama',
    name: 'Paso Jama',
    region: 'Región de Antofagasta',
    country: 'Argentina',
    type: 'terrestrial',
    color: '#7b241c',
    colorLight: '#c0392b',
    colorBg: '#fdedec',
    gradient: 'linear-gradient(135deg, #7b241c, #c0392b)',
    icon: '🏜️',
    shortName: 'Paso Jama',
    description: 'Cruce de altura en el norte de Chile, conecta la puna con Argentina.',
    stats: { dailyFlow: '3,500+', avgWait: '1-3 hrs', altitude: '4,200 m s.n.m.' }
  },
  {
    id: 'agua-negra',
    name: 'Paso Agua Negra',
    region: 'Región de Coquimbo',
    country: 'Argentina',
    type: 'terrestrial',
    color: '#1e8449',
    colorLight: '#27ae60',
    colorBg: '#eafaf1',
    gradient: 'linear-gradient(135deg, #1e8449, #27ae60)',
    icon: '⛰️',
    shortName: 'Agua Negra',
    description: 'Paso cordillerano que une la Región de Coquimbo con San Juan, Argentina.',
    stats: { dailyFlow: '2,000+', avgWait: '1-2 hrs', altitude: '4,780 m s.n.m.' }
  },
  {
    id: 'cardenal-samore',
    name: 'Paso Cardenal Samoré',
    region: 'Región de Los Lagos',
    country: 'Argentina',
    type: 'terrestrial',
    color: '#1a5276',
    colorLight: '#2c3e50',
    colorBg: '#eef1f5',
    gradient: 'linear-gradient(135deg, #1a5276, #2c3e50)',
    icon: '🏞️',
    shortName: 'Cardenal Samoré',
    description: 'Paso patagónico clave que conecta Puerto Montt con Bariloche, Argentina.',
    stats: { dailyFlow: '4,000+', avgWait: '2-4 hrs', altitude: '1,210 m s.n.m.' }
  }
];

export function getBorderCrossing(id) {
  return BORDER_CROSSINGS.find(bc => bc.id === id);
}
