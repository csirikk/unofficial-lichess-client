# ITU PROJECT 2025/2026 - Chess Site

- Author: Matúš Csirik (xcsirim00)
- Video showcase: https://drive.google.com/file/d/15X7qIzHUXmYS1aVq2aMK2EeZfclsOHY3/view?usp=drive_link


## Technologies

- Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, React Router
- Runtime: Bun
- UI Libraries: Preline, React Chessboard, Lucide React
- Chess Engine: chess.js
- API: Lichess API (NDJSON streaming, OAuth PKCE)
- API generation: Orval (OpenAPI to TypeScript clients). The repo includes
  an `openapi.json` spec and an `orval.config.ts` file. Generated code is
  produced into `src/generated/ (type definitions). Generate with `bun run generate`.


## Directory structure

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
- `sounds/` - Proprietary audio assets from Chess.com. See the **Licensing and Copyright** section.
- project config files: `package.json`, `tsconfig.*.json`, `vite.config.ts`, etc.


## Running the project

Prerequisites:
- Bun runtime installed (https://bun.sh)
- Lichess account for OAuth authentication

Steps:

1. Install dependencies:
  $ bun install

2. (Optional) Regenerate API clients and types from the included OpenAPI spec:
  $ bun run generate

3. Start the development server:
  $ bun run dev

4. Open your browser and navigate to:
  http://localhost:3000

5. Sign in with your Lichess account


## Licensing and Copyright

### 1. Source Code and Libraries

All *non-generated* source code (excluding proprietary sound assets) is licensed under the **MIT License**.
This license is compatible with the underlying Lichess API usage and the 'Vite React' project template 
([YousifAbozid/template-react-ts](https://github.com/YousifAbozid/template-react-ts)).

### 2. Audio Assets (Proprietary Sounds)

The sound files in the `sounds/` directory are the proprietary intellectual 
property of Chess.com and are not covered by the MIT License.

Permission for their use was granted **strictly for non-commercial purposes** 
within this project by a Chess.com representative (Shaun, Dec 11, 2025).
Any public release or deployment of this application requires these sounds to be removed or replaced.
