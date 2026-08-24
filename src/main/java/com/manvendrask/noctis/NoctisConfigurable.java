package com.manvendrask.noctis;

import com.intellij.openapi.options.Configurable;
import com.intellij.openapi.options.SearchableConfigurable;
import com.intellij.ui.JBColor;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBLabel;
import com.intellij.util.ui.FormBuilder;
import com.intellij.util.ui.JBUI;
import com.intellij.util.ui.UIUtil;
import org.jetbrains.annotations.NonNls;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.JComponent;
import javax.swing.JPanel;

public final class NoctisConfigurable implements SearchableConfigurable, Configurable.NoScroll {
  static final String ID = "com.manvendrask.noctis.settings";
  static final String CHECKBOX_TEXT = "Italic function names and calls";
  static final String COMMENT_TEXT =
      "Applies to function names in the editor, including TypeScript and JavaScript.";

  private JBCheckBox italicCheckBox;

  @Override
  public @NotNull @NonNls String getId() {
    return ID;
  }

  @Override
  public String getDisplayName() {
    return "Noctis";
  }

  @Override
  public @Nullable JComponent createComponent() {
    italicCheckBox = new JBCheckBox(CHECKBOX_TEXT);

    JBLabel comment = new JBLabel(COMMENT_TEXT);
    comment.setComponentStyle(UIUtil.ComponentStyle.SMALL);
    comment.setFontColor(UIUtil.FontColor.BRIGHTER);
    comment.setForeground(JBColor.namedColor("Label.infoForeground", comment.getForeground()));
    comment.setBorder(JBUI.Borders.emptyLeft(28));

    return FormBuilder.createFormBuilder()
        .addComponent(italicCheckBox)
        .addComponent(comment)
        .addComponentFillVertically(new JPanel(), 0)
        .getPanel();
  }

  @Override
  public boolean isModified() {
    return italicCheckBox != null
        && italicCheckBox.isSelected() != NoctisSettings.getInstance().isItalicFunctionNames();
  }

  @Override
  public void apply() {
    if (italicCheckBox == null) {
      return;
    }
    NoctisSettings.getInstance().setItalicFunctionNames(italicCheckBox.isSelected());
    NoctisFunctionItalics.sync();
  }

  @Override
  public void reset() {
    if (italicCheckBox != null) {
      italicCheckBox.setSelected(NoctisSettings.getInstance().isItalicFunctionNames());
    }
  }

  @Override
  public void disposeUIResources() {
    italicCheckBox = null;
  }
}
