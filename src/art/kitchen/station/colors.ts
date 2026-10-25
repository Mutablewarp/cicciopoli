/**
 * Level 7 kitchen station palette: brushed stainless (calm worktop, brighter equipment frames, pans),
 * black seasoned steel (griddle), golden fryer oil, white wall tiles with blue grout (La Lumia), black
 * serving steel, Ciccio's packaging (ref/level7_wrap_tray.jpg: kraft burger paper printed "CICCIO'S" in dark
 * grey, cream tray liner printed in pale grey). Cool greys so the warm food pops; light from the top-left.
 * Shared with the counter lane (counter/palette.ts KC): steelShine = steelHi, steelLight, steelShade,
 * steelDark, steelEdge = steelDeep, the tiles and the blue grout; steel / steelMid sit between.
 */
export const ST = {
  ink: '#16181c',
  // worktop: clean, low-contrast brushed stainless, food sits on it
  top: '#aeb5bd',
  topLight: '#b4bac2',
  topSheen: '#bbc1c8',
  topShade: '#a8afb7',
  topDeep: '#a1a8b1',
  topScratch: '#c2c7cd',
  // equipment frames, pans, rims: brighter steel with a full ramp
  steelShine: '#f4f6f8',
  steelLight: '#d6dbe0',
  steel: '#c4cad1',
  steelMid: '#acb3bc',
  steelShade: '#868e97',
  steelDark: '#5c636c',
  steelEdge: '#3a3f46',
  // griddle: black seasoned steel
  iron: '#28282d',
  ironLight: '#323238',
  ironSheen: '#46464f',
  ironGloss: '#5e5e68',
  ironWorn: '#3a3431',
  ironDark: '#19191d',
  grease: '#c08a2a',
  greaseHot: '#f4c862',
  // fryer oil
  oilDeep: '#94600e',
  oil: '#cf961e',
  oilLight: '#e8b836',
  oilFoam: '#ffe38a',
  oilHot: '#fff6d4',
  // back wall: white tiles, blue grout
  tileLight: '#ffffff',
  tile: '#eceef2',
  tileShade: '#cfd3dc',
  grout: '#2f4fb4',
  groutDark: '#203a8a',
  // black steel / plastic: tray, shelf, knobs, pedal
  blackLight: '#4a4a55',
  black: '#2e2e35',
  blackShade: '#212127',
  blackEdge: '#0f0f12',
  // Ciccio's packaging: kraft burger paper with dark-grey print, cream tray liner with pale print
  kraftLight: '#e8d5b0',
  kraft: '#d5bb8f',
  kraftShade: '#b99d73',
  kraftDeep: '#8e7352',
  kraftEdge: '#5a4632',
  kraftPrint: '#4e4a45',
  paper: '#f6f2e8',
  paperShade: '#ddd6c8',
  paperPrint: '#e0d9cb',
  paperMark: '#aea28c',
  // red handles, pilot lights
  redLight: '#ff6a5a',
  red: '#dc1e28',
  redDark: '#8e0e16',
  amber: '#ffb020',
  amberHot: '#fff0a0',
  // chilled shelf glass
  frostLight: '#f4f9fc',
  frost: '#dbe8f1',
  frostShade: '#bccfdd',
  ice: '#93b6cf',
  coldLed: '#e8f6ff',
  // fx: smoke is mid grey with a pale lit rim so it reads over the black griddle
  smokeHi: '#bcbcc4',
  smokeLight: '#8c8c96',
  smoke: '#55555e',
  smokeShade: '#3c3c44',
  // steam: soft white wisps (no partial alpha: a light rim, dithered thinning at the top)
  steamHi: '#ffffff',
  steam: '#eef1f5',
  steamShade: '#c6ced8',
  spark: '#fffef0',
  sparkWarm: '#ffe6a0',
  goldLight: '#ffe27a',
  gold: '#f6b829',
  goldDark: '#7a4210',
  // tutorial glove
  glove: '#fcfcf6',
  gloveShade: '#d6d6d0',
  gloveDark: '#a4a4a0',
  // dial face
  faceWhite: '#fcfcf6',
} as const;
