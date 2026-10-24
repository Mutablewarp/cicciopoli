/**
 * Level 6 "CICCIO'S RUSH" palette: the matte-black Ciccio's truck with white lettering and red
 * checkers (ref/truck_photo.png), Palermo streets by day, the stadium in rosanero, Terrasini at sunset.
 */
export const RU = {
  ink: '#101014',
  // the truck: matte black body, chrome trim, white vinyl, red checkers
  body: '#2a2a30',
  bodyLight: '#3c3c45',
  bodyShade: '#1d1d22',
  bodyDark: '#141418',
  chrome: '#d4d8e0',
  chromeShade: '#8c919c',
  vinyl: '#f6f2e8',
  vinylShade: '#c8c2b4',
  check: '#dc1e28',
  checkLight: '#f45050',
  checkDark: '#9c1018',
  glass: '#3a5468',
  glassLight: '#8eb0c8',
  glassDark: '#1e2c38',
  tyre: '#16161a',
  tyreLight: '#34343c',
  rim: '#9a9ea8',
  rimLight: '#cfd3da',
  brakeOff: '#7c1418',
  brake: '#ff2a2a',
  brakeHot: '#ffb0a0',
  amber: '#ffb020',
  amberHot: '#fff0a0',
  amberOff: '#8a5a10',
  plate: '#eeeeea',
  // Ciccio in his spacesuit / at the wheel
  suit: '#f4f4f0',
  suitShade: '#c4c8d0',
  suitDark: '#8a90a0',
  visor: '#d8a040',
  visorDark: '#5a3a18',
  skin: '#f6c08a',
  skinShade: '#d89660',
  hair: '#141414',
  lips: '#3a1418',
  // shadows / generic
  shadow: '#0a0a10',
  white: '#fcfcf6',
  whiteShade: '#d0d0cc',
  // food (pickups)
  gold: '#f0b030',
  goldLight: '#ffd870',
  goldShade: '#c07818',
  goldDark: '#7a4210',
  cheddar: '#ffa818',
  cheddarLight: '#ffd060',
  cheddarShade: '#d87808',
  sauce: '#e2602e',
  sauceLight: '#ff9a62',
  sauceShade: '#b4401e',
  sauceDark: '#6e2412',
  kraft: '#c8955a',
  kraftLight: '#e4b880',
  kraftShade: '#9a6a3a',
  green: '#3cd25a',
  greenLight: '#a8ff9c',
  greenShade: '#1e8a3a',
  danger: '#ff3030',
  dangerShade: '#a01818',
  flameCore: '#fffce0',
  flameYellow: '#ffd23c',
  flameOrange: '#ff8a1e',
  flameRed: '#e83a14',
  // asphalt and street furniture
  asph: '#3a3a40',
  asphLight: '#46464e',
  asphShade: '#303036',
  asphDark: '#26262c',
  asphPatch: '#2c2c32',
  lane: '#e8e4d8',
  laneShade: '#a8a49a',
  kerb: '#b8b4aa',
  kerbLight: '#d4d0c4',
  kerbShade: '#86827a',
  walk: '#8e887c',
  walkLight: '#a09a8e',
  walkShade: '#76706a',
  walkLine: '#686258',
  cone: '#ff7a1a',
  coneLight: '#ffaa50',
  coneShade: '#c4500c',
} as const;

/** Per-zone scenery colours: kept darker and less saturated than the traffic so cars pop. */
export interface ZonePal {
  asph: string;
  asphLight: string;
  asphShade: string;
  asphDark: string;
  lane: string;
  walk: string;
  walkLight: string;
  walkShade: string;
  walkLine: string;
  kerb: string;
  kerbShade: string;
  roof: string;
  roofLight: string;
  roofShade: string;
  /** flat roof terraces */
  terrace: string;
  tint: string;
}

export const ZONE_PAL: Readonly<Record<'centro' | 'stadio' | 'mare', ZonePal>> = {
  centro: {
    asph: '#3a3a40', asphLight: '#46464d', asphShade: '#323238', asphDark: '#28282e', lane: '#e8e4d8',
    walk: '#8a8478', walkLight: '#9a9488', walkShade: '#746e64', walkLine: '#625c54',
    kerb: '#b0aca2', kerbShade: '#7e7a72', roof: '#94543a', roofLight: '#aa684a', roofShade: '#723e2a', terrace: '#6a665e', tint: '#ffffff',
  },
  stadio: {
    asph: '#38383e', asphLight: '#44444b', asphShade: '#2f2f35', asphDark: '#25252b', lane: '#e4e0d4',
    walk: '#7e7a72', walkLight: '#8e8a80', walkShade: '#6a665e', walkLine: '#5a564e',
    kerb: '#a8a49a', kerbShade: '#76726a', roof: '#6a6a70', roofLight: '#7e7e86', roofShade: '#525258', terrace: '#66645e', tint: '#ffffff',
  },
  mare: {
    asph: '#3e3640', asphLight: '#4a404a', asphShade: '#342e38', asphDark: '#2a242e', lane: '#f4dcc0',
    walk: '#9a7e70', walkLight: '#ae8e7c', walkShade: '#806658', walkLine: '#6a5248',
    kerb: '#c0a090', kerbShade: '#8a6e62', roof: '#984c36', roofLight: '#b26248', roofShade: '#743a2a', terrace: '#76625a', tint: '#ff9a5a',
  },
};
