import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { noctisThemes, upstream } from "./palette.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const THEME_DIR = "src/main/resources/themes";
const PLUGIN_XML_PATH = "src/main/resources/META-INF/plugin.xml";
const PLUGIN_ID = "com.manvendrask.noctis.jetbrains";
const PLUGIN_NAME = "Noctis";
const PLUGIN_VENDOR = "Manvendra Singh";
const PLUGIN_VENDOR_URL = "https://github.com/CaptainOfFlyingDutchman";

const EFFECT_TYPE_CODES = {
  BOXED: 0,
  LINE_UNDERSCORE: 1,
  WAVE_UNDERSCORE: 2,
  STRIKEOUT: 3,
  BOLD_LINE: 4,
  BOLD_DOTTED_LINE: 5
};

function stripHash(color) {
  return String(color).replace(/^#/, "").toLowerCase();
}

function gradleProperty(contents, key) {
  const match = contents.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, "m"));
  
  
  if (!match) {
    throw new Error(`missing ${key} in gradle.properties`);
  }
  
  return match[1].trim();
}

function changelogSection(markdown, version) {
  const escaped = version.replaceAll(".", "\\.");
  const heading = new RegExp(`^##\\s+\\[?${escaped}\\]?\\b.*$`, "m");
  const match = heading.exec(markdown);
  
  if (!match) {
    return null;
  }
  
  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = rest.search(/^##\s+/m);
  
  return rest.slice(0, next === -1 ? undefined : next).trim();
}

function inlineMarkdown(text) {
  return xmlEscape(text)
    .replaceAll(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replaceAll(/`(.+?)`/g, "<code>$1</code>");
}

function changelogHtml(markdown, version) {
  const section = changelogSection(markdown, version);
  
  if (!section) {
    throw new Error(`CHANGELOG.md has no ## [${version}] section`);
  }
  
  const items = [...section.matchAll(/^[-*]\s+(.+)$/gm)].map((item) => item[1].trim());
  
  if (items.length === 0) {
    throw new Error(`CHANGELOG.md section ${version} has no list items`);
  }
  
  return [
    "    <ul>",
    ...items.map((item) => `      <li>${inlineMarkdown(item)}</li>`),
    "    </ul>"
  ].join("\n");
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseHex(color) {
  const hex = stripHash(color);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length >= 8 ? hex.slice(6, 8) : null;

  return { r, g, b, a };
}

function toHex({ r, g, b, a }) {
  const ch = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

  return `#${ch(r)}${ch(g)}${ch(b)}${a ?? ""}`;
}

function withAlpha(color, alphaHex) {
  const { r, g, b } = parseHex(color);

  return toHex({ r, g, b, a: alphaHex });
}

function xmlOption(name, value, indent = "    ") {
  return `${indent}<option name="${xmlEscape(name)}" value="${xmlEscape(value)}" />`;
}

function colorAttribute(name, colorOrOptions, fontType = 0) {
  const options =
    typeof colorOrOptions === "string"
      ? { foreground: colorOrOptions, fontType }
      : { ...colorOrOptions };
  
      const optionLines = [];

  if (options.foreground) {
    optionLines.push(xmlOption("FOREGROUND", stripHash(options.foreground), ""));
  }
  
  if (options.background) {
    optionLines.push(xmlOption("BACKGROUND", stripHash(options.background), ""));
  }
  
  if (options.effectColor) {
    optionLines.push(xmlOption("EFFECT_COLOR", stripHash(options.effectColor), ""));
  }
  
  if (options.errorStripeColor) {
    optionLines.push(xmlOption("ERROR_STRIPE_COLOR", stripHash(options.errorStripeColor), ""));
  }
  
  if (options.effectType) {
    const effectCode = EFFECT_TYPE_CODES[options.effectType];
  
    if (effectCode === undefined) {
      throw new Error(`unknown effect type "${options.effectType}" for attribute "${name}"`);
    }
  
    optionLines.push(xmlOption("EFFECT_TYPE", String(effectCode), ""));
  }
  
  if (options.fontType) {
    optionLines.push(xmlOption("FONT_TYPE", String(options.fontType), ""));
  }

  return [
    `    <option name="${xmlEscape(name)}">`,
    "      <value>",
    ...optionLines.map((line) => `        ${line}`),
    "      </value>",
    "    </option>"
  ].join("\n");
}

function schemeFileName(theme) {
  return `${theme.slug}.xml`;
}

function schemeReference(theme) {
  return `/themes/${schemeFileName(theme)}`;
}

function themeFileName(theme, classic) {
  return classic ? `${theme.slug}Classic.theme.json` : `${theme.slug}.theme.json`;
}

function themeProviderId(theme, classic) {
  const suffix = theme.slug === "noctis" ? "noctis" : theme.slug;

  return classic ? `${PLUGIN_ID}.${suffix}.classic` : `${PLUGIN_ID}.${suffix}`;
}

function checkboxPaletteKeys(ui) {
  const palette = {
    "Checkbox.Background.Default": ui.inputBackground,
    "Checkbox.Border.Default": ui.borderStrong,
    "Checkbox.Background.Selected": ui.accent,
    "Checkbox.Border.Selected": ui.accent,
    "Checkbox.Foreground.Selected": ui.accentForeground,
    "Checkbox.Focus.Wide": ui.accentBright,
    "Checkbox.Focus.Thin.Default": ui.accentBright,
    "Checkbox.Focus.Thin.Selected": ui.accentBright,
    "Checkbox.Background.Disabled": ui.widgetBackground,
    "Checkbox.Border.Disabled": ui.borderSubtle,
    "Checkbox.Foreground.Disabled": ui.textInactive
  };

  const keys = {};

  for (const [key, value] of Object.entries(palette)) {
    keys[key] = value;
    keys[`${key}.Dark`] = value;
  }
  
  return keys;
}

function scrollBarKeys(ui, editor) {
  const thumb = `${ui.accent}44`;
  const hoverThumb = `${ui.accent}88`;
  const transparentTrack = withAlpha(editor.background, "00");
  const keys = {};

  for (const prefix of ["ScrollBar", "ScrollBar.Transparent", "ScrollBar.Mac", "ScrollBar.Mac.Transparent"]) {
    keys[`${prefix}.thumbColor`] = thumb;
    keys[`${prefix}.thumbBorderColor`] = thumb;
    keys[`${prefix}.hoverThumbColor`] = hoverThumb;
    keys[`${prefix}.hoverThumbBorderColor`] = hoverThumb;
    keys[`${prefix}.trackColor`] = transparentTrack;
    keys[`${prefix}.hoverTrackColor`] = transparentTrack;
  }

  return keys;
}

function islandsKeys(themeSource) {
  const { workbench } = themeSource;
  const { editor, ui } = workbench;
  const toolWindowBg = editor.background;

  return {
    "ToolWindow.background": toolWindowBg,
    "ToolWindow.background": toolWindowBg,
    "ToolWindow.Header.background": ui.sideBarHeader,
    "ToolWindow.Header.inactiveBackground": ui.sideBarBackground,
    "Island.borderColor": toolWindowBg,
    "StatusBar.borderColor": withAlpha(ui.borderTransparent ?? editor.background, "00"),
    "ToolWindow.Stripe.borderColor": withAlpha(editor.background, "00"),
    "MainToolbar.borderColor": withAlpha(editor.background, "00"),
    "EditorTabs.background": editor.background,
    "EditorTabs.underlinedTabBackground": ui.tabActiveBackground,
    "EditorTabs.underlinedBorderColor": ui.accentBright,
    "EditorTabs.inactiveUnderlinedTabBackground": ui.tabInactiveBackground,
    "EditorTabs.inactiveUnderlinedTabBorderColor": ui.textMuted
  };
}

function buildThemeJson(themeSource, { classic }) {
  const { name, dark, syntax, workbench } = themeSource;
  const { editor, ui } = workbench;
  const controlForeground = ui.textMuted;
  const controlSelectionBackground = ui.listSelection;
  const controlFocusBackground = ui.listFocus;
  const controlHoverBackground = ui.listHover;
  const toolWindowSelectionBackground = ui.listSelection;
  const displayName = classic ? `${name} Classic` : `${name} Islands`;

  const theme = {
    name: displayName,
    dark,
    author: "Liviu Schera / Noctis port",
    editorScheme: schemeReference(themeSource),
    parentTheme: classic
      ? dark
        ? "ExperimentalDark"
        : "ExperimentalLight"
      : dark
        ? "Islands Dark"
        : "Islands Light",
    colors: {
      noctisBackground: editor.background,
      noctisSidebar: ui.sideBarBackground,
      noctisPanel: ui.popupBackground,
      noctisAccent: ui.accent,
      noctisAccentBright: ui.accentBright,
      noctisSelection: ui.listSelection,
      noctisStatus: ui.statusBarBackground,
      noctisWarning: ui.warning,
      noctisError: ui.error
    },
    ui: {
      "*": {
        background: "noctisBackground",
        foreground: editor.foreground,
        selectionBackground: controlSelectionBackground,
        selectionForeground: ui.listSelectionForeground,
        inactiveBackground: "noctisSidebar",
        disabledForeground: ui.textInactive,
        infoForeground: ui.description
      },
      "ActionButton.hoverBackground": controlHoverBackground,
      "ActionButton.pressedBackground": controlSelectionBackground,
      "ActionButton.selectedBackground": controlSelectionBackground,
      "Banner.foreground": editor.foreground,
      "Banner.infoBackground": ui.widgetSelectedBackground,
      "Banner.infoBorderColor": ui.accentBright,
      "Banner.warningBackground": `${ui.warning}33`,
      "Banner.warningBorderColor": ui.warning,
      "Banner.errorBackground": `${ui.error}22`,
      "Banner.errorBorderColor": ui.error,
      "Borders.color": ui.borderSubtle,
      "Borders.ContrastBorderColor": ui.borderStrong,
      "Button.startBackground": editor.background,
      "Button.endBackground": editor.background,
      "Button.startBorderColor": ui.borderStrong,
      "Button.endBorderColor": ui.borderStrong,
      "Button.foreground": editor.foreground,
      "Button.focusedBorderColor": ui.accent,
      "Button.disabledText": ui.textInactive,
      "Button.default.startBackground": ui.buttonBackground,
      "Button.default.endBackground": ui.buttonBackground,
      "Button.default.startBorderColor": ui.buttonBackground,
      "Button.default.endBorderColor": ui.buttonBackground,
      "Button.default.foreground": ui.buttonForeground,
      "Button.default.focusedBorderColor": ui.buttonHover,
      "CheckBox.background": editor.background,
      "CheckBox.foreground": editor.foreground,
      "CheckBox.focusColor": ui.accent,
      ...checkboxPaletteKeys(ui),
      "ComboBox.background": ui.inputBackground,
      "ComboBox.foreground": ui.inputForeground,
      "ComboBox.nonEditableBackground": ui.widgetBackground,
      "ComboBox.selectionBackground": controlSelectionBackground,
      "ComboBox.ArrowButton.background": ui.inputBackground,
      "ComboBox.ArrowButton.nonEditableBackground": ui.widgetBackground,
      "ComboBox.ArrowButton.iconColor": ui.accent,
      "Component.borderColor": ui.borderSubtle,
      "Component.errorFocusColor": ui.error,
      "Component.focusColor": `${ui.accent}55`,
      "Component.focusedBorderColor": ui.accent,
      "Component.infoForeground": ui.description,
      "Component.warningFocusColor": ui.warning,
      "ContextHelp.foreground": ui.description,
      "Counter.background": ui.accent,
      "Counter.foreground": ui.accentForeground,
      "CompletionPopup.background": ui.widgetBackground,
      "CompletionPopup.foreground": ui.inputForeground,
      "CompletionPopup.matchForeground": ui.accent,
      "CompletionPopup.selectedGrayedForeground": ui.textMuted,
      "CompletionPopup.selectionBackground": ui.widgetSelectedBackground,
      "CompletionPopup.selectionForeground": editor.foreground,
      "Debugger.Variables.changedValueForeground": ui.modified,
      "Debugger.Variables.errorMessageForeground": ui.error,
      "Debugger.Variables.evaluatingExpressionForeground": ui.accent,
      "DefaultTabs.background": ui.editorHeaderBackground,
      "DefaultTabs.hoverBackground": ui.tabHoverBackground,
      "DefaultTabs.inactiveColoredFileBackground": ui.tabInactiveBackground,
      "DefaultTabs.selectedBackground": ui.tabActiveBackground,
      "DefaultTabs.selectedForeground": ui.accent,
      "DefaultTabs.underlinedTabBackground": ui.tabActiveBackground,
      "DefaultTabs.underlinedTabForeground": ui.accent,
      "DefaultTabs.underlineColor": ui.accentBright,
      "DefaultTabs.unselectedBackground": ui.tabInactiveBackground,
      "DefaultTabs.unselectedForeground": ui.textMuted,
      "EditorPane.background": editor.background,
      "EditorPane.foreground": editor.foreground,
      "EditorTextField.background": ui.inputBackground,
      "EditorTextField.borderColor": ui.borderSubtle,
      "EditorTextField.foreground": editor.foreground,
      "EditorTextField.inactiveBackground": ui.inputBackground,
      "EditorTabs.background": ui.editorHeaderBackground,
      "EditorTabs.borderColor": ui.borderStrong,
      "EditorTabs.hoverBackground": ui.tabHoverBackground,
      "EditorTabs.inactiveColoredFileBackground": ui.tabInactiveBackground,
      "EditorTabs.inactiveMaskColor": withAlpha(editor.background, "00"),
      "EditorTabs.modifiedItemForeground": ui.success,
      "EditorTabs.selectedBackground": ui.tabActiveBackground,
      "EditorTabs.selectedForeground": ui.accent,
      "EditorTabs.underlinedTabBackground": ui.tabActiveBackground,
      "EditorTabs.underlinedTabForeground": ui.accent,
      "EditorTabs.underlineColor": ui.accentBright,
      "EditorTabs.unselectedBackground": ui.tabInactiveBackground,
      "EditorTabs.unselectedForeground": ui.textMuted,
      "Focus.color": ui.accent,
      "Label.foreground": editor.foreground,
      "Label.infoForeground": ui.description,
      "Label.disabledForeground": ui.textInactive,
      "Link.activeForeground": ui.accentBright,
      "Link.hoverForeground": ui.accentBright,
      "Link.pressedForeground": ui.accent,
      "Link.visitedForeground": ui.accent,
      "List.background": ui.sideBarBackground,
      "List.foreground": controlForeground,
      "List.focusBackground": controlFocusBackground,
      "List.focusForeground": editor.foreground,
      "List.hoverBackground": controlHoverBackground,
      "List.hoverForeground": editor.foreground,
      "List.inactiveSelectionBackground": ui.listInactiveSelection,
      "List.inactiveSelectionForeground": ui.textInactive,
      "List.dropCellBackground": ui.listDrop,
      "List.selectionBackground": controlSelectionBackground,
      "List.selectionForeground": ui.listSelectionForeground,
      "List.selectionInactiveBackground": ui.listInactiveSelection,
      "MainToolbar.background": ui.sideBarBackground,
      "MainToolbar.borderColor": ui.borderTransparent,
      "MainToolbar.foreground": editor.foreground,
      "MainToolbar.Dropdown.hoverBackground": controlHoverBackground,
      "MainToolbar.Icon.hoverBackground": controlHoverBackground,
      "Menu.background": ui.popupBackground,
      "Menu.foreground": ui.textMuted,
      "Menu.borderColor": ui.borderSubtle,
      "Menu.selectionBackground": controlHoverBackground,
      "Menu.selectionForeground": ui.accent,
      "MenuItem.background": ui.popupBackground,
      "MenuItem.foreground": ui.textMuted,
      "MenuItem.selectionBackground": controlHoverBackground,
      "MenuItem.selectionForeground": ui.accent,
      "NavBar.background": editor.background,
      "NavBar.borderColor": ui.borderTransparent,
      "NavBar.hoverBackground": controlHoverBackground,
      "NavBar.inactiveForeground": ui.textMuted,
      "NavBar.selectedBackground": controlSelectionBackground,
      "NavBar.selectedForeground": editor.foreground,
      "Notification.ToolWindow.errorForeground": ui.error,
      "Notification.ToolWindow.warningForeground": ui.warningMuted,
      "Notification.background": ui.widgetBackground,
      "Notification.borderColor": ui.borderSubtle,
      "Notification.errorBackground": `${ui.error}22`,
      "Notification.foreground": editor.foreground,
      "Notification.linkForeground": ui.accentBright,
      "Notification.warningBackground": `${ui.warning}22`,
      "Panel.background": editor.background,
      "PasswordField.background": ui.inputBackground,
      "PasswordField.caretForeground": editor.cursor,
      "PasswordField.foreground": ui.inputForeground,
      "Popup.borderColor": ui.borderStrong,
      "Popup.Advertiser.foreground": ui.textMuted,
      "Popup.Header.activeBackground": ui.sideBarHeader,
      "Popup.Header.inactiveBackground": ui.sideBarBackground,
      "Popup.separatorColor": ui.sideBarHeader,
      "PopupMenu.background": ui.popupBackground,
      "PopupMenu.foreground": ui.textMuted,
      "ProgressBar.foreground": ui.accentBright,
      "ProgressBar.progressColor": ui.accentBright,
      "ProgressBar.indeterminateStartColor": ui.accent,
      "ProgressBar.indeterminateEndColor": ui.accentBright,
      "ProgressBar.trackColor": ui.borderSubtle,
      "ProgressBar.passedColor": ui.success,
      "ProgressBar.failedColor": ui.error,
      ...scrollBarKeys(ui, editor),
      "SearchField.background": ui.inputBackground,
      "SearchField.foreground": ui.inputForeground,
      "SearchField.infoForeground": ui.inputPlaceholder,
      "SearchEverywhere.Advertiser.foreground": ui.textMuted,
      "SearchEverywhere.Header.background": ui.sideBarHeader,
      "SearchEverywhere.SearchField.background": ui.inputBackground,
      "SearchEverywhere.SearchField.foreground": ui.inputForeground,
      "SearchEverywhere.SearchField.borderColor": ui.borderSubtle,
      "SearchEverywhere.Tab.selectedBackground": controlSelectionBackground,
      "SearchEverywhere.Tab.selectedForeground": editor.foreground,
      "Separator.foreground": ui.sideBarHeader,
      "SidePanel.background": ui.sideBarBackground,
      "SidePanel.foreground": controlForeground,
      "SpeedSearch.background": ui.popupBackground,
      "SpeedSearch.foreground": editor.foreground,
      "SpeedSearch.borderColor": ui.accent,
      "SpeedSearch.errorForeground": ui.error,
      "Spinner.background": ui.inputBackground,
      "Spinner.foreground": ui.inputForeground,
      "StatusBar.Widget.HoverBackground": controlHoverBackground,
      "StatusBar.Widget.borderColor": ui.borderTransparent,
      "StatusBar.Widget.foreground": ui.accent,
      "StatusBar.background": ui.statusBarBackground,
      "StatusBar.borderColor": ui.borderTransparent,
      "StatusBar.foreground": ui.accent,
      "TabbedPane.underlineColor": ui.accentBright,
      "TabbedPane.contentAreaColor": ui.borderStrong,
      "TabbedPane.hoverColor": controlHoverBackground,
      "TabbedPane.focusColor": controlFocusBackground,
      "Table.background": ui.sideBarBackground,
      "Table.foreground": controlForeground,
      "Table.gridColor": ui.sideBarHeader,
      "Table.hoverBackground": controlHoverBackground,
      "Table.selectionBackground": controlSelectionBackground,
      "Table.selectionForeground": ui.listSelectionForeground,
      "Table.selectionInactiveBackground": ui.listInactiveSelection,
      "TextPane.background": ui.inputBackground,
      "TextPane.caretForeground": editor.cursor,
      "TextPane.foreground": editor.foreground,
      "TextArea.background": ui.inputBackground,
      "TextArea.caretForeground": editor.cursor,
      "TextArea.foreground": editor.foreground,
      "TextField.background": ui.inputBackground,
      "TextField.caretForeground": editor.cursor,
      "TextField.foreground": editor.foreground,
      "TextField.inactiveBackground": ui.widgetBackground,
      "TextField.inactiveForeground": ui.textMuted,
      "TitlePane.background": ui.sideBarBackground,
      "TitlePane.inactiveBackground": ui.sideBarBackground,
      "TitlePane.infoForeground": ui.textMuted,
      "ToolTip.background": ui.popupBackground,
      "ToolTip.foreground": editor.foreground,
      "ToolTip.borderColor": ui.borderSubtle,
      "ToolWindow.Button.foreground": ui.textMuted,
      "ToolWindow.Button.hoverBackground": controlHoverBackground,
      "ToolWindow.Button.selectedBackground": toolWindowSelectionBackground,
      "ToolWindow.Button.selectedForeground": ui.accent,
      "ToolWindow.Header.background": ui.sideBarHeader,
      "ToolWindow.Header.inactiveBackground": ui.sideBarBackground,
      "ToolWindow.HeaderTab.hoverBackground": controlHoverBackground,
      "ToolWindow.HeaderTab.inactiveForeground": ui.textMuted,
      "ToolWindow.HeaderTab.selectedBackground": ui.sideBarHeader,
      "ToolWindow.HeaderTab.selectedForeground": ui.accent,
      "ToolWindow.HeaderTab.underlineColor": ui.accentBright,
      "ToolWindow.Stripe.background": editor.background,
      "ToolWindow.Stripe.hoverBackground": controlHoverBackground,
      "ToolWindow.StripeButton.hoverBackground": controlHoverBackground,
      "ToolWindow.StripeButton.selectedBackground": toolWindowSelectionBackground,
      "ToolWindow.StripeButton.selectedForeground": ui.accent,
      "ToolWindow.background": ui.sideBarBackground,
      "Tree.background": ui.sideBarBackground,
      "Tree.foreground": controlForeground,
      "Tree.hash": ui.sideBarHeader,
      "Tree.hoverBackground": controlHoverBackground,
      "Tree.modifiedItemForeground": ui.successBright,
      "Tree.selectionBackground": controlSelectionBackground,
      "Tree.selectionForeground": ui.listSelectionForeground,
      "Tree.selectionInactiveBackground": ui.listInactiveSelection,
      "VersionControl.FileHistory.Commit.selectedBranchBackground": controlSelectionBackground,
      "VersionControl.GitLog.Commit.currentBranchBackground": controlSelectionBackground,
      "VersionControl.Log.Commit.unmatchedForeground": ui.textMuted,
      "VersionControl.RefLabel.backgroundBase": ui.sideBarHeader,
      "VersionControl.RefLabel.foreground": editor.foreground,
      "ValidationTooltip.errorBackground": `${ui.error}22`,
      "ValidationTooltip.errorBorderColor": ui.error,
      "ValidationTooltip.warningBackground": `${ui.warning}22`,
      "ValidationTooltip.warningBorderColor": ui.warning,
      ...(classic ? {} : islandsKeys(themeSource))
    },
    icons: {
      ColorPalette: {
        "Actions.Blue": ui.accent,
        "Actions.Green": ui.success,
        "Actions.Red": ui.error,
        "Actions.Yellow": ui.warning,
        "Objects.Blue": syntax.misc,
        "Objects.Green": syntax.string,
        "Objects.Red": syntax.tag,
        "Objects.Yellow": syntax.variable,
        "Objects.Purple": syntax.number,
        "Objects.Grey": ui.textMuted,
        "Objects.BlackText": syntax.text
      }
    }
  };

  if (!classic) {
    // 2026.2 paints the Islands title wash by intercepting named colors
    // MainWindow/MainToolbar/StatusBar/Stripe. A solid hex (or "*" background)
    // replaces those names and the gradient never runs. Island gutters then
    // come from the parent Islands Dark/Light MainWindow color.
    delete theme.ui["*"].background;
    delete theme.ui["*"].inactiveBackground;
    delete theme.ui["MainWindow.background"];
    delete theme.ui["MainToolbar.background"];
    delete theme.ui["MainToolbar.inactiveBackground"];
    delete theme.ui["TitlePane.background"];
    delete theme.ui["TitlePane.inactiveBackground"];
    delete theme.ui["StatusBar.background"];
    delete theme.ui["ToolWindow.Stripe.background"];
  }

  return `${JSON.stringify(theme, null, 2)}\n`;
}

function buildEditorSchemeXml(themeSource) {
  const { name, dark, syntax, workbench } = themeSource;
  const { editor, ui, vcs, terminal } = workbench;
  const parent = dark ? "Darcula" : "Default";
  const colors = [
    ["CARET_COLOR", stripHash(editor.cursor)],
    ["CARET_ROW_COLOR", stripHash(editor.lineHighlight)],
    ["GUTTER_BACKGROUND", stripHash(editor.background)],
    ["INDENT_GUIDE", stripHash(editor.indentGuide)],
    ["LINE_NUMBERS_COLOR", stripHash(editor.lineNumber)],
    ["LINE_NUMBER_ON_CARET_ROW_COLOR", stripHash(editor.activeLineNumber)],
    ["RIGHT_MARGIN_COLOR", stripHash(editor.ruler)],
    ["SELECTION_BACKGROUND", stripHash(editor.selection)],
    ["SELECTION_FOREGROUND", stripHash(editor.foreground)],
    ["SOFT_WRAP_SIGN_COLOR", stripHash(editor.whitespace)],
    ["TEARLINE_COLOR", stripHash(editor.ruler)],
    ["WHITESPACES", stripHash(editor.whitespace)],
    ["ADDED_LINES_COLOR", stripHash(vcs.addedLine)],
    ["MODIFIED_LINES_COLOR", stripHash(vcs.modifiedLine)],
    ["DELETED_LINES_COLOR", stripHash(vcs.deletedLine)],
    ["FILESTATUS_ADDED", stripHash(vcs.added)],
    ["FILESTATUS_MODIFIED", stripHash(vcs.modified)],
    ["FILESTATUS_DELETED", stripHash(vcs.deleted)],
    ["FILESTATUS_IGNORED", stripHash(vcs.ignored)],
    ["FILESTATUS_MERGED_WITH_CONFLICTS", stripHash(vcs.conflicted)],
    ["CONSOLE_BACKGROUND_KEY", stripHash(terminal.background)],
    ["CONSOLE_NORMAL_OUTPUT", stripHash(terminal.foreground)],
    ["CONSOLE_ERROR_OUTPUT", stripHash(ui.error)],
    ["CONSOLE_USER_INPUT", stripHash(syntax.variable)],
    ["CONSOLE_BLACK_OUTPUT", stripHash(terminal.black)],
    ["CONSOLE_RED_OUTPUT", stripHash(terminal.red)],
    ["CONSOLE_GREEN_OUTPUT", stripHash(terminal.green)],
    ["CONSOLE_YELLOW_OUTPUT", stripHash(terminal.yellow)],
    ["CONSOLE_BLUE_OUTPUT", stripHash(terminal.blue)],
    ["CONSOLE_MAGENTA_OUTPUT", stripHash(terminal.magenta)],
    ["CONSOLE_CYAN_OUTPUT", stripHash(terminal.cyan)],
    ["CONSOLE_GRAY_OUTPUT", stripHash(terminal.white)],
    ["CONSOLE_BRIGHT_BLACK_OUTPUT", stripHash(terminal.brightBlack)],
    ["CONSOLE_BRIGHT_RED_OUTPUT", stripHash(terminal.brightRed)],
    ["CONSOLE_BRIGHT_GREEN_OUTPUT", stripHash(terminal.brightGreen)],
    ["CONSOLE_BRIGHT_YELLOW_OUTPUT", stripHash(terminal.brightYellow)],
    ["CONSOLE_BRIGHT_BLUE_OUTPUT", stripHash(terminal.brightBlue)],
    ["CONSOLE_BRIGHT_MAGENTA_OUTPUT", stripHash(terminal.brightMagenta)],
    ["CONSOLE_BRIGHT_CYAN_OUTPUT", stripHash(terminal.brightCyan)],
    ["CONSOLE_BRIGHT_WHITE_OUTPUT", stripHash(terminal.brightWhite)]
  ];

  const attributes = [
    colorAttribute("TEXT", { foreground: editor.foreground, background: editor.background }),
    colorAttribute("DEFAULT_IDENTIFIER", syntax.variable),
    colorAttribute("DEFAULT_KEYWORD", syntax.keyword, 1),
    colorAttribute("DEFAULT_STRING", syntax.string),
    colorAttribute("DEFAULT_VALID_STRING_ESCAPE", syntax.misc),
    colorAttribute("DEFAULT_INVALID_STRING_ESCAPE", syntax.invalid, 1),
    colorAttribute("DEFAULT_NUMBER", syntax.number),
    colorAttribute("DEFAULT_LINE_COMMENT", syntax.comment, 2),
    colorAttribute("DEFAULT_BLOCK_COMMENT", syntax.comment, 2),
    colorAttribute("DEFAULT_DOC_COMMENT", syntax.comment, 2),
    colorAttribute("DEFAULT_DOC_COMMENT_TAG", syntax.tag, 1),
    colorAttribute("DEFAULT_DOC_COMMENT_TAG_VALUE", syntax.variable),
    colorAttribute("DEFAULT_DOC_COMMENT_MARKUP", syntax.misc),
    colorAttribute("DEFAULT_FUNCTION_DECLARATION", syntax.function),
    colorAttribute("DEFAULT_FUNCTION_CALL", syntax.function),
    colorAttribute("DEFAULT_INSTANCE_METHOD", syntax.function),
    colorAttribute("DEFAULT_STATIC_METHOD", syntax.function),
    colorAttribute("DEFAULT_PARAMETER", { foreground: syntax.variable, fontType: 1 }),
    colorAttribute("DEFAULT_REASSIGNED_PARAMETER", {
      foreground: syntax.variable,
      fontType: 1,
      effectColor: ui.warningMuted,
      effectType: "BOLD_DOTTED_LINE"
    }),
    colorAttribute("DEFAULT_LOCAL_VARIABLE", syntax.variable),
    colorAttribute("DEFAULT_REASSIGNED_LOCAL_VARIABLE", {
      foreground: syntax.variable,
      effectColor: ui.warningMuted,
      effectType: "BOLD_DOTTED_LINE"
    }),
    colorAttribute("DEFAULT_GLOBAL_VARIABLE", syntax.variable),
    colorAttribute("DEFAULT_INSTANCE_FIELD", { foreground: syntax.variable, fontType: 2 }),
    colorAttribute("DEFAULT_STATIC_FIELD", syntax.constant),
    colorAttribute("DEFAULT_CONSTANT", syntax.constant),
    colorAttribute("DEFAULT_CLASS_NAME", syntax.annotation),
    colorAttribute("DEFAULT_INTERFACE_NAME", syntax.annotation),
    colorAttribute("DEFAULT_ENUM_NAME", syntax.annotation),
    colorAttribute("DEFAULT_TYPE_PARAMETER", syntax.annotation),
    colorAttribute("DEFAULT_METADATA", { foreground: syntax.variable, fontType: 1 }),
    colorAttribute("DEFAULT_PREDEFINED_SYMBOL", syntax.support),
    colorAttribute("DEFAULT_LABEL", syntax.tag),
    colorAttribute("DEFAULT_TAG", syntax.tag),
    colorAttribute("DEFAULT_ATTRIBUTE", syntax.constant),
    colorAttribute("DEFAULT_ENTITY", syntax.constant),
    colorAttribute("DEFAULT_OPERATION_SIGN", syntax.keyword, 1),
    colorAttribute("DEFAULT_PARENTHESES", syntax.text),
    colorAttribute("DEFAULT_BRACES", syntax.text),
    colorAttribute("DEFAULT_BRACKETS", syntax.text),
    colorAttribute("DEFAULT_COMMA", { foreground: syntax.text, fontType: 1 }),
    colorAttribute("DEFAULT_DOT", { foreground: syntax.keyword, fontType: 1 }),
    colorAttribute("DEFAULT_SEMICOLON", { foreground: syntax.text, fontType: 1 }),
    colorAttribute("DEFAULT_BAD_CHARACTER", syntax.invalid, 1),
    colorAttribute("DEFAULT_TEMPLATE_LANGUAGE_COLOR", { background: editor.rangeHighlight }),
    colorAttribute("DEFAULT_MARKUP_HEADING", syntax.keyword, 1),
    colorAttribute("DEFAULT_MARKUP_BOLD", { foreground: syntax.text, fontType: 1 }),
    colorAttribute("DEFAULT_MARKUP_ITALIC", { foreground: syntax.text, fontType: 2 }),
    colorAttribute("DEFAULT_MARKUP_CODE", {
      foreground: syntax.stringInterpolated,
      background: ui.sideBarBackground
    }),
    colorAttribute("DEFAULT_MARKUP_QUOTE", {
      foreground: syntax.constant,
      background: ui.sideBarBackground,
      fontType: 2
    }),
    colorAttribute("DEFAULT_MARKUP_LINK", {
      foreground: syntax.support,
      effectColor: syntax.support,
      effectType: "LINE_UNDERSCORE"
    }),
    colorAttribute("DEFAULT_MARKUP_LIST", { foreground: syntax.text, fontType: 1 }),
    colorAttribute("FOLDED_TEXT_ATTRIBUTES", { foreground: syntax.comment, background: editor.rangeHighlight }),
    colorAttribute("INJECTED_LANGUAGE_FRAGMENT", { background: editor.rangeHighlight }),
    colorAttribute("TODO_DEFAULT_ATTRIBUTES", { foreground: ui.modified, fontType: 3 }),
    colorAttribute("HYPERLINK_ATTRIBUTES", {
      foreground: syntax.misc,
      effectColor: syntax.misc,
      effectType: "LINE_UNDERSCORE"
    }),
    colorAttribute("FOLLOWED_HYPERLINK_ATTRIBUTES", {
      foreground: syntax.number,
      effectColor: syntax.number,
      effectType: "LINE_UNDERSCORE"
    }),
    colorAttribute("BREADCRUMBS_DEFAULT", { foreground: ui.textMuted }),
    colorAttribute("BREADCRUMBS_INACTIVE", { foreground: ui.textMuted }),
    colorAttribute("BREADCRUMBS_HOVERED", { foreground: editor.foreground, background: ui.listHover }),
    colorAttribute("BREADCRUMBS_CURRENT", { foreground: ui.accent, background: editor.lineHighlight }),
    colorAttribute("TEXT_SEARCH_RESULT_ATTRIBUTES", {
      foreground: syntax.text,
      background: editor.findMatch,
      fontType: 1
    }),
    colorAttribute("SEARCH_RESULT_ATTRIBUTES", {
      foreground: syntax.text,
      background: editor.findMatch,
      fontType: 1
    }),
    colorAttribute("WRITE_SEARCH_RESULT_ATTRIBUTES", {
      foreground: syntax.text,
      background: editor.findMatchHighlight
    }),
    colorAttribute("IDENTIFIER_UNDER_CARET_ATTRIBUTES", { background: editor.wordHighlight }),
    colorAttribute("WRITE_IDENTIFIER_UNDER_CARET_ATTRIBUTES", { background: editor.wordHighlightStrong }),
    colorAttribute("MATCHED_BRACE_ATTRIBUTES", {
      foreground: syntax.text,
      background: editor.bracketMatchBackground,
      effectColor: editor.bracketMatchBorder,
      effectType: "BOXED"
    }),
    colorAttribute("UNMATCHED_BRACE_ATTRIBUTES", {
      foreground: syntax.invalid,
      effectColor: syntax.invalid,
      effectType: "WAVE_UNDERSCORE"
    }),
    colorAttribute("ERRORS_ATTRIBUTES", {
      foreground: syntax.invalid,
      effectColor: ui.error,
      errorStripeColor: ui.error,
      effectType: "WAVE_UNDERSCORE"
    }),
    colorAttribute("WARNING_ATTRIBUTES", {
      effectColor: ui.warning,
      errorStripeColor: ui.warning,
      effectType: "WAVE_UNDERSCORE"
    }),
    colorAttribute("WEAK_WARNING_ATTRIBUTES", {
      effectColor: ui.warningMuted,
      errorStripeColor: ui.warningMuted,
      effectType: "BOLD_DOTTED_LINE"
    }),
    colorAttribute("INFO_ATTRIBUTES", {
      effectColor: ui.accentBright,
      errorStripeColor: ui.accentBright,
      effectType: "BOLD_DOTTED_LINE"
    }),
    colorAttribute("INFORMATION_ATTRIBUTES", {
      effectColor: ui.hint,
      errorStripeColor: ui.hint,
      effectType: "BOLD_DOTTED_LINE"
    }),
    colorAttribute("DIFF_INSERTED", { background: vcs.addedLine }),
    colorAttribute("DIFF_MODIFIED", { background: vcs.modifiedLine }),
    colorAttribute("DIFF_DELETED", { background: vcs.deletedLine }),
    colorAttribute("NOT_USED_ELEMENT_ATTRIBUTES", { foreground: ui.textInactive }),
    colorAttribute("DEPRECATED_ATTRIBUTES", {
      foreground: ui.textInactive,
      effectColor: ui.textInactive,
      effectType: "STRIKEOUT"
    }),
    colorAttribute("JS.KEYWORD", syntax.keyword, 1),
    colorAttribute("JS.STRING", syntax.string),
    colorAttribute("JS.NUMBER", syntax.number),
    colorAttribute("JS.GLOBAL_FUNCTION", syntax.function),
    colorAttribute("JS.GLOBAL_VARIABLE", syntax.variable),
    colorAttribute("JS.INSTANCE_MEMBER_FUNCTION", syntax.function),
    colorAttribute("JS.INSTANCE_MEMBER_VARIABLE", { foreground: syntax.variable, fontType: 2 }),
    colorAttribute("JS.PARAMETER", { foreground: syntax.variable, fontType: 1 }),
    colorAttribute("JS.LOCAL_VARIABLE", syntax.variable),
    colorAttribute("JS.REGEXP", syntax.stringInterpolated),
    colorAttribute("TS.TYPE_PARAMETER", syntax.annotation),
    colorAttribute("TS.TYPE_GUARD", syntax.annotation),
    colorAttribute("TS.MODULE_NAME", syntax.annotation),
    colorAttribute("CSS.KEYWORD", syntax.keyword, 1),
    colorAttribute("CSS.PROPERTY_NAME", syntax.support),
    colorAttribute("CSS.PROPERTY_VALUE", syntax.string),
    colorAttribute("CSS.HASH", syntax.number),
    colorAttribute("CSS.FUNCTION", syntax.function),
    colorAttribute("CSS.TAG_NAME", syntax.tag),
    colorAttribute("HTML_TAG_NAME", syntax.tag),
    colorAttribute("HTML_ATTRIBUTE_NAME", syntax.constant),
    colorAttribute("HTML_ATTRIBUTE_VALUE", syntax.string),
    colorAttribute("HTML_ENTITY_REFERENCE", syntax.constant),
    colorAttribute("JSON.PROPERTY_KEY", syntax.tag),
    colorAttribute("JSON.KEYWORD", syntax.keyword, 1),
    colorAttribute("MARKDOWN.HEADER_LEVEL_1", syntax.keyword, 1),
    colorAttribute("MARKDOWN.HEADER_LEVEL_2", syntax.keyword, 1),
    colorAttribute("MARKDOWN.HEADER_LEVEL_3", syntax.function, 1),
    colorAttribute("MARKDOWN.BOLD", { foreground: syntax.text, fontType: 1 }),
    colorAttribute("MARKDOWN.ITALIC", { foreground: syntax.text, fontType: 2 }),
    colorAttribute("MARKDOWN.CODE_SPAN", { foreground: syntax.stringInterpolated, background: ui.sideBarBackground }),
    colorAttribute("MARKDOWN.LINK_TEXT", syntax.support)
  ];

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<scheme name="${xmlEscape(name)}" version="142" parent_scheme="${parent}">`,
    "  <metaInfo>",
    `    <property name="originalScheme">Noctis generator from ${xmlEscape(upstream.repository)}</property>`,
    `    <property name="upstreamVersion">${xmlEscape(upstream.version)}</property>`,
    `    <property name="upstreamPath">${xmlEscape(themeSource.upstreamPath)}</property>`,
    "  </metaInfo>",
    "  <colors>",
    ...colors.map(([colorName, value]) => xmlOption(colorName, value)),
    "  </colors>",
    "  <attributes>",
    ...attributes,
    "  </attributes>",
    "</scheme>",
    ""
  ].join("\n");
}

function buildPluginXml(themes, changeNotesHtml) {
  const providers = [];
  for (const theme of themes) {
    providers.push(
      `    <themeProvider id="${themeProviderId(theme, false)}" path="/themes/${themeFileName(theme, false)}" />`
    );
    providers.push(
      `    <themeProvider id="${themeProviderId(theme, true)}" path="/themes/${themeFileName(theme, true)}" />`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<idea-plugin>
  <id>${PLUGIN_ID}</id>
  <name>${PLUGIN_NAME}</name>
  <vendor url="${xmlEscape(PLUGIN_VENDOR_URL)}">${xmlEscape(PLUGIN_VENDOR)}</vendor>
  <depends>com.intellij.modules.platform</depends>
  <description><![CDATA[
    <p><b>Noctis</b> is a collection of light and dark themes with a well-balanced blend of
    warm and cold medium-contrast colors, ported from the VS Code theme of the same name.</p>
    <p>Each of the 11 upstream palettes is available as an <b>Islands</b> theme (2025.3 default look)
    and a <b>Classic</b> theme (pre-Islands chrome).</p>
    <ul>
      <li>Dark: Noctis, Azureus, Bordo, Obscuro, Sereno, Uva, Viola, Minimus</li>
      <li>Light: Lux, Hibernus, Lilac</li>
    </ul>
    <p>Ported from <a href="https://github.com/liviuschera/noctis">liviuschera/noctis</a> (MIT)
    by Liviu Schera. Unofficial port — not affiliated with the original author.</p>
  ]]></description>
  <change-notes><![CDATA[
${changeNotesHtml}
  ]]></change-notes>
  <extensions defaultExtensionNs="com.intellij">
${providers.join("\n")}
  </extensions>
</idea-plugin>
`;
}

async function main() {
  await mkdir(join(ROOT, THEME_DIR), { recursive: true });
  await mkdir(join(ROOT, "src/main/resources/META-INF"), { recursive: true });

  for (const theme of noctisThemes) {
    const schemePath = join(ROOT, THEME_DIR, schemeFileName(theme));
    await writeFile(schemePath, buildEditorSchemeXml(theme), "utf8");
    console.log(`wrote ${schemePath}`);

    const islandsPath = join(ROOT, THEME_DIR, themeFileName(theme, false));
    await writeFile(islandsPath, buildThemeJson(theme, { classic: false }), "utf8");
    console.log(`wrote ${islandsPath}`);

    const classicPath = join(ROOT, THEME_DIR, themeFileName(theme, true));
    await writeFile(classicPath, buildThemeJson(theme, { classic: true }), "utf8");
    console.log(`wrote ${classicPath}`);
  }

  const [gradleProperties, changelogMarkdown] = await Promise.all([
    readFile(join(ROOT, "gradle.properties"), "utf8"),
    readFile(join(ROOT, "CHANGELOG.md"), "utf8")
  ]);

  const pluginVersion = gradleProperty(gradleProperties, "pluginVersion");
  const changeNotesHtml = changelogHtml(changelogMarkdown, pluginVersion);

  const pluginXmlPath = join(ROOT, PLUGIN_XML_PATH);
  
  await writeFile(pluginXmlPath, buildPluginXml(noctisThemes, changeNotesHtml), "utf8");
  console.log(`wrote ${pluginXmlPath} (change-notes ${pluginVersion})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
