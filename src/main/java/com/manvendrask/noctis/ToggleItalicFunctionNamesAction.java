package com.manvendrask.noctis;

import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.ToggleAction;
import com.intellij.openapi.project.DumbAware;
import org.jetbrains.annotations.NotNull;

public final class ToggleItalicFunctionNamesAction extends ToggleAction implements DumbAware {
  public ToggleItalicFunctionNamesAction() {
    super(NoctisConfigurable.CHECKBOX_TEXT, NoctisConfigurable.COMMENT_TEXT, null);
  }

  @Override
  public boolean isSelected(@NotNull AnActionEvent e) {
    return NoctisSettings.getInstance().isItalicFunctionNames();
  }

  @Override
  public void setSelected(@NotNull AnActionEvent e, boolean state) {
    NoctisSettings.getInstance().setItalicFunctionNames(state);
    NoctisFunctionItalics.sync();
  }

  @Override
  public @NotNull ActionUpdateThread getActionUpdateThread() {
    return ActionUpdateThread.EDT;
  }
}
