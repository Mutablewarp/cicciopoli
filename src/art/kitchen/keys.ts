/**
 * ART MANIFEST for level 7 · CICCIO'S KITCHEN (pack 'kitchen', src/art/kitchen.ts buildKitchenArt()).
 * OWNER: integrator — the three art lanes must produce exactly these keys / sizes / frame counts,
 * the game and UI lanes may rely on them. Units: world px = art px. Light from the top-left,
 * dark 1-px outlines on props and food, same pixel rules as the other packs (docs/BRIEF.md §2, §9).
 *
 * Rasters are opaque-or-transparent (no partial alpha): glows and soft light are dithered pixels or
 * sprite alpha set by the game.
 *
 * Two views share one stage size (the scene scales it to fit, the room / worktop art fills any
 * extra space): portrait 180x320, landscape 320x180.
 *  - BANCONE (counter): POV from behind the counter. Room art behind, the customer (waist-up) in
 *    the middle, the steel counter top across the bottom, the bulb beam + CICCIO'S neon on top.
 *  - CUCINA (kitchen): 3/4 top-down brushed-steel worktop with the stations laid out by the game.
 */

export const STAGE = {
  portrait: { w: 180, h: 320 },
  landscape: { w: 320, h: 180 },
} as const;

/** Every burger ingredient of the real Palermo menu (src/config/kitchenMenu.ts), in frame order. */
export const INGREDIENTS = [
  // proteins: manzo / vegetale on the griddle, the three chickens in the fryer
  'manzo', 'vegetale', 'polloPastellato', 'polloCroccante', 'cosciaPanko',
  // cheeses
  'cheddar', 'brie', 'provola', 'taleggio', 'tuma', 'scamorza', 'gorgonzola',
  // cured meats: bacon / guanciale on the griddle, pancetta dolce cold
  'bacon', 'guanciale', 'pancetta',
  // vegetables
  'songino', 'lattuga', 'pomodoro', 'cipollaCaramellata', 'cipollaCroccante', 'capuliato', 'peperoncino',
  // sweet / crunchy
  'pere', 'fichi', 'nocciole', 'noci',
  // sauces (squeeze bottles)
  'salsaCiccios', 'salsaWhite', 'salsaBbq', 'maionese', 'salsaJalapeno',
] as const;
export type IngredientId = (typeof INGREDIENTS)[number];

/** Ingredients cooked on the griddle; frame block of KITCHEN.griddleItem. */
export const GRIDDLE_ITEMS = ['manzo', 'vegetale', 'bacon', 'guanciale'] as const satisfies readonly IngredientId[];
/** Ingredients that can be raw / burnt on the stack; frame block of KITCHEN.layerCook. */
export const COOKABLE = [
  'manzo', 'vegetale', 'bacon', 'guanciale', 'polloPastellato', 'polloCroccante', 'cosciaPanko',
] as const satisfies readonly IngredientId[];
export const SAUCES = ['salsaCiccios', 'salsaWhite', 'salsaBbq', 'maionese', 'salsaJalapeno'] as const satisfies readonly IngredientId[];

/** Menù parts from the fryer: the fries and the four menù starters (real rule, kitchenMenu.ts). */
export const SIDES = ['patatine', 'nuggets', 'meatball', 'chickenPopCorn', 'greenNuggets'] as const;
export type SideId = (typeof SIDES)[number];
export const STARTERS = ['nuggets', 'meatball', 'chickenPopCorn', 'greenNuggets'] as const satisfies readonly SideId[];
export type StarterId = (typeof STARTERS)[number];

/** Everything that goes in a fryer basket; frame block of KITCHEN.fryItem. */
export const FRY_ITEMS = [
  'polloPastellato', 'polloCroccante', 'cosciaPanko', 'patatine', 'nuggets', 'meatball', 'chickenPopCorn', 'greenNuggets',
] as const;
export type FryItemId = (typeof FRY_ITEMS)[number];

/** Non-alcoholic drinks of the real menu (no brand logos: coloured can / bottle + name). */
export const DRINKS = [
  'acquaNaturale', 'acquaFrizzante', 'fuzePesca', 'fuzeLimone', 'lemonSoda',
  'sprite', 'fanta', 'cocaCola', 'cocaZero', 'chinotto',
] as const;
export type DrinkId = (typeof DRINKS)[number];

