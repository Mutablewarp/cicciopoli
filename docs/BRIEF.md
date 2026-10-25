# CICCIO'S — THE BURGER ADVENTURE · Production brief (source of truth)

A polished, mobile-first 2D pixel-art platformer demo for **Ciccio's Burger (Palermo)**.
It will be shown to the owner for approval, so it must feel finished: crisp art, juicy
feedback, zero broken buttons, smooth controls on iPhone/Android in portrait AND landscape.
All in-game text is **Italian**.

Stack: Phaser 3.90.0 (Arcade physics, fixed 60 Hz) · TypeScript 5.9 strict · Vite 7 ·
Vitest · Playwright. No backend, no network at runtime, all art generated in code.

---------------------------------------------------------------------------------------
## 1. References (in `ref/`, not shipped)

| File | What it shows |
|---|---|
| `ref/logo_ciccios.jpg` | **Official logo**: black line-art face — voluminous slick black hair with a side fringe, thick dark eyebrows, ROUND BLACK GLASSES with a bridge and arms, small nose outline, gentle closed smile (upper lip line + lower lip), oval jaw, ears. Wordmark **CICCIO'S / BURGERS** in a condensed, slightly rounded sans + "and more" script. |
| `ref/cup_run_scene.png` | Cup artwork (transparent bg): pixel Ciccio running (black hair, round black glasses, cream skin, **white T-shirt, navy shorts, orange/red shoes**), floating grass platforms with brick underside, **fries box**, two orange nugget-like pickups, `???` orange blocks, cream clouds, stepped green hills, HUD with 4 red hearts, coin + **161**, **TIME 96**. |
| `ref/cup_flag_scene.png` | Cup back: **golf flag (red, dark outline) on orange/yellow pole planted in a dark hole** on a grass mound — the level goal ("VAI IN BUCA"). |
| `ref/cup_photo_front.jpg`, `ref/cup_photo_back.jpg` | Photos of the real printed cup. |
| `ref/box_alette_inferno.jpg` | Wings box — **Level 2 mood**: bordeaux/red sky, giant fire VORTEX, amber cloud, dark spiky castle tower, two bats with yellow eyes, fried chicken wings with flames on a dark brick ledge, **Ciccio FLYING** (wings, white tee, navy shorts, light-blue jet trail), `???` blocks, lava band at the bottom with a dark wavy crust line. |

## 2. Art direction

- **Pixel art at native resolution**: 1 world unit = 1 art pixel, 16x16 tiles. Never draw
  anti-aliased shapes; use `src/art/pixel.ts` helpers (`paintGrid`, `fillEllipse`, `outline`,
  `ditherGradient`, `rng`, `PAL`). Deterministic output (seeded rng only).
- Cup look: clean, saturated, readable. **Dark 1-px outlines** (`PAL.ink` or a dark hue of the
  object) around sprites and props; backgrounds use softer/darker-hue outlines; far layers no
  outline and lower contrast (atmospheric perspective).
- Light comes from the **top-left**: highlight top-left edges, shade bottom-right, 2–4 tones
  per material (base, light, shade, dark). Small specular pixels on food (shine).
- Readability hierarchy: player > enemies/hazards > pickups > platforms > background.
  Platforms must be clearly distinct from background (brighter grass top, dark outline);
  background layers must never look walkable (desaturated, lower contrast, no hard top edge).
- Palette: start from `PAL` (sampled from the cup/box). You may add shades with `shade()/mix()`.
- Level 1 = cup world (sky `#60ccf0`, cream clouds, stepped green hills, lime grass, brown bricks,
  orange `?` blocks). Level 2 = box world (bordeaux → red → coral sky, fire vortex, black
  castles with lit windows, amber clouds, lava, dark stone/brick ledges with hot glowing rims).

## 3. Ciccio (the hero)

Chubby, lovable, "bello in carne": big round belly, short legs, strong short arms.
**Face from the logo**: voluminous black hair with side fringe, thick eyebrows, round black
glasses (2 circles + bridge, tiny white glint), skin `PAL.skin`, small nose, smile.
Outfit from the cup: plain **white T-shirt** (no logos), **navy denim shorts**, chunky
**red-orange shoes** with dark soles. Sprite sheet 48x48 (see `src/art/keys.ts` CICCIO).
Animations must read clearly at small size: idle breathing with belly bob, 8-frame run with
alternating arms/legs + belly bounce, jump/apex/fall poses, landing squash, hurt, flying
(superman pose, legs trailing), shoot (arm thrust), club swing (3 frames), victory.

## 4. Game design

### Feel (tuning in `src/config/tuning.ts`)
Gravity 1100 px/s², max fall 520. Run max 150, ground accel 1500, ground decel 2400 (no
sliding after release), turn accel 3200, air accel 1100. Jump v0 420 (≈5 tiles high,
≈7 tiles long at full speed), early release cuts vy to −170 after ≥60 ms of hold (a short tap
still gives a useful ~2.2-tile hop). Coyote 120 ms, jump buffer 150 ms. Stomp bounce 300
(420 if jump held). Hurt: knockback, 1.6 s invulnerability with blinking.

