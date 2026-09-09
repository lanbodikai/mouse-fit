# Product UX and simulator repair

Base: `origin/main` at `f53e7f6`. Fix branch: `codex/product-ux-simulator-fixes`.

## Findings and changes

| Area | Reproduced issue | Result |
| --- | --- | --- |
| Shared layout | Global navbar CSS applied sticky positioning, a fixed height and flex layout to every `header`. | Navbar rules now apply only to explicit navigation classes. Content titles and descriptions can flow normally. |
| Measure and grip | Camera access was the entry point, with no clear alternative, editable result or reliable completion screen. | Choose manual entry or camera capture, review the result, save, then continue to the next fitting step. Manual grip selection includes fingertip. |
| Camera lifecycle | Page modules held DOM references and event listeners across client navigation. Their CSS also affected unrelated controls. | Each capture runs in a separate document with its own module lifetime and styles. Leaving it releases its camera context. |
| Camera recovery | Secure loopback URLs were rejected; Refresh did not restart a failed camera. Capture could appear usable without a frame. | Secure-context detection supports loopback and embedded documents. Refresh retries the camera; capture stays disabled while starting or unavailable. A manual alternative remains available. |
| Grip capture | Capture and accept actions had ambiguous labels and no useful guidance for the current view. | View-specific capture instructions, explicit acceptance/retake labels and protection against duplicate classification. |
| Result persistence | Fetch failures were ignored. Measurement completion referenced result-popup elements that no longer existed. Camera drafts could overwrite report inputs before review. | The shared API client checks save responses. Errors retain the form; success has a visible next action. Camera drafts remain separate until reviewed and saved. |
| Survey handoff | Returning from a capture restarted the survey at the first question. | The return link names the relevant step; the survey reads the current router query and retains measurements. |
| Simulator catalog | A standalone 136-entry asset manifest bypassed the current database. | Selectable models are an exact intersection with the live catalog. Deleted products, duplicate names, malformed transforms and invalid dimensions cannot become choices. Failures offer retry rather than silently showing a stale list. |
| Mouse orientation | PCA left front/back ambiguous. Scaling before a quarter-turn transform could swap physical dimensions. | Front/back is inferred from sampled button-deck and hump heights; source orientation is applied before fitting scene-axis dimensions. |
| Hand anatomy | Constant-width angular fingers, an abrupt palm ending, and independent movement of a middle-finger base joint produced an unnatural silhouette and changed measured hand length on some shells. | Smoother tapered fingers, staggered knuckles, side-finger bend planes, wrist/forearm continuation and nail detail. Reach correction moves the whole hand so palm and bone lengths stay fixed. |
| Simulator integration | Saved measurements and grip were ignored; informational dimensions were truncated. | Saved fitting inputs initialize the preview unless the URL overrides them. The dimensions panel wraps and displays complete values. |
| Keyboard appearance | Glossy shell materials and floating, unlit legend planes weakened the keycap appearance. | Matte plastic material, legends projected onto the sculpted key surfaces, and emissive legend masks driven by each key's RGB color. Fallback keycaps also have legends. |
| Keyboard editor | Painting the same key again could be ignored after switching colors or resetting. Dialog focus remained behind the modal. | Painting compares the actual applied color. The dialog receives and contains keyboard focus, then restores it on close. |
| Loading and errors | Broken STL loads were silently logged and cached as rejected promises. | Visible loading and retry states, retryable cache entries, disposable fitted resources, and preview-boundary recovery. |

## Validation

- Production build and TypeScript checks.
- ESLint on changed TypeScript components and API client; syntax checks on the legacy camera modules.
- Frontend regression suite: 170 passing tests, including catalog exclusion/deduplication, invalid dimensions, API failure, saved-profile defaults, URL overrides and quarter-turn physical scaling.
- Full asset-library hand sweep: 69 distinct model files, three hand lengths, both hands and all three grip styles. Checks fixed bone lengths, wrist-to-middle-fingertip length, finite joints and five mouse contacts. The ordinary suite additionally exercises 12 cm and 25 cm boundaries on five representative shells and checks the generated skin for open seams.
- Browser checks at desktop size and 390 × 844: method selection, manual measure/grip saves, failed-save recovery, readable mobile layout, survey return with 180 × 90 mm retained, simulator views, keyboard colors, and repainting one key with two successive colors.
- Save UI checks used an isolated localhost API fixture. Its writes were not forwarded to production. The production catalog was read to validate selection against the actual 453-row catalog.

## Verification limits

- Physical camera capture and measurement accuracy still need a real hand/reference-card session. Browser camera permission was not granted during this run.
- The hand remains a procedural, stylized grip illustration. Bone/contact tests establish numerical consistency, not biomechanical or photorealistic accuracy.
- Front/back inference uses shell shape. An unusual scan with an ambiguous deck/hump may still require an explicit manifest transform and visual review. All assets were checked numerically; only representative views were inspected in the browser.
- No deployment or production database mutation was performed. Backend pytest was unavailable in the installed Python environment; this patch changes frontend code only.

## Follow-up: survey owns the fitting workflow

The survey is now the primary entry point in main navigation, the service switcher, dashboard actions and the empty report screen. It uses the capture studios' card layout, measurement guide and descriptive grip choices, organized into four stages: hand, grip, budget and review. Choices wait for an explicit Continue action. Conditional grip details remain available, and review links let users revisit any answer.

`/measure` and `/grip` now provide camera preparation, capture and result review only. Both return to the relevant survey step, including when opened directly. Manual measurement and grip entry live exclusively in the survey. A camera result clears any previous estimated-hand label.

New draft handling fixes missing measurements being interpreted as zero and clamped to a minimum-size hand, and fixes old report measurements overriding a more recent survey draft. Survey completion also updates the simulator's grip key and clears stale grip values if identification was skipped.

Validation: production build, TypeScript and targeted lint; 174 frontend tests passed, including four new regression tests for empty state, draft precedence, invalid proportions and simulator synchronization; browser checks of measurement validation, both camera return links, the complete claw branch, budget/review, save-failure recovery and a 390 × 844 layout. Browser work used an isolated preview on localhost:3001, leaving the existing development server running. No physical camera capture or production write was performed in this follow-up.