/**
 * The six regulars at the counter (waist-up, facing the player), Palermo characters:
 * rosalia = Signora Rosalia (grey curls, glasses on a chain, floral blouse, shopping bag strap),
 * turi = Nonno Turi (coppola cap, white moustache, waistcoat over a shirt),
 * giulia = Giulia (student: round glasses, headphones around the neck, yellow hoodie),
 * salvo = Salvo (builder: tanned, orange hi-vis vest, cap backwards),
 * martina = Martina (football fan: pink-and-black scarf, dark ponytail, hoop earrings),
 * kevin = Kevin (skater kid: bucket hat, oversized tee, braces),
 * chiara = Chiara (vegetarian: green beanie, leaf earrings, linen shirt — orders the GREEN),
 * tommaso = Tommaso (foodie: trimmed beard, round tortoiseshell glasses, chef-style apron over a denim
 *   shirt — the gourmet burgers TALÈ, ZOLA, TUMA, PANCETTA),
 * peppe = Peppe (fisherman from the port: sun-weathered, white stubble, striped sailor top, red neckerchief
 *   — loves spicy: GOMU GOMU),
 * emma = Emma (tourist: sunhat, sunglasses pushed up, camera strap, freckles — CASARO / BRIE).
 * Distinct silhouettes and colours. The order logic maps every customer type to a slice of the real menu
 * so that, together, they cover all 17 burgers, singolo and menù, all starters and drinks (§9).
 */
export const CUSTOMERS = ['rosalia', 'turi', 'giulia', 'salvo', 'martina', 'kevin', 'chiara', 'tommaso', 'peppe', 'emma'] as const;
export type CustomerId = (typeof CUSTOMERS)[number];
/** Frame = customer index * CUSTOMER_POSE.count + pose. talk = mouth open; happy = big smile,
 * eyes closed / sparkling; angry = frown, red cheeks, arms crossed or fist. */
export const CUSTOMER_POSE = { idle: 0, talk: 1, happy: 2, angry: 3, count: 4 } as const;

/** Look of an item on the griddle (seen from above): frame = GRIDDLE_ITEMS index * 5 + state. */
export const GRIDDLE_STATE = { raw: 0, cooking: 1, perfect: 2, over: 3, burnt: 4, count: 5 } as const;
/** Look of an item in the fryer basket: frame = FRY_ITEMS index * 3 + state. */
export const FRY_STATE = { raw: 0, perfect: 1, burnt: 2, count: 3 } as const;

/**
 * Side-view burger layers (KITCHEN.layer, KITCHEN.layerCook), frames LAYER.w x LAYER.h. The layer's
 * BODY (the part that adds height to the stack) sits on row LAYER.baseRow (exclusive bottom edge) and
 * is LAYER_H[kind] rows tall; up to 3 rows of frills above the body (lettuce edges, crumbs) are allowed
 * (the next layer covers them); rows baseRow..h-1 are only for things hanging DOWN over the layer
 * below (melted cheddar drapes, sauce drips). Width: patties / buns ~44 px, centred on x = 24.
 */
export const LAYER = { w: 48, h: 20, baseRow: 16, cx: 24 } as const;
export type LayerKind = 'bunBottom' | 'bunTop' | IngredientId;
/** layer frame: 0 bunBottom, 1 bunTop, 2 + INGREDIENTS index = the ingredient as served (cooked right). */
export function layerFrame(kind: LayerKind): number {
  if (kind === 'bunBottom') return 0;
  if (kind === 'bunTop') return 1;
  return 2 + INGREDIENTS.indexOf(kind);
}
/** layerCook frame: COOKABLE index * 2 + (0 raw | 1 burnt). */
export function layerCookFrame(kind: (typeof COOKABLE)[number], look: 'raw' | 'burnt'): number {
  return COOKABLE.indexOf(kind) * 2 + (look === 'raw' ? 0 : 1);
}

/** Body height (stack px) of every layer kind. */
export const LAYER_H: Readonly<Record<LayerKind, number>> = {
  bunBottom: 10, bunTop: 12,
  manzo: 8, vegetale: 8, polloPastellato: 9, polloCroccante: 9, cosciaPanko: 9,
  cheddar: 2, brie: 3, provola: 3, taleggio: 3, tuma: 3, scamorza: 3, gorgonzola: 3,
  bacon: 3, guanciale: 3, pancetta: 2,
  songino: 3, lattuga: 3, pomodoro: 3, cipollaCaramellata: 3, cipollaCroccante: 3, capuliato: 3, peperoncino: 2,
  pere: 3, fichi: 2, nocciole: 2, noci: 2,
  salsaCiccios: 2, salsaWhite: 2, salsaBbq: 2, maionese: 2, salsaJalapeno: 2,
};