### Rules
Start: 4 hearts (max 4), score **161** (cup reference). Fries +10 · Burger +25 and heals 1
heart if missing · Brie +30 · Provola Goat +50 · Thai wings +60 · Crunchy wings +60 ·
stomp kill +30 · club kill +40 · cheese kill +45 (once) · crate +20 · level clear +100 (L1)
/ +200 (L2). Pits/lava: −1 heart (shields don't help), respawn at last checkpoint with
powers kept. Enemy contact: −1 heart unless Brie shield absorbs it. 0 hearts → game over.

### Powers
- **BRIE** — absorbs one enemy hit, jump +6% v0 (≈+12% height), Ciccio scale ×1.12 (level
  geometry guarantees ≥44 px clearance under every platform so growth never jams).
- **PROVOLA GOAT** — yellow square cheese stays visible as a badge on the T-shirt; enables
  rectangular cheese shots (speed 260, cooldown 420 ms, lifetime 1.2 s). Hit = enemy removed
  instantly with melted-cheese splat. Also breaks crates.
- **ALETTE THAI** — giant Thai-glazed wing **club** held low in front (never covers the face);
  swing = short animation + flames, reach 30 px ahead, ±22 px vertical, cooldown 550 ms;
  destroys enemies and crates in front. Holding the club does NOT make contact safe.
- **ALETTE CRUNCHY** (level 2 only) — two crunchy wings appear behind Ciccio: FLIGHT.
  Hold SALTA/VOLA to rise (−110), release to glide down (+55), hold SCENDI to dive (+150),
  horizontal 155, smooth vy approach (700 px/s²), ceiling at y = 48. Kept after damage /
  respawn; reset on a new game. Light-blue trail while rising.

### Enemies
L1: **Sottaceto** (pickle) patrols, charges when Ciccio is near · **Peperoncino** (chili)
bounces, telegraphs then hops toward Ciccio · **Burger corazzato** slow, armoured: stomp =
clang + bounce (no kill), killed only by cheese or club. L2: **Pipistrelli** (bats) sine
flight paths · **Diavoletti** (small demons) patrol islands, stompable · **Spiriti di fuoco**
hover/bob, not stompable (touch hurts).

### Levels (ASCII maps, data-driven)
- **01 · LE COLLINE** (cup world) — ~240 tiles wide, 16 rows. Ground surface y = 208.
  Tutorial start, `???` blocks, gaps, one-way floating platforms, crates, fries arcs that
  hint jump trajectories, Brie → Provola → checkpoint → Thai → armoured burgers → stairs →
  "VAI IN BUCA!" → golf flag + hole. 90–150 s for a beginner.
- **02 · ALETTE CRUNCHY** (box world) — ~180 tiles wide, 20 rows, lava below, islands,
  crunchy wings at x≈200 BEFORE the first big gap, flight sections with collectibles at
  varied heights, bats/demons/spirits, checkpoint brazier mid-level, burning flag + glowing hole.

### Goal
Near the end the banner **VAI IN BUCA!** appears. Walking onto the hole = Ciccio drops in →
victory overlay **IN BUCA!** with score, time, best. L1 offers "LIVELLO 2"; L2 offers
"RIGIOCA" / "MENU".

### HUD & controls
Anthracite top bar like the cup: 4 rounded red hearts (SVG, glint, empty hearts visible),
coin + score, power-up chips, level progress, TIME, pause button. Touch: ◀ ▶ on the left
(slide between them), right cluster SALTA (big) + GOAT + THAI (L1) / SCENDI + SALTA→VOLA (L2).
Locked weapons look disabled. Keyboard: ←/→ or A/D, Space/↑/W jump, ↓/S down, J/X Goat,
K/C Thai, Esc/P pause.

## 5. Architecture & ownership

```
src/contracts.ts        integrator   shared interfaces (READ-ONLY for module agents)
src/art/keys.ts         integrator   texture keys / frame indices manifest (READ-ONLY)
src/art/pixel.ts        integrator   drawing helpers + PAL (READ-ONLY)
src/art/register.ts     integrator   ArtPack -> Phaser textures (READ-ONLY)
src/main.ts, src/titleRunner.ts, src/game/{BootScene,save,viewport}.ts   integrator
src/art/ciccio.ts       agent CHARACTER   export function buildCiccioArt(): CiccioArtPack   (name 'ciccio')
src/art/items.ts        agent ITEMS       export function buildItemsArt(): ArtPack          (name 'items')
src/art/hills.ts        agent HILLS       export function buildHillsArt(): ArtPack          (name 'hills')
src/art/inferno.ts      agent INFERNO     export function buildInfernoArt(): ArtPack        (name 'inferno')
src/ui/**, src/input/** agent UI          export function createUI(root): { ui: GameUI; input: GameInput }  (from src/ui/index.ts)
public/favicon.svg      agent UI
src/audio/**            agent AUDIO       export function createAudio(): GameAudio          (from src/audio/index.ts)
src/game/** (rest), src/config/**   agents GAMEPLAY  export class GameScene (key 'game', init data {level})
```

Rules for every agent:
- Edit ONLY files you own. If a shared contract seems wrong, work around it inside your files
  and report the needed change in your final summary.
- Art packs: keep `src/art/<name>.ts` as the entry; put helper modules in `src/art/<name>/`
  (the gallery globs only `src/art/*.ts`, and only functions named `build*Art`).
- Files ≤ 400 lines, strict types, no `any`, no `console.log` left behind, no dead code.
- Run `npx tsc --noEmit` and fix errors in YOUR files (ignore errors in files other agents
  are still writing). Run `npx vitest run` when you add tests.
- A pre-write hook may block the first write of each new file asking for "facts": state the
  importers/callers, API, data schema (if any) and quote the user instruction
  ("il videogioco deve essere perfettamente giocabile, deve essere con ogni grafica curata"),
  then retry the same write.

### Previewing your work
- Art: `node scripts/shot.mjs "gallery.html?pack=<name>&scale=4" <scratch>/out.png --size 1600x1400 --full`
  then open the PNG with the Read tool and critique it like an art director. Iterate.
  `&bg=light` shows sprites on sky blue. `&anim=0` freezes animations.
- Game: `node scripts/shot.mjs "index.html?level=1&debug=1" out.png --size 1280x720 --steps steps.json`
  (see header of scripts/shot.mjs for steps format; `--mobile` emulates a touch phone).
- Write scratch files (screenshots, step files) under the scratchpad directory given in your
  prompt, never inside the project.

---------------------------------------------------------------------------------------
## 6. Expansion v2 (owner feedback) — source of truth for the new work

### New references (ref/)
| File | What it shows |
|---|---|
| `ref/logo_official.jpg` | The OFFICIAL logo sent by the owner: white face, black voluminous hair with thin white outline, black round glasses, black brows, nose and smile lines, condensed white wordmark "CICCIO'S". Transparent PNG ready: `public/brand/ciccios-logo.png` (607x1040, keyed from the dark background). |
| `ref/photo_provola_fries_nuggets.jpg` | Real food photo. TOP box = **PROVOLA GOAT**: three **rectangular** fried battered provola sticks (golden-beige bumpy batter) in a maroon paper tray with black/white checkered liner. BOTTOM box = **fries tray** (Ciccio's red/maroon paper boat full of golden fries) with **nuggets** (round breaded golden-brown crunchy bites). Ciccio's printed tray paper shows the "CICCIO'S" wordmark. |
| `ref/invaders_sprites.png` | Owner's art for **CICCIO'S INVADERS** (level 3): deep navy starfield with tiny warm speckles; Ciccio's light-blue jet fighter (Ciccio's round face with black round glasses in the cockpit) at the bottom; FOOD floating in space: cheese wheel, roast chicken, wheat ears, chicken drumstick, lettuce/greens, grey smoke puffs, cherry tomatoes on the vine, egg, cheese slices, half burger bun. |
| `ref/invaders_title.png` | Level title art: bold white italic wide wordmark "CICCIO'S / INVADERS" (bottom line curved) on the starfield, the jet flying diagonally. |

### Changes to levels 1–2
- **Nuggets are the coins**: new `ITEMS.nugget` pickup (spinning crunchy nugget, +10). Coin arcs in L1/L2 use nuggets; the HUD coin icon becomes a nugget.
- **Fries** = Ciccio's red paper tray of fries (photo bottom), rarer bonus: **+30**. Burger +25 and heals.
- **Provola Goat** = rectangular battered provola sticks (pickup, T-shirt badge, the shot is a flying provola stick).
- **Kill effects**: an enemy hit by Provola Goat is **swallowed by melted cheese** (`ITEMS.cheeseEngulf`: cheese blob grows over it, the enemy sprite turns yellow and is hidden under the blob, then it drips away — the enemy is gone). An enemy hit by the Thai-wing club **catches fire** (`ITEMS.burn`: the enemy sprite tints orange/black while flames rise, then a dark ash puff, gone). Stomp kills keep the squash + poof.
- Level chain: L1 → L2 → L3 → L4 → L5 ("LIVELLO SUCCESSIVO ▶" on the victory card); L5 is the last.

### LEVEL 3 — CICCIO'S INVADERS (shooter, scene key `invaders`)
- Space-Invaders-style fixed playfield, **portrait-native** (≈ 224 x 288 world px), centred and scaled to fit any screen; the starfield fills the rest of the view (landscape gets starfield + the CICCIO'S INVADERS wordmark at the sides is fine).
- Player: **Ciccio's light-blue jet** (from `ref/invaders_sprites.png`, Ciccio's face + round black glasses visible in the cockpit), moves left/right along the bottom, banks slightly while moving. **FUOCO** fires provola sticks upward (max 2 on screen, short cooldown).
- Invaders: a marching formation (≈ 5 rows x 8) of **space things**: aliens (top rows), small ringed planets, asteroids (bottom rows) — 2-frame animated, step sideways, drop a row at the edges, speed up as they thin out; they drop meteor bits / alien goo. Destructible shields shaped like burgers (bun/patty layers that erode pixel by pixel). A UFO crosses the top now and then (bonus + drops a power-up capsule).
- **FULMINE (lightning) skill**: capsules (from the UFO and from some invaders) give lightning charges. **FULMINE** fires a lightning bolt that strikes a target and chains to 2–3 neighbours: everything it touches (aliens, planets, asteroids) **turns into FOOD** with a grey smoke puff (the ingredients of the owner's art: cheese wheel, roast chicken, drumstick, wheat, lettuce, tomatoes, egg, cheese slices, bun). The food then drifts down: catching it with the jet = bonus points (+50) and fills the HUD (the transformed foods are the level's "collectibles").
- Hearts (4), invulnerability blink after a hit, 3 waves of increasing difficulty, then a **black hole** opens ("VAI IN BUCA!") and the jet flies into it → victory "IN BUCA!" (+300 clear bonus). Game over at 0 hearts.
- Controls: ◀▶ + FUOCO (big) + FULMINE (shows charges). Keyboard: ←/→ or A/D, Space/J/X = fuoco, K/C = fulmine, Esc/P pause.
- Music `invaders`; sfx `laser`, `bolt`, `transform`, `explode`, `ufo`, `invaderStep`, `hurt`, `coin` (food caught).

### LEVEL 4 — CICCIO-MAN (maze, scene key `maze`)
(The owner asked for a "Ciccio's Pac-Man"; the level is called **CICCIO-MAN** because "Pac-Man" is a third-party trademark — easy to rename later.)
- Original maze (NOT the Namco layout), symmetric, ≈ 28 x 31 cells of 8 px (224 x 248 world px), fits portrait phones; scaled to fit any screen. Walls styled like **Ciccio's maroon paper trays with the black/white checkered liner** on a dark charcoal floor.
- Player: **Ciccio's round head** (logo face: black hair, round black glasses, smile) that chomps (mouth opens/closes); faces the movement direction without rotating the glasses upside down (left/right mirror, up/down dedicated frames).
- Dots = **mini nuggets** (+10 coins). Power pellets = **provola sticks** (4, flashing): ghosts become "melted cheese" scared mode and can be eaten (+200, +400, +800, +1600), eaten ghosts return home as eyes.
- Ghosts = enemies from levels 1–2, each with its own chase personality: **Sottaceto** (pickle, direct chase), **Peperoncino** (chili, ambush ahead), **Diavoletto** (demon, flanking), **Burger corazzato** (armoured burger, shy/random). Scatter/chase timer like the genre.
- Bonus items appear twice: burger, fries tray, crunchy wings.
- 4 hearts; when all nuggets are eaten a **golf hole** opens in the centre ("VAI IN BUCA!"): enter it → victory "IN BUCA!". Buffered turns + cornering forgiveness. Controls: 4-way cross pad + swipes on the game area; keyboard arrows/WASD.
- Music `maze` (original bouncy chiptune — never copy the Pac-Man melody); sfx `chomp`, `pellet`, `ghostEat`, `ghostHome`, `hurt`.

### v2 ownership
```
UI lane        src/ui/**, src/input/**, index.html (static splash only), public/**
ITEMS lane     src/art/items.ts, src/art/items/**
AUDIO lane     src/audio/**
GAME-FIX lane  src/game/** except src/game/invaders/**, src/game/maze/**, BootScene/save/viewport;
               src/config/**; may touch src/art/inferno/tiles.ts and src/art/ciccio/poses.ts for QA fixes
L3 lane        src/art/space.ts, src/art/space/**, src/game/invaders/**
L4 lane        src/art/maze.ts, src/art/maze/**, src/game/maze/**
integrator     src/contracts.ts, src/art/keys.ts, src/main.ts, docs/**
```
Shared contracts (src/contracts.ts) already contain: LevelId 1–4, LEVEL_SCENE, Dir4, GameInput.axisY / consumeDir, ControlsLayout.mode + clubCount, PowerState.bolt/pellet, new SfxName / MusicName values, ViewportInfo.insetTop.

---------------------------------------------------------------------------------------
## 7. Expansion v3 (owner feedback, 2026-10-18) — source of truth for this round
Owner words (IT): "sistemassi il livello di Ciccio's Invaders mettendo tutto un pochino più zoomato in modo
tale che si veda meglio la navicella, il logo di Ciccio's sopra la navicella e quant'altro" · "sistemassi
il livello di Ciccioman mettendo al centro proprio il logo di Ciccio's, non la faccia che hai messo" ·
"livello numero 5, che ci sarà Ciccio's in versione Hulk, in cui deve spaccare tutto e deve anche
combattere con i vari avversari. E quando arriva alla fine del livello, dove c'è scritto vai in buca,
metti un'animazione in cui Ciccio's in versione Hulk strappa la bandierina e la lancia via. Ti mando
l'immagine che tu ritagli, scontorni e la fai bella sistemata."

References (ref/, not shipped): hulk_screenshot.png (upright phone screenshot of the T-shirt, flat, 923x2000, best
for the cut-out), hulk_photo.png (photo of the physical shirt, rotated upright, higher resolution but wrinkled).
Palette of the shirt art: black, lime green skin (#a6d62c-ish with darker green shading), purple shorts, magenta
"SPACCA!" starburst with white lettering and lime outline, the Ciccio's logo face (black hair + round black
sunglasses) on the green head.

**Naming (trademark): never print the word "Hulk" or "Pac-Man" in the UI.** The hero is "CICCIO SPACCA!"; level 5 is
"SPACCA TUTTO" (subtitle "CICCIO SPACCA!"). Code identifiers may say hulk.

### L3 CICCIO'S INVADERS — zoom
Everything must read bigger on a phone: the jet, the Ciccio's face logo on the jet, shots, pickups, invaders.
Target: on a 390x844 (DPR 3) portrait phone and on 844x390 landscape the jet is >= 1.5x its current on-screen size and the
face is clearly recognisable (glasses, hair). Full formation, bombs, shields and the lightning must stay playable and
visible. Options (lane decides with screenshots): scale the jet / shot / pickup art up, trim dead bands of the field,
narrow the field so the framing zooms more (camera may follow the jet horizontally if the formation still reads).

### L4 CICCIO-MAN — real logo in the centre
The centre logo plaque of the board shows the OFFICIAL Ciccio's logo (public/brand/ciccios-logo.png: head with the
round glasses + the CICCIO'S wordmark), not the pixel face made earlier. Faithful, big, crisp, on a plate that
keeps contrast (the logo is white + black on transparent). The ghost house stays in the middle and stays readable.

### L5 SPACCA TUTTO (platform brawler, scene key 'game', theme 'rampage', music 'rampage')
- Hero: Ciccio in Hulk form (art pack `hulk`, keys HULK / HULK_FX in src/art/keys.ts). Bigger and heavier than Ciccio:
  strong, slower run, big jump, heavy landing. 4 hearts, score starts at 161 like the other levels.
- Controls (platform layout, ControlsLayout.mode 'platform'): SALTA, PUGNO (club action: fast melee punch in front,
  short cooldown), SPACCA (fire action: ground slam; in the air = dive straight down; shockwave on impact breaks every
  breakable and damages enemies in radius). Keyboard: J/X = SPACCA, K/C = PUGNO (same keys as GOAT / THAI).
- Smash everything: bricks (3 hits, cracked sprite stages), crates, barrels break with debris + dust + hit-stop + shake;
  some contain nuggets / fries / burgers. Tall brick walls block the path and MUST be smashed to proceed (never a
  soft-lock; level must stay beatable, reach tests updated for the Hulk jump).
- Enemies: pickle, chili, armour burger (from the hills pack, now one punch kills; armour = 2 punches) + `brute`
  (3 HP, charges) + `megaburger` mini-boss (8 HP, slam attack with shockwave, in an arena just before the goal).
  A punched enemy is LAUNCHED away spinning with a comic starburst; a slam crushes. Hurt on contact: -1 heart
  (no Brie / Provola / Thai / Crunchy on this level; pickups: nugget coin, fries tray, burger heal).
- Goal: banner "VAI IN BUCA!" as usual. At the flag the control is taken away: the hero walks to the pole, GRABS the
  flag, RIPS it off (pole swaps to the ripped sprite, `rip` sfx, shake, burst), THROWS it (the cloth tumbles away in
  an arc off-screen), roars / victory pose, then the "IN BUCA!" victory overlay (hasNext false: RIGIOCA / MENU).
- Camera, checkpoints, pause, restart, resize, rotation, touch re-arm: all as in levels 1-2 (re-entry safe).

### v3 ownership
```
L3 lane        src/art/space.ts, src/art/space/**, src/game/invaders/**
L4 lane        src/art/maze.ts, src/art/maze/**, src/game/maze/**, scripts/logo-bits.mjs (new)
HULK-ART lane  src/art/hulk.ts, src/art/hulk/**, public/brand/hulk-cutout.png
WORLD-ART lane src/art/rampage.ts, src/art/rampage/**
GAME lane      src/game/** except invaders/**, maze/** (levels/level5.ts, themes, enemies, player, goal, flow ...),
               src/config/**
UI lane        src/ui/**, src/input/**, index.html (static splash only), public/** except brand/hulk-cutout.png
AUDIO lane     src/audio/**
integrator     src/contracts.ts, src/art/keys.ts, src/main.ts, docs/**, scripts/e2e.mjs
```
Contracts already extended by the integrator: LevelId 1-5, LEVEL_SCENE[5]='game', SfxName punch/smash/slam/rubble/roar/rip,
MusicName 'rampage', SCORE.clear[5], HULK / HULK_ANIMS / HULK_FX / HULK_FX_ANIMS / RAMPAGE / RAMPAGE_ANIMS in art/keys.ts.

---------------------------------------------------------------------------------------
## 8. Level 6 — CICCIO'S RUSH · MISSIONE CONSEGNA A PALERMO (owner request, 2026-10-20)
The owner sent a long "master prompt" (arcade delivery driving game) and asked to follow it but to
build it AS LEVEL 6 OF THIS GAME, in the SAME pixel-art style as the other levels (no visual
discrepancy), "magnetic" (keeps you glued for its 90 seconds), bonuses / maluses inspired by the
Ciccio's Palermo menu, an EASTER EGG where a booster makes the Ciccio's truck FLY "like the new
Tesla" (a meme), and the truck logo + lettering must read well while driving. Refs:
ref/truck_photo.png (real trailer: matte black, white "Ciccio's" script + burger icon, "The Burger
Truck", two red checkered bands, PALERMO, SICILY!, face logo + SEGUICI! on the rear door),
ref/truck_top.png (render of the Sprinter box van from above), ref/truck_face_side.png (box with the
big face logo and CICCIO'S lettering), ref/truck_cartoon.png (cartoon truck, Ciccio at the wheel).

Real places (cicciosburger.it): Ciccio's La Lumia (Via Isidoro La Lumia, centre: Politeama / Via
Libertà), Sperlinga (Via Boris Giuliano), Stadio (Viale del Fante), Gluten Free (Via Principe di
Paternò), Terrasini (opening soon), Burger Truck. **Owner: never mention Mondello (no shop there any
more). Zone 3 is the TERRASINI seafront, where the new Ciccio's Terrasini will open: the last order is
delivered there.** Menu names usable in the game (never invent products): Big,
Tuma, Crispy Goat, Old School, American Baconcheese, Brie, Double Triple, Green, Cheeseburger,
Bacon Cheeseburger, Talè, Zola, Egg, Pancetta, Nuggets, Chicken Pop Corn, Waffle Fries, Fries,
Green Nuggets Veggie, Meatball, Ciccio's sauce.

**Naming / legal:** never print "Tesla", "Elon", "SpaceX", "Starman", "Hulk", "Pac-Man", "Mondello" in visible text. The
meme is told with our own words ("0–100 in 1,61 secondi", "il primo burger truck volante"). No
fake QR codes that scan; no prizes, discounts or real rewards; no claims of official authorisation
(footer already says "Demo concept non ufficiale"). No analytics code at all (privacy default off).

### Run (scene key 'rush', LevelId 6, music 'rush')
- Portrait-first, landscape must work too. Top-down road scrolling down, 3 lanes of 40 px, the truck
  near the bottom third, auto-forward. 90 s of active play (countdown in the HUD), 3 zones of 30 s:
  1 PALERMO CENTRO (Politeama / Via Libertà, daylight, light traffic; departs from Ciccio's La Lumia),
  2 ZONA STADIO (Viale del Fante, busier, roadworks, Ciccio's Stadio storefront, pink-and-black stands),
  3 LUNGOMARE TERRASINI (sunset, sea, cliffs, small port with gozzi, palms, coastal tower, the Ciccio's
  Terrasini storefront with PROSSIMA APERTURA: the 3rd order goes there; densest but fair).
- Controls: swipe left / right (one lane per swipe, no double moves), ◀ ▶ buttons (tap = one lane),
  hold FRENA (smooth slow-down, release = smooth back); keyboard ←/→ A/D lanes, ↓/S/Space brake,
  Esc/P pause. Lane change ~250 ms eased; optional vibration (navigator.vibrate) on hits/deliveries.
- Traffic: city cars, SUVs, vans, orange bus, Vespa scooters, Ape car (slow), cars parked in double row
  with hazard blinkers; hazards: cones, roadworks barriers / pits, spilled Ciccio's sauce (slippery:
  lane change slower + wobble for 1.5 s, Cheddar Grip ignores it). Seeded generator + VALIDATOR:
  every sequence has a reachable safe route given lane-change time, braking and >= 1.2 s warning;
  no spawn near the truck; delivery lanes kept clear; difficulty grows by density / pattern variety,
  speed only a little. Thousands of seeds simulated in tests.
- 3 orders per run (deliveries due ~25 s / 53 s / 80 s). Each order = a real menu pair (e.g. "Big +
  Waffle Fries per Rosalia, Via Libertà") announced by a banner; the destination shows ~4 s ahead as a
  glowing green lane zone with a waving customer on the sidewalk. Driving through it in that lane =
  automatic hand-off (bag arcs to the customer, "ORDINE CONSEGNATO!" / "CONSEGNA PERFETTA!", +1000).
  Missed: "CONSEGNA MANCATA!", one recovery zone a few seconds later ("ULTIMA CHANCE", -20 freshness);
  missed twice = order lost, the run continues. Sicilian flavour lines from customers ("MIZZICA!",
  "TALÌA CHE VELOCITÀ!", "GRAZIE CICCIO!").
- Vehicle condition: 3 hearts; a hit = -1, shake, flash, crash sfx, -20 freshness, 1.2 s invulnerable,
  combo reset. 0 hearts = run ends early ("CORSA TERMINATA!").
- Power-ups (menu food, one timed power at a time; the shield may stack): SCUDO NUGGETS (absorbs one hit,
  max 8 s), WAFFLE RADAR (5 s: red chevrons on dangerous lanes ahead, green on safe ones), POPCORN
  SPRINT (4 s: +15% speed, popcorn particles, spawner adapts so it stays fair), CHEDDAR GRIP (6 s:
  faster lane change, no sauce slip). Score pickup: fries tray (+25). Never required to survive.
- EASTER EGG "PROPULSORE": once per run a rocket-booster crate appears in zone 3 (only while the player
  drove clean for the last 8 s; retries until 78 s). Grab it = 5 s FLIGHT: boosters + flames, the truck
  lifts (shadow drops away, scale up), flies over traffic invulnerable, nuggets float in the air for
  points, speed lines, banner "ROADCOASTER ATTIVATA!" (owner's wording) sub "0–100 in 1,61 secondi". A delivery zone
  passed while flying = "CONSEGNA DAL CIELO!" (the bag parachutes down, +200). Safe landing (traffic
  cleared around, 1 s invulnerable). Secret achievement "IL TRUCK VOLA!".
- FINALE = the ROADCOASTER meme (owner: recreate the internet meme of the electric roadster floating in
  space, with the Ciccio's truck; never write the car brand): if all 3 orders are delivered, at 0 s
  "ROADCOASTER ATTIVATA!", the truck fires its boosters over the Terrasini sea and climbs through the
  sunset sky (side view 'rush-truck-fly') into SPACE: the famous shot recreated — 'rush-truck-orbit'
  floating over 'rush-space' (Earth's limb, the Mediterranean, Sicily lit), Ciccio in a white spacesuit at
  the wheel with his arm on the window, slow drift + rotation; meme card: "CICCIO'S ROADCOASTER",
  "0–100: 1,61 s", "Autonomia: 3 panini", "Pilota: Ciccio (in tuta spaziale)", "NIENTE PANICO",
  "Ciccio nello Spazio dal 2021" (Ciccio's first graphic theme was really 'Ciccio nello Spazio').
  Then the results.
- Drivers (choose 1 before the run): RIFLESSI DA CICCIO (default: lane change 200 ms), OCCHIO AL TRAFFICO
  (warnings 0.3 s earlier; unlocked after the first delivery ever), RE DELLE CONSEGNE (half freshness
  loss on hits; unlocked by completing all 3 deliveries in a run). Daily challenge: seed = today's date,
  standard driver, own daily best.
- Freshness 0..100 per order; bonus 0-500 at hand-off. Score: delivery 1000, freshness 0-500, clean
  pass (a vehicle passes below the truck without a hit) 15 x combo (deliveries stay the main source) (x1 -> x3 cap, +0.25 every 4 passes),
  collision-free zone +300. Stars: 1 = >= 1 delivery; 2 = >= 2 deliveries and >= 2500 points;
  3 = 3 deliveries, average freshness >= 80, no hits. All numbers in src/config/rush.ts.
- Results (DOM): CONSEGNA COMPLETATA! / CORSA TERMINATA!, breakdown, stars, best, new achievements
  (PRIMA CONSEGNA, ZERO URTI, RE DI PALERMO, TRIS PERFETTO, MAESTRO DEL TRAFFICO, secret IL TRUCK
  VOLA!), driver unlocked, one tip ("Ti mancavano 150 punti per il tuo record!", "Evita un urto per
  la terza stella!"), RIPROVA (primary, instant, no tutorial), CONDIVIDI RISULTATO (Web Share, else
  copy), SCOPRI IL MENÙ CICCIO'S (https://cicciosburger.it/, new tab), MENU.
- Pre-run panel (DOM): CICCIO'S RUSH / MISSIONE CONSEGNA A PALERMO, the side-view truck, record, GIOCA ORA,
  SFIDA DEL GIORNO, driver cards, COME SI GIOCA, IMPOSTAZIONI (swipe sensitivity / off, vibration,
  reduced motion, high contrast, music). First run: 3 tiny in-game hints in the first seconds
  (skippable, never repeated). Reduced motion (setting or prefers-reduced-motion): no shake, no speed
  lines. High contrast: darker scenery, outlined traffic / hazards.
- Persistence: best score via SaveStore.recordWin(6, …) (at the end of any run that reached 0 s with
  >= 1 delivery); everything else (settings, drivers, achievements, daily bests, first-run flag) in the
  game-owned localStorage key 'cicciopoli.rush.v1' (failure-tolerant like save.ts).
- Deferred (named, not built): cosmetic van unlocks, online leaderboard, analytics.

### v4 ownership
```
RUSH-ART lane   src/art/rush.ts, src/art/rush/** EXCEPT src/art/rush/keys.ts, scripts/truck-logo*.mjs (new)
RUSH-GAME lane  src/game/rush/**, src/config/rush.ts, src/main.ts (only: import + register RushScene)
UI lane         src/ui/**, src/input/** (driver controls, swipe sensitivity, HUD fields, 6th title card,
                rush setup + results screens, pause unchanged)
AUDIO lane      src/audio/** (9 sfx, 'rush' music: Palermo street-food tarantella energy + engine pulse,
                setMusicMuted)
integrator      src/contracts.ts, src/art/rush/keys.ts, src/game/save.ts, docs/**, scripts/e2e.mjs
```

---------------------------------------------------------------------------------------
## 9. Level 7 — CICCIO'S KITCHEN · IL TURNO DA CICCIO'S (owner request, 2026-10-24)
Owner, in short: the player **cooks the burgers and serves the customers**, like the "Good Pizza,
Great Pizza" screenshots he sent (customer at the counter → kitchen → serve). While serving, the
background is **the stainless / corrugated-steel counter of Ciccio's La Lumia plus the greenery of
Ciccio's Sperlinga**. Everything in Italian. **The menu is the real online Ciccio's Palermo menu**:
Ciccio's burgers, classic burgers, the starters, and the real order forms **PANINO SINGOLO or MENÙ**
(menù = burger + patatine + starter a scelta + bibita, **+5,00 € on the burger price**). The player
**piastra** (griddles) the meat, puts the **bacon**, the **cheddar**, the toppings, the sauce.
"Dinamica accattivante, interessante, CHIARA soprattutto", it must keep you glued to the screen.
Final award like **"YOU ARE SO GOLDEN"**. Same pixel-art style as the other levels. Publish when done.

References (ref/, not shipped): `level7_lalumia_counter.jpg` (corrugated steel counter + steel top,
a row of warm bare bulbs on a black beam, white neon "CICCIO'S" letters, two black menu boards
CLASSIC BURGER / CICCIO'S BURGER / STARTERS / CICCIO'S MENU, round white disc with the face logo,
white tiles with blue grout), `level7_sperlinga_plants.jpg` (trailing pothos / ferns on black iron
arches with circle motifs, red-brick wall panels, thin ring lights on the ceiling, dark planters,
black tables and chairs, CICCIOPOLY poster: Ciccio as the board-game tycoon, orange neon script),
`level7_gp_*.png` (Good Pizza flow: counter dialog, prep board, topping bins, oven / conveyor),
`ciccios_menu_palermo.json` (the real menu, fetched 2026-10-24 from api.cicciosburger.it, Palermo
stores La Lumia / Sperlinga / Stadio). The game data lives in `src/config/kitchenMenu.ts` and must
not drift from it: **never invent a product, an ingredient or a price**.

**Naming / legal:** same rules as §8 (no "Tesla", "Elon", "SpaceX", "Starman", "Hulk", "Pac-Man",
"Mondello" in visible text; no prizes, discounts, QR codes, analytics; "Demo concept non ufficiale"
stays). The € amounts are in-game takings only. No alcoholic drinks in the game (the beers on the
real menu are left out: family game). Drink cans are generic coloured cans with the drink name, never
a copied brand logo.

### The loop (scene key 'kitchen', LevelId 7, music 'kitchen')
One **turno** (shift) = **8 customers**, one at a time (~25–45 s each), ~4 minutes.
1. **BANCONE (counter view)** — POV from behind the counter, like Good Pizza: at the bottom the
   stainless-steel counter top with its corrugated-steel lip (La Lumia), at the top the black beam with
   the row of warm bulbs and the white "CICCIO'S" neon; behind the customer the dining room of
   Sperlinga (plants on black iron arches, brick panels, ring lights, black tables, blue-grout tiles,
   the CICCIOPOLY poster, the round face-logo disc on a pillar). The doorbell rings, a customer walks
   in, stops at the counter (waist-up, expressive) and orders in a speech bubble, in natural Italian
   with a Sicilian touch: "Ciao Ciccio! Un BRIE in menù: nuggets e Coca Cola, grazie!" The **ticket**
   (scontrino) appears. Button **PRENDI L'ORDINE** → the camera slides to the kitchen.
2. **CUCINA (kitchen view)** — 3/4 top-down, brushed-steel worktop, Good Pizza layout. The ticket stays
   pinned on top: burger name, SINGOLO / MENÙ, the ingredient checklist (ticks as items go on, a red
   ✗ for a wrong item), menù parts (patatine, starter, bibita), the customer's patience bar (face goes
   from happy to angry). Stations, all on screen at once, no scrolling, both orientations:
   - **PIASTRA** (griddle, 3 slots): tap the meat bin → a burger lands and sizzles. A cook ring fills:
     CRUDO → **PERFETTO** (golden window, "ding" + sparkle) → troppo cotto → BRUCIATO (smoke). Burgers
     need **2 sides**: tap to **GIRA** (flip) inside the window, tap again when side 2 is perfect: it goes
     onto the burger. Double-patty burgers need two. **Bacon and guanciale** also go on the griddle
     (one side, faster). Burnt items: tap = into the bin.
   - **FRIGGITRICE** (fryer, 2 baskets): chicken burgers (Crispy Goat, Super Crispy, Gomu Gomu), the
     patatine and the menù starter. Tap the bin → the basket drops and bubbles; lift it when golden.
   - **MONTAGGIO** (assembly): the bottom bun is already on the paper; tap a bin / bottle / a cooked
     item to put it on the stack. The burger grows as a **side-view stack** (every layer readable),
     cheddar drapes and melts on a hot burger. Tap the top layer to take it back off. Tap the top bun
     to **close**: the burger is wrapped in Ciccio's paper and goes on the tray.
   - **Bins** shown = the ones this order needs + a few decoys (so the player reads the ticket), never a
     wall of 30 bins. Sauce bottles (Salsa Ciccio's, white, BBQ, maionese, special jalapeño).
   - **BIBITE**: a fridge rack with the right drink + decoys. **Patatine / starter** come from the fryer.
   - Button **SERVI** (enabled once a wrapped burger is on the tray) → camera slides back to the counter.
3. **SERVIZIO** — the tray goes over the counter, the customer tastes: 1–5 stars, a reaction line
   ("MIZZICA, CHE BONTÀ!", "Talìa che panino!", "Ma... e il bacon?", "È crudo!"), the real price
   ("+14,90 €") and a tip if fast; then walks out and the next one comes in.
Rating per order: right ingredients (missing / wrong / extra), cooking quality (raw, perfect, burnt),
menù parts right (patatine, starter, drink), speed (patience left). A customer whose patience runs out
leaves angry ("Troppo lento, me ne vado!") = −1 heart; **3 hearts**, 0 = "TURNO CHIUSO!" early.
Streak of 5-star orders = **COMBO** multiplier. Points come mainly from well-made orders (scaled by the
real price), with bonuses for speed and every PERFETTO cook. All numbers in `src/config/kitchen.ts`.

Order deck (seeded): 1 HAMBURGER singolo (guided), 2 CHEESEBURGER in menù (guided: fryer + drink),
3 BACON CHEESEBURGER singolo (bacon on the griddle), then 5 random Ciccio's burgers of growing
complexity (at least one fried chicken burger, one double patty, ~half in menù), real prices.
Menù starter choices (real rule): nuggets, meatball, chicken pop corn, green nuggets (green only for the
GREEN menù). Drinks: acqua naturale / frizzante, Fuze Tea pesca / limone, Lemon Soda, Sprite, Fanta,
Coca Cola, Coca Cola Zero, Chinotto.

**First run**: customers 1–2 are a guided tutorial (a pixel hand points at the next step, patience is
frozen, one short line per step: "Tocca la carne: va sulla piastra!", "Girala quando è dorata!", …).
Never repeated. Setting **AIUTI** (default on): the next useful bin / station pulses softly.

**End of the shift** → stars: 1 = ≥ 3 customers served with ≥ 3 stars; 2 = all 8 served, average
≥ 3.5; 3 = all 8 served, average ≥ 4.5, nobody left angry. **3 stars = the golden finale**: the bulbs
flash, a golden burger trophy descends in sparkles and confetti, huge golden lettering
**"YOU ARE SO GOLDEN!"**, Ciccio's face logo in gold, then the results. Results (DOM): TURNO FINITO! /
TURNO CHIUSO!, incasso €, clienti serviti, stelle medie, piastrate perfette, breakdown, stars, record,
new achievements (PRIMO PANINO, PIASTRA D'ORO = 10 perfect burgers, RE DEL BACON, MENÙ COMPLETO,
NESSUNO SCONTENTO, YOU ARE SO GOLDEN), one tip ("Gira la carne nella zona dorata!"), RIPROVA (primary),
CONDIVIDI RISULTATO, SCOPRI IL MENÙ CICCIO'S (https://cicciosburger.it/, new tab), MENU.
Pre-shift panel (DOM): CICCIO'S KITCHEN / IL TURNO DA CICCIO'S, a big pixel burger, record, GIOCA ORA,
COME SI GIOCA (4 illustrated steps: ordine, piastra, monta, servi), IMPOSTAZIONI (aiuti, vibration,
reduced motion, music). Persistence: best via SaveStore.recordWin(7, …) at the end of any shift with
≥ 1 customer served; settings, achievements, tutorial flag in 'cicciopoli.kitchen.v1'.
Controls: everything by tap (mouse on desktop); drag is a bonus, never required. Tap targets ≥ 44 CSS px
on a 375 px wide phone. The one big action button (PRENDI L'ORDINE / SERVI) is a DOM control
(ControlsMode 'kitchen', fires the 'fire' action; keyboard Enter / Space too); Esc / P pause.
Deferred (named, not built): Happy Ciccio's kids menù, separate starters / sauces orders, two-burger
orders, daily challenge, online leaderboard.

### v5 ownership
```
KITCHEN-COUNTER-ART lane  src/art/kitchen/counter/**  (dining-room backgrounds, counter top, bulb beam,
                          neon, face disc, register, customers, golden award art)
KITCHEN-STATION-ART lane  src/art/kitchen/station/**  (worktop, griddle, fryer, bins, layers, cooking
                          states, sauces, cans, tray, wraps, fx, pointer)
KITCHEN-GAME lane         src/game/kitchen/**, src/config/kitchen.ts, src/main.ts (only: import + register)
UI lane                   src/ui/** (7th title card + thumb, 'kitchen' controls mode, kitchen HUD: ticket,
                          speech bubble, patience; kitchen setup + results screens)
AUDIO lane                src/audio/** (kitchen sfx + 'kitchen' music + golden fanfare)
integrator                src/contracts*.ts, src/art/kitchen.ts, src/art/kitchen/keys.ts,
                          src/config/kitchenMenu.ts, src/game/save.ts, docs/**, scripts/e2e.mjs, README.md
```

### v5.1 — owner feedback on level 7 (2026-10-24, evening) — overrides the points above where they differ
New references (ref/): `level7_gp_build_toppings.png` + `level7_gp_build_cut.png` (Good Pizza prep screens),
`level7_pov_order.png` (Ciccio's Sperlinga seen from behind the steel counter: the ORDER view),
`level7_wrap_tray.jpg` (real Ciccio's tray: kraft-paper burger wraps printed "CICCIO'S", white paper boats for
fries / starters with a light golf line pattern, black tray with a "CICCIO'S" printed liner, sauce cups),
`ciccio_face_logo2.jpg` (the owner's face logo again; same as ciccio_face_logo.jpg).
1. **Kitchen = the Good Pizza prep screen**: "la persona deve facilmente scegliere gli ingredienti". A big central
   assembly board with the burger growing on it, BIG ingredient pans framing it in a neat panel (a top row and a
   side column, like the sauce / cheese / pepperoni pans around the dough), the bin at the edge, the cooking
   stations (griddle, fryer) on the other side like the oven conveyor. Pans big, contents recognisable, labels
   readable, nothing tiny, nothing far away.
2. **Order view = the POV photo**: polished steel counter top in the foreground, the Sperlinga dining room behind
   (pergola with ring lights, plants, brick, orange neon, CICCIOPOLY poster, window, black tables, blue-grout
   tiles); the customer stands in it. No empty bands.
3. **More customer types** so every criterion of the real menu is satisfied: 10 regulars (keys.ts CUSTOMERS),
   each with tastes mapped to a slice of the menu (classic lovers, big eater, chicken fan, spicy lover, vegetarian
   for the GREEN + green nuggets, gourmet for TALÈ / ZOLA / TUMA / PANCETTA, tourist, …); together they order all
   17 burgers, singolo and menù, every starter and drink; consecutive shifts favour what the player has not cooked
   yet, so a few shifts show the whole menu.
4. **Packaging identical to the real one**: the wrapped burger is a crumpled kraft-paper parcel printed with rows
   of "CICCIO'S"; fries and starters come in white paper boats with the light golf pattern; tray liner printed
   "CICCIO'S". Drawn in HIGH RESOLUTION (canvas 2D at screen resolution, like the level 3 jet logo), not pixel art,
   so the lettering is crisp; the food inside stays pixel art.
5. **The Ciccio's logo is always the ORIGINAL** (public/brand/ciccio-face-hd.png, 358x512, cut from the owner's
   file; ciccio-face.png 167x239 for small uses), never redrawn in pixels: face disc on the wall, golden finale
   (gold-tinted original), setup / title / results wherever the face appears.
Ownership addition: BRAND lane = src/game/kitchen/brand/** (high-resolution packaging + logo textures for the
scene, with a small API the game lane calls).
