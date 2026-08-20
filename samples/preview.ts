// noinspection SpellCheckingInspection

const greeting = "Noctis";
const count = 11;

/**
 * Warm and cold medium-contrast colors.
 */
function themeName(variant: string) {
  return `Noctis ${variant}`;
}

class Palette {
  private name: string;
  private accent: string;

  constructor(name: string) {
    this.name = name;
    this.accent = "#40d4e7";
  }

  describe() {
    return `${this.name} uses ${this.accent}`;
  }
}

export const palettes = ["Lux", "Hibernus", "Lilac", "Azureus"].map(themeName);
console.log(greeting, count, new Palette("Noctis").describe());
