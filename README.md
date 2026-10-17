# CICCIO'S — The Burger Adventure

Demo concept di un platform 2D in pixel art ispirato al bicchiere e alla confezione
delle alette di **Ciccio's Burger** (Palermo). Si gioca nel browser, da telefono
(iOS / Android, verticale e orizzontale) o da computer. Nessuna installazione,
nessun account.

> Demo concept non ufficiale, realizzata per essere presentata a Ciccio's Burger.

## Livelli

| # | Nome | Ambientazione | Potere principale |
|---|---|---|---|
| 01 | Le Colline | il bicchiere: cielo azzurro, colline a gradini, blocchi `???` | Brie, Provola Goat, Alette Thai |
| 02 | Alette Crunchy | la confezione delle alette: vortice di fuoco, castelli, lava | Alette Crunchy (volo) |

Arriva alla bandierina e… **VAI IN BUCA!**

## Comandi

| Azione | Tastiera | Touch |
|---|---|---|
| Muoversi | ← → / A D | ◀ ▶ (si può scivolare tra i due) |
| Saltare / volare | Spazio, ↑, W | SALTA / VOLA |
| Scendere in volo | ↓, S | SCENDI |
| Provola Goat | J, X | GOAT |
| Alette Thai | K, C | THAI |
| Pausa | Esc, P | ‖ |

## Sviluppo

```bash
npm ci
npm run dev        # server locale
npm run check      # TypeScript + unit test
npm run build      # build statica in dist/
npm run test:e2e   # smoke test nel browser (Playwright)
```

Stack: Phaser 3.90 · TypeScript · Vite · Vitest · Playwright. Tutta la grafica è
pixel art generata nel codice (`src/art/`), l'audio è sintetizzato con WebAudio
(`src/audio/`). Pubblicazione automatica su GitHub Pages a ogni push su `main`.

Documento di progetto: [`docs/BRIEF.md`](docs/BRIEF.md).
