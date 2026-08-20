/**
 * Reads the sibling Noctis VS Code repo and vendors a flattened palette
 * snapshot into tools/palette.mjs so generation does not need that checkout.
 */
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import colors from "../../noctis/src/colors.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOCTIS_ROOT = join(ROOT, "..", "noctis");
const LIGHT_SLUGS = new Set(["lux", "hibernus", "lilac"]);

const THEMES = [
  { slug: "lux", name: "Noctis Lux" },
  { slug: "hibernus", name: "Noctis Hibernus" },
  { slug: "lilac", name: "Noctis Lilac" },
  { slug: "noctis", name: "Noctis" },
  { slug: "azureus", name: "Noctis Azureus" },
  { slug: "bordo", name: "Noctis Bordo" },
  { slug: "obscuro", name: "Noctis Obscuro" },
  { slug: "sereno", name: "Noctis Sereno" },
  { slug: "uva", name: "Noctis Uva" },
  { slug: "viola", name: "Noctis Viola" },
  { slug: "minimus", name: "Noctis Minimus" }
];

function pick(obj, key, fallback) {
  return obj[key] ?? fallback;
}

function extractWorkbench(c) {
  return {
    editor: {
      background: pick(c, "editor.background"),
      foreground: pick(c, "editor.foreground"),
      lineNumber: pick(c, "editorLineNumber.foreground"),
      activeLineNumber: pick(c, "editorLineNumber.activeForeground"),
      cursor: pick(c, "editorCursor.foreground"),
      selection: pick(c, "editor.selectionBackground"),
      selectionInactive: pick(c, "editor.inactiveSelectionBackground"),
      selectionHighlight: pick(c, "editor.selectionHighlightBackground"),
      wordHighlight: pick(c, "editor.wordHighlightBackground"),
      wordHighlightStrong: pick(c, "editor.wordHighlightStrongBackground"),
      findMatch: pick(c, "editor.findMatchBackground"),
      findMatchHighlight: pick(c, "editor.findMatchHighlightBackground"),
      lineHighlight: pick(c, "editor.lineHighlightBackground"),
      rangeHighlight: pick(c, "editor.rangeHighlightBackground"),
      whitespace: pick(c, "editorWhitespace.foreground"),
      indentGuide: pick(c, "editorIndentGuide.background"),
      activeIndentGuide: pick(c, "editorIndentGuide.activeBackground"),
      bracketMatchBackground: pick(c, "editorBracketMatch.background"),
      bracketMatchBorder: pick(c, "editorBracketMatch.border"),
      ruler: pick(c, "editorRuler.foreground"),
      codeLens: pick(c, "editorCodeLens.foreground")
    },
    ui: {
      textMuted: pick(c, "sideBar.foreground"),
      textInactive: pick(c, "tab.inactiveForeground"),
      description: pick(c, "descriptionForeground"),
      borderTransparent: pick(c, "statusBar.border", pick(c, "activityBar.border")),
      borderSubtle: pick(c, "editorWidget.border", pick(c, "panel.border")),
      borderStrong: pick(c, "tab.border", pick(c, "editorGroup.border")),
      sideBarBackground: pick(c, "sideBar.background"),
      sideBarHeader: pick(c, "sideBarSectionHeader.background"),
      statusBarBackground: pick(c, "statusBar.background"),
      editorHeaderBackground: pick(c, "editorGroupHeader.tabsBackground"),
      tabActiveBackground: pick(c, "tab.activeBackground"),
      tabInactiveBackground: pick(c, "tab.inactiveBackground"),
      tabHoverBackground: pick(c, "tab.unfocusedHoverBackground", pick(c, "list.hoverBackground")),
      buttonBackground: pick(c, "button.background"),
      buttonForeground: pick(c, "button.foreground"),
      buttonHover: pick(c, "button.hoverBackground"),
      inputBackground: pick(c, "input.background"),
      inputForeground: pick(c, "input.foreground"),
      inputPlaceholder: pick(c, "input.placeholderForeground"),
      widgetBackground: pick(c, "editorWidget.background"),
      widgetSelectedBackground: pick(c, "editorSuggestWidget.selectedBackground"),
      listHover: pick(c, "list.hoverBackground"),
      listSelection: pick(c, "list.activeSelectionBackground"),
      listFocus: pick(c, "list.focusBackground"),
      listInactiveSelection: pick(c, "list.inactiveSelectionBackground"),
      listInactiveFocus: pick(c, "list.inactiveFocusBackground"),
      listDrop: pick(c, "list.dropBackground"),
      listSelectionForeground: pick(c, "list.activeSelectionForeground", pick(c, "editor.foreground")),
      popupBackground: pick(c, "menu.background", pick(c, "editorWidget.background")),
      panelBackground: pick(c, "panel.background"),
      peekBackground: pick(c, "peekViewEditor.background"),
      accent: pick(c, "badge.background", pick(c, "activityBar.foreground")),
      accentBright: pick(c, "textLink.foreground", pick(c, "tab.activeForeground", pick(c, "badge.background"))),
      accentForeground: pick(c, "badge.foreground"),
      error: pick(c, "errorForeground", pick(c, "editorError.foreground")),
      errorMuted: pick(c, "list.errorForeground", pick(c, "editorError.foreground")),
      warning: pick(c, "editorWarning.foreground"),
      warningMuted: pick(c, "list.warningForeground", pick(c, "editorWarning.foreground")),
      success: pick(c, "gitDecoration.addedResourceForeground", pick(c, "tab.activeModifiedBorder")),
      successBright: pick(c, "gitDecoration.modifiedResourceForeground"),
      hint: pick(c, "editorHint.foreground"),
      modified: pick(c, "gitDecoration.conflictingResourceForeground")
    },
    vcs: {
      added: pick(c, "gitDecoration.addedResourceForeground"),
      modified: pick(c, "gitDecoration.modifiedResourceForeground"),
      deleted: pick(c, "gitDecoration.deletedResourceForeground"),
      ignored: pick(c, "gitDecoration.ignoredResourceForeground"),
      conflicted: pick(c, "gitDecoration.conflictingResourceForeground"),
      addedLine: pick(c, "diffEditor.insertedTextBackground"),
      modifiedLine: pick(c, "editorGutter.modifiedBackground"),
      deletedLine: pick(c, "diffEditor.removedTextBackground")
    },
    terminal: {
      background: pick(c, "terminal.background"),
      foreground: pick(c, "terminal.foreground"),
      black: pick(c, "terminal.ansiBlack"),
      red: pick(c, "terminal.ansiRed"),
      green: pick(c, "terminal.ansiGreen"),
      yellow: pick(c, "terminal.ansiYellow"),
      blue: pick(c, "terminal.ansiBlue"),
      magenta: pick(c, "terminal.ansiMagenta"),
      cyan: pick(c, "terminal.ansiCyan"),
      white: pick(c, "terminal.ansiWhite"),
      brightBlack: pick(c, "terminal.ansiBrightBlack"),
      brightRed: pick(c, "terminal.ansiBrightRed"),
      brightGreen: pick(c, "terminal.ansiBrightGreen"),
      brightYellow: pick(c, "terminal.ansiBrightYellow"),
      brightBlue: pick(c, "terminal.ansiBrightBlue"),
      brightMagenta: pick(c, "terminal.ansiBrightMagenta"),
      brightCyan: pick(c, "terminal.ansiBrightCyan"),
      brightWhite: pick(c, "terminal.ansiBrightWhite")
    }
  };
}

async function main() {
  const palettes = [];

  for (const meta of THEMES) {
    const modulePath = pathToFileURL(join(NOCTIS_ROOT, "src/workbench", `${meta.slug}.mjs`)).href;
    const { default: workbench } = await import(modulePath);
    const theme = workbench([]);
    palettes.push({
      slug: meta.slug,
      id: meta.slug === "noctis" ? "noctis" : `noctis-${meta.slug}`,
      name: meta.name,
      dark: !LIGHT_SLUGS.has(meta.slug),
      upstreamPath: `./themes/${meta.slug}.json`,
      syntax: colors[meta.slug],
      workbench: extractWorkbench(theme.colors)
    });
  }

  const contents = `// Vendored from liviuschera/noctis ${join(NOCTIS_ROOT)} — regenerate with: node tools/extract-palette.mjs
export const upstream = {
  repository: "https://github.com/liviuschera/noctis",
  license: "MIT",
  version: "10.43.3"
};

export const noctisThemes = ${JSON.stringify(palettes, null, 2)};
`;

  const outPath = join(ROOT, "tools/palette.mjs");
  await writeFile(outPath, contents, "utf8");
  console.log(`wrote ${outPath} (${palettes.length} themes)`);
}

await main();