/** Griddle image: black steel surface inside a steel frame, knobs on the front panel. Slot centres
 * (where griddleItem frames are centred) in image px. */
export const GRIDDLE = { w: 176, h: 92, slots: [{ x: 32, y: 40 }, { x: 88, y: 40 }, { x: 144, y: 40 }], surface: { x: 8, y: 8, w: 160, h: 62 } } as const;
/** One griddleItem frame (a patty / strips seen from above, centred on a slot). */
export const GRIDDLE_ITEM = { w: 40, h: 40 } as const;
/** Fryer image: two oil wells (fryOil frames drawn at the well origin), front panel with dials. */
export const FRYER = { w: 132, h: 92, wells: [{ x: 10, y: 12 }, { x: 70, y: 12 }], well: { w: 52, h: 34 } } as const;
/** One basket frame and one fryItem frame (what is in a raised basket). */
export const BASKET = { w: 54, h: 46 } as const;
export const FRY_ITEM = { w: 44, h: 28 } as const;
/** Bin image (steel gastronorm pan); binFill / binSide / binBun frames are drawn at (fillX, fillY). */
export const BIN = { w: 48, h: 36, fillX: 2, fillY: 4 } as const;
/** Assembly paper on the worktop: the stack's bottom-centre is at (baseX, baseY). */
export const PAPER = { w: 76, h: 20, baseX: 38, baseY: 13 } as const;
/** Tray: bottom-centre anchors of what goes on it. */
export const TRAY = { w: 120, h: 46, burger: { x: 28, y: 38 }, cone: { x: 62, y: 38 }, side: { x: 86, y: 39 }, drink: { x: 108, y: 38 } } as const;
/** Drinks shelf (cold rack): bottom-centre of the 4 drink places. */
export const SHELF = { w: 84, h: 30, slots: [{ x: 12, y: 25 }, { x: 32, y: 25 }, { x: 52, y: 25 }, { x: 72, y: 25 }] } as const;

