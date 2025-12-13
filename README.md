# ITU 2025/2026 - Chess Client

- Author: Matúš Csirik (xcsirim00)
- Date: December 2025

Chess client front-end implementation demonstrating interactive manipulation of data and integration with Lichess API.
Stack: React, TypeScript, Vite, Tailwind CSS

## Structure

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
    - `src/generated` - generated client and types from [lichess API](https://lichess.org/api)
    - `src/lib` - small utilities (api, stream helpers)
    - `src/pages` - top-level page components
    - `src/styles` - global styles and CSS
- `sounds/` - audio assets from [chess.com](https://www.chess.com/home)
- project config files: `package.json`, `tsconfig.*.json`, `vite.config.ts`, etc.

### MVVM architecture

- Model: data structures, services, API clients and business logic
  - `src/features/*/model` - domain models and actions (game actions, data manipulation)
  - `src/generated` - generated API client and types (remote data layer)
  - `src/lib` - utilities for API, streaming and other data interfaces

- ViewModel: logic that presents model data to the views and exposes actions
  - `src/features/*/hooks`
  - `src/app`

- View: presentation and UI components
  - `src/components`
  - `src/layout`
  - `src/features/*/components` and `src/features/*/views`
  - `src/pages`

License

- Sounds: licensed from [chess.com](https://www.chess.com/home) as per the [user agreement](https://www.chess.com/legal/user-agreement)
