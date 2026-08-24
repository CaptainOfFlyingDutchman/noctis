package com.manvendrask.noctis;

import com.intellij.codeInsight.daemon.DaemonCodeAnalyzer;
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.editor.EditorFactory;
import com.intellij.openapi.editor.colors.EditorColorsManager;
import com.intellij.openapi.editor.colors.EditorColorsScheme;
import com.intellij.openapi.editor.colors.TextAttributesKey;
import com.intellij.openapi.editor.ex.EditorEx;
import com.intellij.openapi.editor.markup.TextAttributes;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.project.ProjectManager;

import java.awt.Font;
import java.util.concurrent.atomic.AtomicBoolean;

final class NoctisFunctionItalics {
  private static final TextAttributesKey[] KEYS = {
    DefaultLanguageHighlighterColors.FUNCTION_DECLARATION,
    DefaultLanguageHighlighterColors.FUNCTION_CALL,
    DefaultLanguageHighlighterColors.INSTANCE_METHOD,
    DefaultLanguageHighlighterColors.STATIC_METHOD
  };

  private static final String[] EXTRA_KEY_NAMES = {
    "JS.GLOBAL_FUNCTION",
    "JS.INSTANCE_MEMBER_FUNCTION",
    "JS.STATIC_MEMBER_FUNCTION",
    "JS.LOCAL_FUNCTION",
    "CSS.FUNCTION"
  };

  private static final AtomicBoolean applying = new AtomicBoolean();

  private NoctisFunctionItalics() {}

  static void sync() {
    apply(NoctisSettings.getInstance().isItalicFunctionNames());
  }

  static void apply(boolean italic) {
    if (!applying.compareAndSet(false, true)) {
      return;
    }

    try {
      EditorColorsScheme scheme = EditorColorsManager.getInstance().getGlobalScheme();
      int fontType = italic ? Font.ITALIC : Font.PLAIN;

      for (TextAttributesKey key : KEYS) {
        setFontType(scheme, key, fontType);
      }
      for (String name : EXTRA_KEY_NAMES) {
        TextAttributesKey key = TextAttributesKey.find(name);
        if (key != null) {
          setFontType(scheme, key, fontType);
        }
      }

      refreshEditors();
    } finally {
      applying.set(false);
    }
  }

  private static void setFontType(EditorColorsScheme scheme, TextAttributesKey key, int fontType) {
    TextAttributes current = scheme.getAttributes(key);
    if (current == null) {
      current = new TextAttributes();
    }
    if (current.getFontType() == fontType) {
      return;
    }
    TextAttributes copy = current.clone();
    copy.setFontType(fontType);
    scheme.setAttributes(key, copy);
    TextAttributes stored = scheme.getAttributes(key);
    if (stored != null && stored.getFontType() != fontType) {
      stored.setFontType(fontType);
    }
  }

  private static void refreshEditors() {
    for (Editor editor : EditorFactory.getInstance().getAllEditors()) {
      if (editor instanceof EditorEx ex) {
        ex.reinitSettings();
      }
    }
    for (Project project : ProjectManager.getInstance().getOpenProjects()) {
      DaemonCodeAnalyzer.getInstance(project).restart(NoctisFunctionItalics.class);
    }
  }
}
