package com.manvendrask.noctis;

import com.intellij.ide.AppLifecycleListener;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.editor.colors.EditorColorsListener;
import com.intellij.openapi.editor.colors.EditorColorsScheme;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.List;

public final class NoctisThemeSync implements AppLifecycleListener, EditorColorsListener {
  @Override
  public void appFrameCreated(@NotNull List<String> commandLineArgs) {
    ApplicationManager.getApplication().invokeLater(NoctisFunctionItalics::sync);
  }

  @Override
  public void globalSchemeChange(@Nullable EditorColorsScheme scheme) {
    NoctisFunctionItalics.sync();
  }
}