export const KITCHEN = {
  /* ---------------------------------------------- COUNTER lane (src/art/kitchen/counter/) */
  /**
   * The dining room seen from behind the counter, portrait (200x356) and landscape (356x200) versions,
   * centred on the stage with overscan. OWNER'S POV PHOTO = ref/level7_pov_order.png (Ciccio's Sperlinga,
   * seen from behind the steel counter): follow its composition — a pale concrete ceiling with beams and
   * thin warm RING LIGHTS hanging inside a black iron pergola with circle motifs; trailing pothos and
   * monstera spilling from the arches and from tall dark planters on both sides; red-brick wall panels
   * behind the plants (an orange neon script on the right brick panel); the glass door to the garden at
   * the back with daylight; black tables with small candle lights and black chairs; floor = white tiles
   * with BLUE grout in front, dark tiles down the central aisle; a big window on the left with
   * balconies and palms outside; the CICCIOPOLY poster (Ciccio in top hat on gold coins, red-orange) on
   * the right plaster wall. La Lumia touches stay small: a black menu board (CLASSIC BURGER / CICCIO'S
   * BURGER / STARTERS) and the round face-logo disc on a pillar. The customer stands in the centre aisle:
   * keep it calmer so the customer reads. Bottom ~56 px are hidden by the counter top.
   */
  roomTall: 'kitchen-room-tall', //   image 200x356
  roomWide: 'kitchen-room-wide', //   image 356x200
  /** image 64x64 seamless filler (plaster wall with a hint of greenery) beyond the room art */
  roomFill: 'kitchen-room-fill',
  /**
   * image 64x56, seamless horizontally, drawn across the bottom of the counter view: the polished
   * stainless-steel counter top seen from behind (as in ref/level7_pov_order.png: wide flat steel, warm
   * vertical light reflections, a bright front edge, darker toward the player).
   */
  counterTop: 'kitchen-counter-top',
  /** sheet 64x30 frames 0 normal, 1 flash (golden finale), seamless horizontally: the black iron pergola
   * beam across the top of the view with hanging warm lights (frame 1 = all lights flashing) */
  beam: 'kitchen-beam',
  /** sheet 92x24 frames 0 on, 1 brighter: "CICCIO'S" neon sign (warm orange-red tube like the neon on the
   * Sperlinga brick wall, or the white La Lumia letters; readable) */
  neon: 'kitchen-neon',
  /** sheet 36x36 frames 0 white disc with the black line-art face logo, 1 the same in gold. PIXEL FALLBACK ONLY:
   * the game draws the owner's ORIGINAL logo (public/brand/ciccio-face-hd.png, never pixelated) over it */
  faceDisc: 'kitchen-face-disc',
  /** image 52x40 black till with a paper receipt and a small CICCIO'S sticker (sits on the counter top) */
  register: 'kitchen-register',
  /** image 56x44: counter props of the POV photo, standing on the steel counter top: a brushed-steel cup full of
   * black straws / cutlery and a stack of dark plates next to it (ref/level7_pov_order.png, bottom right) */
  counterProps: 'kitchen-counter-props',
  /** sheet 96x112, CUSTOMERS.length x CUSTOMER_POSE.count frames (waist-up, bottom rows cut by the counter) */
  customer: 'kitchen-customer',
  /** sheet 16x16 frames 0 empty, 1 full: gold rating star with dark outline */
  star: 'kitchen-star',
  /** sheet 96x96 frames 0-3: golden burger trophy on a black pedestal with a CICCIO'S plate, shine sweep */
  goldenBurger: 'kitchen-golden-burger',
  /** image 180x60: "YOU ARE" / "SO GOLDEN!" in chunky gold pixel letters, dark outline, sparkles */
  goldenText: 'kitchen-golden-text',
  /** image 160x160: radial gold rays behind the trophy (Raster has no alpha: rays are solid / dithered
   * pixels, the game fades and spins the sprite) */
  goldRays: 'kitchen-gold-rays',
  /** sheet 4x6 frames 0-5: confetti bits (gold, white, red, black, pink, cream) */
  confetti: 'kitchen-confetti',

  /* ---------------------------------------------- STATION lane (src/art/kitchen/station/) */
  /** image 128x128 seamless both ways: brushed stainless worktop (soft horizontal grain, faint scratches) */
  worktop: 'kitchen-worktop',
  /** image 64x48 seamless horizontally: back wall of the kitchen, white tiles with blue grout, a steel shelf lip at the bottom */
  wallTiles: 'kitchen-wall-tiles',
  /** image GRIDDLE.w x GRIDDLE.h: the plancha (griddle) with 3 slots, grease sheen, steel frame, knobs */
  griddle: 'kitchen-griddle',
  /** sheet GRIDDLE.surface frames 0-3: heat shimmer over the griddle surface (sparse light pixels, mostly transparent;
   * the game draws it at low alpha) */
  griddleHeat: 'kitchen-griddle-heat',
  /** image FRYER.w x FRYER.h: double fryer (friggitrice) */
  fryer: 'kitchen-fryer',
  /** sheet FRYER.well frames 0-3: bubbling oil of one well (big, lively bubbles, a hot glint) */
  fryOil: 'kitchen-fry-oil',
  /** sheet BASKET frames 0 raised (empty wire basket + handle, 3/4 top view), 1 lowered (rim + handle over the oil) */
  basket: 'kitchen-basket',
  /** image BIN.w x BIN.h: empty steel gastronorm pan — big, like the topping pans of ref/level7_gp_build_toppings.png */
  bin: 'kitchen-bin',
  /** image PAPER.w x PAPER.h: Ciccio's checkered burger paper on the worktop (assembly spot) */
  paper: 'kitchen-paper',
  /** sheet 44x32 frames 0-3: the paper folding around a burger, 3 = the wrapped burger = a crumpled KRAFT paper
   * parcel printed with dark-grey "CICCIO'S" lettering in rows (ref/level7_wrap_tray.jpg). Pixel fallback: the
   * game draws a high-resolution version with real lettering (src/game/kitchen/brand) */
  wrap: 'kitchen-wrap',
  /** image TRAY.w x TRAY.h: black serving tray with the PALE cream paper liner printed "CICCIO'S" (ref/level7_wrap_tray.jpg);
   * v7: the kraft wrap and the red boats on it must read clearly darker / stronger than this liner */
  tray: 'kitchen-tray',
  /** image SHELF.w x SHELF.h: chilled drinks rack (black steel, frosty glass back) */
  shelf: 'kitchen-shelf',
  /** sheet 26x30 frames 0 closed, 1 lid open: steel pedal bin */
  trash: 'kitchen-trash',
  /** sheet 16x24 frames 0-3: soft white steam wisp rising (a cooking patty, a basket lifted out of the oil) */
  steam: 'kitchen-steam',
  /** sheet 16x16 frames 0-3: dark smoke puff (burning) */
  smoke: 'kitchen-smoke',
  /** sheet 16x12 frames 0-3: sizzle (grease pops, tiny white sparks) */
  sizzle: 'kitchen-sizzle',
  /** sheet 12x12 frames 0-3: gold sparkle (PERFETTO) */
  sparkle: 'kitchen-sparkle',
  /** sheet 20x22 frames 0 hover, 1 press: tutorial pointing hand (white glove, dark outline) */
  pointer: 'kitchen-pointer',

  /* ---------------------------------------------- FOOD lane (src/art/kitchen/food/) */
  /** sheet 44x28, frame = INGREDIENTS index: the ingredient filling its pan, seen from above
   * (raw patties stacked, raw chicken, bacon strips, cheese slices, leaves, sliced tomato, …;
   * the sauces as a full ramekin) — must be recognisable at a glance */
  binFill: 'kitchen-bin-fill',
  /** sheet 44x28, frame = SIDES index: raw fries, raw nuggets, meatballs, pop corn, green nuggets in their pan */
  binSide: 'kitchen-bin-side',
  /** image 44x28: glossy golden brioche tops in a pan (the "close the burger" bin) */
  binBun: 'kitchen-bin-bun',
  /** sheet LAYER.w x LAYER.h, frame = layerFrame(): side-view burger layers as served */
  layer: 'kitchen-layer',
  /** sheet LAYER.w x LAYER.h, frame = layerCookFrame(): raw (pink / pale) and burnt (black) looks */
  layerCook: 'kitchen-layer-cook',
  /** sheet GRIDDLE_ITEM, frame = GRIDDLE_ITEMS index * 5 + GRIDDLE_STATE: patties / strips on the griddle from above
   * (juicy, grill marks and a crust that darkens state by state, fat bubbling at the edge) */
  griddleItem: 'kitchen-griddle-item',
  /** sheet FRY_ITEM, frame = FRY_ITEMS index * 3 + FRY_STATE: what is in a raised basket */
  fryItem: 'kitchen-fry-item',
  /** sheet 30x22 frames 0 empty, 1 full of golden fries: Ciccio's RED cardboard BOAT (vaschetta, trapezoid) like the
   * level 1 fries box (ref/cup_run_scene.png, ref/cup_photo_front.jpg: Ciccio's red, the brand marks in white).
   * v7: replaces the white golf-pattern boat. High-resolution version: src/game/kitchen/brand */
  cone: 'kitchen-cone',
  /** sheet 30x22, frame = STARTERS index: the same RED boat with the menù starter */
  starterBox: 'kitchen-starter-box',
  /** sheet 14x26, frame = DRINKS index: can or bottle in the drink's colours, name readable as colour + shape */
  drink: 'kitchen-drink',
  /** sheet 14x34, frame = SAUCES index: squeeze bottle (Ciccio's = orange-pink, white, BBQ dark brown,
   * maionese pale yellow, jalapeño green) */
  sauce: 'kitchen-sauce',
} as const;

