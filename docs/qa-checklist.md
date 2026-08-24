# Noctis — visual QA

Use this list in the `runIde` sandbox and again after **Install Plugin from Disk** in licensed WebStorm.

## Setup

1. `./gradlew buildPlugin` then install `build/distributions/*.zip`.
2. Open this repo’s `samples/` folder as a project (or copy the files into a scratch project).
3. **Settings → Appearance → Theme** — pick a Noctis variant. Confirm **Editor → Color Scheme** follows it.

## Per-theme pass

Repeat for **Noctis Islands**, **Noctis Classic**, **Noctis Lux Islands**, **Noctis Lux Classic**:

- [ ] Editor background and caret match the VS Code palette (not leftover Darcula/Light)
- [ ] Keywords, strings, numbers, functions, comments in `preview.ts` / `preview.js`
- [ ] Tags, attributes, CSS properties in `preview.html` / `preview.css`
- [ ] JSON keys vs values in `preview.json`
- [ ] Markdown headings, emphasis, links, inline code in `preview.md`
- [ ] Active tab underline / Islands selected-tab fill
- [ ] Inactive tabs readable
- [ ] Project tool window + file tree hover/selection
- [ ] Status bar accent color
- [ ] Completion popup and Find in Files
- [ ] Git diff gutter colors
- [ ] Terminal default + ANSI colors
- [ ] Settings dialog and notification balloon
- [ ] Git / editor context menus: disabled actions are clearly faded vs enabled

## Islands-only

- [ ] Tool windows sit on island panels with no harsh extra border
- [ ] Main window chrome is slightly lighter (dark) or darker (light) than the editor
- [ ] Stripe / status bar / main toolbar have no leftover Darcula borders

## Classic-only

- [ ] Layout is the pre-Islands chrome (no island gaps)
- [ ] Same syntax colors as the matching Islands variant
