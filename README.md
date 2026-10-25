# CICCIO'S — The Burger Adventure

Demo concept di un gioco 2D in pixel art (platform, sparatutto, labirinto, picchiaduro, guida, cucina) ispirato al bicchiere e alla confezione
delle alette di **Ciccio's Burger** (Palermo). Si gioca nel browser, da telefono
(iOS / Android, verticale e orizzontale) o da computer. Nessuna installazione,
nessun account.

> Demo concept non ufficiale, realizzata per essere presentata a Ciccio's Burger.

## Livelli

| # | Nome | Ambientazione | Potere principale |
|---|---|---|---|
| 01 | Le Colline | il bicchiere: cielo azzurro, colline a gradini, blocchi `???` | Brie, Provola Goat, Alette Thai |
| 02 | Alette Crunchy | la confezione delle alette: vortice di fuoco, castelli, lava | Alette Crunchy (volo) |
| 03 | Ciccio's Invaders | spazio: la navicella di Ciccio's contro hamburger, pianeti e asteroidi | FUOCO + FULMINE (trasforma i nemici in cibo) |
| 04 | CICCIO-MAN | labirinto a vassoio con nuggets e provola | bastoncino di provola (mangia i fantasmi) |
| 05 | Spacca Tutto | città demolita al tramonto: Ciccio in versione furia spacca muri e nemici | PUGNO + SPACCA (botta a terra), strappa la bandierina |
| 06 | Ciccio's Rush | consegne col burger truck: centro di Palermo, zona Stadio, lungomare di Terrasini | power-up del menù, easter egg ROADCOASTER |
| 07 | Ciccio's Kitchen | il bancone d'acciaio di La Lumia e il verde di Sperlinga: cucina e servi il vero menù di Ciccio's | piastra, monta, servi (singolo o menù); premio YOU ARE SO GOLDEN |

Nei livelli platform arriva alla bandierina e… **VAI IN BUCA!**

## Comandi

| Azione | Tastiera | Touch |
|---|---|---|
| Muoversi | ← → / A D | ◀ ▶ (si può scivolare tra i due) |
| Saltare / volare | Spazio, ↑, W | SALTA / VOLA |
| Scendere in volo | ↓, S | SCENDI |
| Provola Goat / fuoco / spacca | J, X | GOAT / FUOCO / SPACCA |
| Alette Thai / fulmine / pugno | K, C | THAI / FULMINE / PUGNO |
| Cambiare corsia / frenare (livello 6) | ← → / A D, ↓ S | ◀ ▶ o swipe, FRENA |
| Cucinare (livello 7) | mouse | tocca piastra, friggitrice, ingredienti; PRENDI L'ORDINE / SERVI (Invio) |
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