export type KitchenKey = (typeof KITCHEN)[keyof typeof KITCHEN];
export type KitchenLane = 'counter' | 'station' | 'food';

/** [frame width, frame height, frame count] of every sheet, and the lane that draws it. */
export const SHEET_SPEC: Readonly<Record<string, readonly [number, number, number, KitchenLane]>> = {
  [KITCHEN.beam]: [64, 30, 2, 'counter'],
  [KITCHEN.neon]: [92, 24, 2, 'counter'],
  [KITCHEN.faceDisc]: [36, 36, 2, 'counter'],
  [KITCHEN.customer]: [96, 112, CUSTOMERS.length * CUSTOMER_POSE.count, 'counter'],
  [KITCHEN.star]: [16, 16, 2, 'counter'],
  [KITCHEN.goldenBurger]: [96, 96, 4, 'counter'],
  [KITCHEN.confetti]: [4, 6, 6, 'counter'],
  [KITCHEN.griddleHeat]: [GRIDDLE.surface.w, GRIDDLE.surface.h, 4, 'station'],
  [KITCHEN.fryOil]: [FRYER.well.w, FRYER.well.h, 4, 'station'],
  [KITCHEN.basket]: [BASKET.w, BASKET.h, 2, 'station'],
  [KITCHEN.steam]: [16, 24, 4, 'station'],
  [KITCHEN.wrap]: [44, 32, 4, 'station'],
  [KITCHEN.trash]: [26, 30, 2, 'station'],
  [KITCHEN.smoke]: [16, 16, 4, 'station'],
  [KITCHEN.sizzle]: [16, 12, 4, 'station'],
  [KITCHEN.sparkle]: [12, 12, 4, 'station'],
  [KITCHEN.pointer]: [20, 22, 2, 'station'],
  [KITCHEN.binFill]: [44, 28, INGREDIENTS.length, 'food'],
  [KITCHEN.binSide]: [44, 28, SIDES.length, 'food'],
  [KITCHEN.layer]: [LAYER.w, LAYER.h, 2 + INGREDIENTS.length, 'food'],
  [KITCHEN.layerCook]: [LAYER.w, LAYER.h, COOKABLE.length * 2, 'food'],
  [KITCHEN.griddleItem]: [GRIDDLE_ITEM.w, GRIDDLE_ITEM.h, GRIDDLE_ITEMS.length * GRIDDLE_STATE.count, 'food'],
  [KITCHEN.fryItem]: [FRY_ITEM.w, FRY_ITEM.h, FRY_ITEMS.length * FRY_STATE.count, 'food'],
  [KITCHEN.cone]: [30, 22, 2, 'food'],
  [KITCHEN.starterBox]: [30, 22, STARTERS.length, 'food'],
  [KITCHEN.drink]: [14, 26, DRINKS.length, 'food'],
  [KITCHEN.sauce]: [14, 34, SAUCES.length, 'food'],
};

