# Real DeepSeek validation

Date: **October 1, 2026**. Plugin: **DSH Revise 0.1.0 preview**. Runtime: DSH Web 0.2.0-rc.2, Node 24.19.0, Vite 8.3.1, React 18.3.1, Windows and installed Google Chrome.

This is a paid call to the official DeepSeek API using **deepseek-v4-pro / max**, with an output limit of 8192 tokens per request. It used an isolated DSH Home and a disposable copy of the bundled example. The agent, rather than the test program, made the source changes.

## Requests and independent results

The workbench selected the real `h1` and `.hero-cta` elements, recorded their selectors and JSX hints in `src/main.tsx`, and sent its normal generated request to the active session. No CSS filename hint or extra editing instruction was supplied outside that request.

| User request | Before | Verified result |
|---|---|---|
| Set the desktop title to 60px for widths above 700px; preserve mobile size, text, font and layout rules | Desktop 72px; mobile 54px | Desktop 60px; mobile 54px |
| Set the primary button background to `#635093` on desktop and mobile; preserve its text and behavior | `rgb(82, 102, 68)` | Both viewports `rgb(99, 80, 147)` |

DeepSeek located `src/style.css` through the JSX import and made exactly two replacements there. Other captured source files, including the JSX and its interaction code, were unchanged. The title's changed size naturally alters its geometry; the other layout rules were preserved.

The agent ran the TypeScript/Vite build successfully after one narrowly scoped Windows build approval. An independent browser checked computed styles and unchanged text at 1280×800 and 390×844; a separate build passed again. The workbench then captured the candidate, showed screenshots and code diffs, accepted both items, reopened the accepted round and exported an HTML report. Acceptance clicks were performed by the test agent after verification; they are not a claim of manual user approval.

## Timing and usage

| Measurement | Result |
|---|---|
| Durable model turn, including build approval | 127.338 seconds |
| Baseline capture | 2.438 seconds |
| Candidate capture | 1.998 seconds |
| Successful turn: uncached input / cached input / output | 16,233 / 215,936 / 6,339 tokens |
| Cancelled initial turn: uncached input / cached input / output | 15,584 / 145,408 / 7,272 tokens |

These are measurements of one run. The amounts charged were not verified against billing. A single-line CSS file caused truncated reads and extra tool retries; the run was not uniformly smooth.

## Issues found and handled

1. Launching DSH inside another restricted Windows process prevented its sandbox from provisioning workspace ACLs. The first model turn was cancelled before source edits. Launching the isolated host as the normal user fixed provisioning; the DSH session kept `workspace-write`.
2. DSH's confined Windows shell blocked Vite's piped child-process spawn with `EPERM`. Only the requested `npm run build` was approved once with broader execution permissions.
3. The image comparison originally missed the button's green-to-purple change at similar luminance and reported 0% on mobile. The comparison threshold was corrected, with regression coverage for color changes, identical images and refreshing historical metrics without rewriting acceptance. The original real screenshots now measure **4.41% desktop / 2.69% mobile**. Repeated browser capture also verified the candidate remains stable under the comparison rule.

The final checks passed: **13 unit tests, 2 browser tests, host/client type checks and builds**. The browser regression tests still use fixture source edits; their results are separate from this real model run.

## Evidence and limits

![Actual real-model acceptance screen](assets/review-workbench.png)

[64-second walkthrough of actual run screenshots](assets/real-model-demo.gif). This is a sequence of captured stills, not a continuous recording; the model wait is explicitly described above.

The run supports the simple element-feedback → real source edit → capture → review workflow. It does not establish quality across complex applications, multi-round revisions, other models, frameworks or operating systems. No baseline image was read by the model in this run: source discovery used text feedback and JSX hints. Screenshot comparison remains advisory, and acceptance remains a reviewer decision.
