# Contributing

Use Node 24. Install exact dependencies with `npm ci`; do not change the DSH peer versions without checking the real host and client APIs.

The development dependency on DSH also pulls its Office tooling. A narrow override pins that tooling's `fflate` to 0.8.3, the patched version for [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98). It does not upgrade DSH itself or change an existing user's DSH installation.

```sh
npm run check
npx playwright-core@1.63.0 install chromium
npm run test:e2e
```

`check` runs host/client TypeScript checks, behavioral unit tests, and all production builds. Browser tests start isolated Vite/workbench servers on ports 45210 and 45211, create a disposable project under `work/`, and restore its test source changes. They require these ports to be free. On Windows they use installed Chrome when available; otherwise install Playwright Chromium. `REVISE_CHROMIUM_PATH` selects a browser executable.

## Structure

| Directory | Responsibility |
|---|---|
| `src/host` | DSH authenticated route; resolve project directory from the real session header |
| `src/client` | DSH overlay slot and current-session prompt handoff; reuse DSH's React runtime |
| `src/core` | Persistent review state, source snapshots, isolated screenshot contexts, reports |
| `src/vite` | Development-only JSX source attributes and element-selection bridge |
| `src/ui` | Shared React workbench; standalone entry is for local development |
| `tests` | Review invariants, Vite transform, and actual browser interactions |
| `examples/vite-react` | Self-contained example using local assets |
| `lib` | Built artifacts committed for direct DSH installation |

The browser client is registered with DSH's module loader as `dsh-revise`. React and `react/jsx-runtime` remain external in this build. The host registers an exact Fetch route through `connection`, inheriting the Web transport's authentication. It returns the connection's correlated RPC envelope. The browser never chooses an arbitrary filesystem directory for a request: the host obtains `cwd` from `sessionQuery`.

Each round has an optimistic version. Every mutating operation checks it; operations are serialized within a workspace. Baselines are immutable. Candidate capture invalidates prior reviews; acceptance checks source freshness and associates the decision with the candidate ID. A closed round cannot be edited.

The iframe bridge validates sender window, origin, and a per-preview nonce. It receives no DSH token or API key. Capture uses fresh contexts, disables animation, blocks service workers, and blocks requests to other origins. Snapshot scope and limits are deliberately explicit: expanding them requires corresponding documentation and behavioral checks.

The Vite integration blocks direct HTTP requests to `.dsh-revise/` records, including `@fs` URLs, and excludes them from development file watching. Browser tests verify the access boundary.

## Pull requests

Explain the user-visible trigger and resulting behavior. Include the relevant check results and a real screenshot for visible changes. Add behavioral tests for new state or security boundaries; do not add tests that just repeat implementation details. Run `npm run build` and include changed `lib/` artifacts. Do not commit `.dsh-revise/`, model credentials, test homes, or browser profiles.

DSH API compatibility is a release gate. Check installation, launcher mounting, authenticated CRUD, and queue handoff in an isolated DSH home. A mock Messages endpoint can validate handoff without a paid model; describe that limitation clearly. Do not present fixture edits or mock answers as AI editing evidence.