/** [width, height] of every single image, and the lane that draws it. */
export const IMAGE_SPEC: Readonly<Record<string, readonly [number, number, KitchenLane]>> = {
  [KITCHEN.roomTall]: [200, 356, 'counter'],
  [KITCHEN.roomWide]: [356, 200, 'counter'],
  [KITCHEN.roomFill]: [64, 64, 'counter'],
  [KITCHEN.counterTop]: [64, 56, 'counter'],
  [KITCHEN.register]: [52, 40, 'counter'],
  [KITCHEN.counterProps]: [56, 44, 'counter'],
  [KITCHEN.goldenText]: [180, 60, 'counter'],
  [KITCHEN.goldRays]: [160, 160, 'counter'],
  [KITCHEN.worktop]: [128, 128, 'station'],
  [KITCHEN.wallTiles]: [64, 48, 'station'],
  [KITCHEN.griddle]: [GRIDDLE.w, GRIDDLE.h, 'station'],
  [KITCHEN.fryer]: [FRYER.w, FRYER.h, 'station'],
  [KITCHEN.bin]: [BIN.w, BIN.h, 'station'],
  [KITCHEN.paper]: [PAPER.w, PAPER.h, 'station'],
  [KITCHEN.tray]: [TRAY.w, TRAY.h, 'station'],
  [KITCHEN.shelf]: [SHELF.w, SHELF.h, 'station'],
  [KITCHEN.binBun]: [44, 28, 'food'],
};

/** [anim key, sheet, frames, fps, repeat (-1 loop, 0 once)]. */
export const KITCHEN_ANIMS = {
  heat: ['kitchen-heat-loop', KITCHEN.griddleHeat, [0, 1, 2, 3], 8, -1],
  oil: ['kitchen-oil-loop', KITCHEN.fryOil, [0, 1, 2, 3], 10, -1],
  smoke: ['kitchen-smoke-loop', KITCHEN.smoke, [0, 1, 2, 3], 8, -1],
  steam: ['kitchen-steam-loop', KITCHEN.steam, [0, 1, 2, 3], 7, -1],
  sizzle: ['kitchen-sizzle-loop', KITCHEN.sizzle, [0, 1, 2, 3], 12, -1],
  sparkle: ['kitchen-sparkle-once', KITCHEN.sparkle, [0, 1, 2, 3], 14, 0],
  wrap: ['kitchen-wrap-once', KITCHEN.wrap, [0, 1, 2, 3], 10, 0],
  pointer: ['kitchen-pointer-tap', KITCHEN.pointer, [0, 1], 3, -1],
  golden: ['kitchen-golden-shine', KITCHEN.goldenBurger, [0, 1, 2, 3], 8, -1],
} as const satisfies Record<string, readonly [string, string, readonly number[], number, number]>;
