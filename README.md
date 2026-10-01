# DSH Revise

**Point at your frontend. Ask for changes. Review what actually changed.**

**Preview:** verified only with **DSH Web 0.2.0-rc.2 + Vite 8.3.1 / React 18.3.1** on Windows, using Node 24.19.0. UI and reports are **Chinese**. One simple example passed with DeepSeek V4 Pro / Max; complex projects, other frameworks/models, Desktop and other DSH versions are unverified.

[中文说明](README.zh-CN.md) · [Download preview](https://github.com/Lostforest7/dsh-revise/releases/tag/v0.1.0-pre) · [Compatibility & limits](docs/compatibility.md) · [Development](CONTRIBUTING.md)

![Real DeepSeek revision: requests, model result, screenshots, source diff, acceptance](docs/assets/real-model-demo.gif)

This 64-second walkthrough uses stills from the actual run; it is not a continuous recording. The model turn took 127 seconds, including a Windows build approval.

DSH Revise adds a visual revision workbench to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Select a real page element, describe the change, send it to your current DSH session, then review fixed-viewport screenshots and source diffs before accepting each item.

![DSH Revise: before/after screenshots and human acceptance](docs/assets/review-workbench.png)

The screenshot comes from a real DeepSeek V4 Pro / Max run on October 1, 2026. The model found and edited the CSS from JSX element hints, preserved the mobile title size, and passed the build. See the [request, checks, timing, and limitations](docs/real-model-validation.md).

## What you get

- **Click-to-request:** element selector, page excerpt, viewport coordinates, and JSX source hints.
- **Current-session handoff:** preview the request, then send it through DSH's normal prompt queue.
- **Before/after evidence:** desktop 1280 × 800 and mobile 390 × 844, plus a diff of captured text sources.
- **Human acceptance:** accept each item or send follow-up feedback. Recapturing clears previous approvals; changed source blocks acceptance of an outdated candidate.
- **Local history:** revision records live in the project's `.dsh-revise/` directory, separated by DSH session.
- **Portable reports:** download one HTML file containing screenshots, review items, and source diff. Markdown and PNG files are also saved locally.

## Install

Use Node 24, or Node 22.19+ from the 22.x line. Install and configure DSH according to its [official documentation](https://github.com/deepseek-ai/deepseek-harness). DSH handles your model credentials; Revise has no separate API key.

### Quick start with a release tarball

Download `dsh-revise-0.1.0.tgz` from the [v0.1.0-pre release](https://github.com/Lostforest7/dsh-revise/releases/tag/v0.1.0-pre). The package has not been published to npm.

1. Register `dsh-revise-0.1.0.tgz` using `dsh plugin --profile web add /absolute/path/to/dsh-revise-0.1.0.tgz`. Set `REVISE_CHROMIUM_PATH` to an existing Chrome executable, or install Chromium with `npx playwright-core@1.63.0 install chromium`.
2. In the frontend project, run `npm install -D /absolute/path/to/dsh-revise-0.1.0.tgz`, add `revise()` to the Vite configuration below, and add `.dsh-revise/` to `.gitignore`.
3. Start the frontend's development server and `dsh web`, select that project in DSH, and click **Revise 改稿台**.

The tarball includes built files; installing it does not require this repository's development dependencies. Configure the browser environment variable before launching DSH. On Windows with Google Chrome:

```powershell
$env:REVISE_CHROMIUM_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
dsh web
```

### Source checkout

For development, the included demo, or installation from source:

```sh
git clone https://github.com/Lostforest7/dsh-revise.git
cd dsh-revise
npm ci
npm run build
npx playwright-core@1.63.0 install chromium
```

Stop DSH, then register the checkout in its Web profile:

```sh
dsh plugin --profile web add /absolute/path/to/dsh-revise
dsh web
```

On Windows, use a quoted path such as `"C:\Projects\dsh-revise"`. The repository includes built `lib/` files so DSH can load the plugin without running a package build script. A release tarball is also installable with `dsh plugin --profile web add /absolute/path/to/dsh-revise-0.1.0.tgz`.

### Connect your Vite React project

Install the same local plugin package as a development dependency **in the frontend project**:

```sh
npm install -D /absolute/path/to/dsh-revise
```

Add the bridge to `vite.config.ts` and restart Vite:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { revise } from 'dsh-revise/vite'

export default defineConfig({
  plugins: [revise(), react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
})
```

The bridge and source attributes are development-only (`apply: 'serve'`). They do not run in a Vite production build.

Add this to the frontend project's `.gitignore`:

```gitignore
.dsh-revise/
```

### Use it

1. Open a DSH project session whose directory is the Vite project. Start its development server.
2. Click **Revise 改稿台** at the bottom right. Create a round with the actual local development URL; the plugin captures the baseline first.
3. Click **选择元素**, select a page element, and save a specific instruction. Repeat for other elements or the mobile viewport.
4. Click **发送给 DSH**, read the generated request, and confirm sending. Close the workbench to follow the agent's conversation.
5. After the change and Vite's hot reload settle, reopen the round and click **采集修改后**. Compare screenshots and code changes.
6. Accept each item with **接受**, or record feedback with **继续修改** and send another request. Finish with **完成本轮验收**.
7. **导出报告** downloads a self-contained HTML report. The project's revision directory retains `report.html`, `report.md`, and the screenshots.

Pixel-change percentages describe image differences; they do not prove that a request was implemented correctly.

## Try the included example

From a source checkout after `npm ci` and `npm run build`, use two terminals:

```sh
# Terminal 1: Vite React example at http://127.0.0.1:5173
npm run dev:example

# Terminal 2: local workbench; open the token-bearing URL it prints
npm run dev:workbench
```

This preview lets you select elements, capture evidence, review, and export without DSH. It offers **copy request** rather than sending to an agent. To exercise the DSH integration, register the plugin and open `examples/vite-react` as the DSH project instead.

## Boundaries

Only explicit-port loopback HTTP targets are accepted. Screenshot contexts are fresh, contain no login cookies, and load only same-origin resources. Pages relying on remote APIs, CDN assets, authentication, or frame-blocking headers need adaptation and may not render faithfully.

Source snapshots cover supported text files in `src/`, `app/`, `pages/`, and `components/`, plus selected root files such as `index.html`, `package.json`, and Vite/TypeScript configuration. Limits: 500 files, 512 KB per file, 5 MB total. Binary assets and environment files are not diffed. Source hints identify DOM JSX locations; they do not map an element to the exact CSS rule.

Revise writes review metadata, screenshots, requests, and reports. Code editing stays with the DSH agent. This version has no automatic rollback, full-page capture, multi-user review, or hosted report service. HTML exports include page screenshots and source diffs; review the content before sharing.

See [compatibility and troubleshooting](docs/compatibility.md) for exact verification and setup details.

## Develop

```sh
npm ci
npm run check
npx playwright-core@1.63.0 install chromium
npm run test:e2e
```

DSH host and client builds use its real plugin metadata, Cordis patch, authenticated connection, UI overlay slot, and session prompt API. The standalone preview is a development aid. Architecture and validation details are in [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/validation.md](docs/validation.md).

MIT licensed. An independent community plugin, not an official DeepSeek product.
