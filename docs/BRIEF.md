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
