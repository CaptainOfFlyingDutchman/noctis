function greet(name) {
  const message = `Hello, ${name}`;
  const count = 11;
  // A short sample for visual QA
  return { message, count, ok: true };
}

class Theme {
  constructor(name) {
    this.name = name;
  }
}

export { greet, Theme };
