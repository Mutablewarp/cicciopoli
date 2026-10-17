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
- Level chain: L1 → L2 → L3 → L4 ("LIVELLO SUCCESSIVO ▶" on the victory card); L4 is the last.

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
