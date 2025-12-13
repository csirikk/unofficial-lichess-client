========================================================================
ITU PROJECT 2025/2026 - Chess Site
========================================================================
- Author: Matúš Csirik (xcsirim00)

- Video showcase: TODO:

--- [ TECHNOLOGIES ] ---------------------------------------------------
- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, React Router
- UI Libraries: Preline, React Chessboard, Lucide React
- Chess Engine: chess.js
- API: Lichess API (NDJSON streaming, OAuth PKCE)
- Runtime: Bun

--- [ DIRECTORY STRUCTURE ] --------------------------------------------
All non-generated files authored by xcsirim00

- `src/`
  - `src/app` - application entry and bootstrap
    - `src/components` - atomic UI components
    - `src/layout` - layout and navigation components
    - `src/features`
      - `src/features/auth` - authentication
        - `src/features/auth/AuthProvider.tsx` - top-level auth provider component
        - `src/features/auth/components` - auth-related UI components
        - `src/features/auth/hooks` - auth hooks (session, PKCE flow)
        - `src/features/auth/model` - auth utilities and models
      - `src/features/game` - game
        - `src/features/game/components` - game UI components (board, controls, overlays)
        - `src/features/game/hooks` - game hooks (streams, history, theme)
        - `src/features/game/model` - game models and actions (moves, rematch, seeks)
        - `src/features/game/views` - higher-level game views/screens
    - `src/generated` - generated client and types from [lichess API](https://lichess.org/api), not authored by xcsirim00
    - `src/lib` - small utilities (api, stream helpers)
    - `src/pages` - top-level page components
    - `src/styles` - global styles and CSS
- `sounds/` - licensed from 'chess.com' as per the [user agreement](https://www.chess.com/legal/user-agreement)
- project config files: `package.json`, `tsconfig.*.json`, `vite.config.ts`, etc.


--- [ RUNNING THE APPLICATION ] ----------------------------------------

Prerequisites:
- Bun runtime installed (https://bun.sh)
- Lichess account for OAuth authentication

Steps:

1. Install dependencies:
   $ bun install

2. Start the development server:
   $ bun run dev

3. Open your browser and navigate to:
   http://localhost:5173

4. Sign in with your Lichess account to start playing
