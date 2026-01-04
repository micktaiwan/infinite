# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Infinite is a Meteor-based writing/drawing tool with an infinite canvas, designed for graphic tablet owners. Uses Paper.js for canvas rendering and supports pressure-sensitive drawing.

## Documentation

- [How to Create a New Brush](./new_brush.md) - Complete guide for adding custom brushes

## Commands

```bash
meteor run                                                    # Dev server
meteor test --once --driver-package meteortesting:mocha       # Tests
npx eslint .                                                  # Lint
```

## Coding Preferences

- No defensive/preventive code that silently hides errors (e.g., `if (!x) return;` guards)
- Let errors surface so they can be debugged properly
- Always use object destructuring when accessing properties (e.g., `const { color } = dataset` instead of `const color = dataset.color`)

## ESLint Rules

This project uses airbnb-base. Key rules to follow:

- **No `continue` statements**: Use `if` blocks instead
  ```js
  // Bad
  if (x < 0) continue;
  doSomething();

  // Good
  if (x >= 0) {
    doSomething();
  }
  ```

- **No `for...of` loops**: Use `forEach` or array methods instead
  ```js
  // Bad
  for (const item of items) { ... }

  // Good
  items.forEach(item => { ... });
  ```

- **Class methods must use `this`**: If a method doesn't use `this`, either:
  - Extract it as a module-level function
  - Make it reference `this.type` or another instance property
  ```js
  // Bad
  class Foo {
    helper(x) { return x * 2; }
  }

  // Good - module function + instance wrapper
  function computeHelper(x) { return x * 2; }
  class Foo {
    helper(x) { return computeHelper(x + this.type.length); }
  }
  ```

- **No parentheses around single arrow function parameters**
  ```js
  // Bad
  items.forEach((item) => { ... });

  // Good
  items.forEach(item => { ... });
  ```

- **Remove unused callback parameters**: Don't declare parameters you don't use
  ```js
  // Bad
  changed: (id, doc) => { useOnly(id); }
  removed: (id) => { doSomething(); }

  // Good
  changed: id => { useOnly(id); }
  removed: () => { doSomething(); }
  ```

- **Use object destructuring** (prefer-destructuring)
  ```js
  // Bad
  const segments = path.segments;

  // Good
  const { segments } = path;
  ```
