# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Infinite is a Meteor-based writing/drawing tool with an infinite canvas, designed for graphic tablet owners. Uses Paper.js for canvas rendering and supports pressure-sensitive drawing.

## Commands

```bash
meteor run                                                    # Dev server
meteor test --once --driver-package meteortesting:mocha       # Tests
npx eslint .                                                  # Lint
```

## Coding Preferences

- No defensive/preventive code that silently hides errors (e.g., `if (!x) return;` guards)
- Let errors surface so they can be debugged properly
