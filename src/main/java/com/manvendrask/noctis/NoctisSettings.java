package com.manvendrask.noctis;

import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.components.PersistentStateComponent;
import com.intellij.openapi.components.Service;
import com.intellij.openapi.components.State;
import com.intellij.openapi.components.Storage;
import org.jetbrains.annotations.NotNull;

@Service(Service.Level.APP)
@State(name = "NoctisSettings", storages = @Storage("noctis.xml"))
public final class NoctisSettings implements PersistentStateComponent<NoctisSettings.State> {
  public static final class State {
    public boolean italicFunctionNames = false;
  }

  private State state = new State();

  public static NoctisSettings getInstance() {
    return ApplicationManager.getApplication().getService(NoctisSettings.class);
  }

  public boolean isItalicFunctionNames() {
    return state.italicFunctionNames;
  }

  public void setItalicFunctionNames(boolean italicFunctionNames) {
    state.italicFunctionNames = italicFunctionNames;
  }

  @Override
  public State getState() {
    return state;
  }

  @Override
  public void loadState(@NotNull State state) {
    this.state = state;
  }
}
