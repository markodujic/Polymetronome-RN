# Contributing

## Prerequisites

- Node.js 18+
- npm 9+

## Local Setup

```bash
git clone <repo-url>
cd Polymetronome
npm install
npm run dev
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Testing on a Real Phone

```bash
npm run dev -- --host
```

Vite prints a network URL (e.g. `http://192.168.x.x:5173`).
Open it on any device connected to the same WiFi network.

---

## Code Conventions

- **TypeScript strict mode** – no implicit `any`, explicit return types on exported functions
- **Component files** – one component per file, co-located CSS (`RhythmTrack.tsx` + `RhythmTrack.css`)
- **CSS** – use CSS custom properties defined in `index.css` (`var(--accent)`, `var(--bg-card)`, etc.); no hardcoded colors
- **Touch targets** – all interactive elements must be at least **44×44 px** (Apple HIG)
- **AudioEngine** – kept as a pure singleton; no React imports inside `AudioEngine.ts`
- **No hover-only states** – use `:active` instead of `:hover` for touch devices

---

## Adding a New Sound

1. Add the new value to the `ClickSound` union type in `AudioEngine.ts`
2. Add a `buildSoundBuffers` entry with `normal` + `accent` `AudioBuffer`
3. Implement a private synthesis method (follow the pattern of `createPiercingClick(hz)`)
4. Add the new sound to `SOUND_OPTIONS` in `RhythmTrack.tsx`

## Adding a New Track Property

1. Add the field to `MetronomeTrack` in `AudioEngine.ts`
2. Set a default value in `makeTrack` in `useMetronome.ts`
3. Use it in `scheduleNote` or `advanceBeat` in `AudioEngine.ts`
4. Expose a UI control in `RhythmTrack.tsx`

## Changing the Polyrhythm Formula

The BPM derivation lives in `derivedBpm()` in `useMetronome.ts` and is called by `sync()`.
Any change there automatically propagates to `AudioEngine` on the next state update.

---

## Branch & PR

- Branch from `master`
- Naming: `feature/<name>`, `fix/<name>`
- Keep PRs focused – one concern per PR
- Run `npm run build` before opening a PR to catch TypeScript errors
