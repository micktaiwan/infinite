# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Infinite is a Meteor-based writing/drawing tool with an infinite canvas, designed for graphic tablet owners. It uses Paper.js for canvas rendering and supports pressure-sensitive drawing.

## Commands

```bash
# Development
meteor run              # Start dev server (or: npm start)

# Testing
meteor test --once --driver-package meteortesting:mocha    # Run tests once
TEST_WATCH=1 meteor test --full-app --driver-package meteortesting:mocha  # Watch mode

# Linting
npx eslint .            # Run ESLint (airbnb-base config)

# Bundle analysis
meteor --production --extra-packages bundle-visualizer
```

## Architecture

### Directory Structure

- `client/` - Blaze templates, routes, and client entry point
- `server/` - Server entry point and startup code
- `imports/api/` - Collections, methods, and publications
- `imports/classes/` - Core drawing logic (brushes, layers)

### Core Concepts

**Layer System** (`imports/classes/layers/`):
- `Layer` - Base class handling canvas creation, coordinate transforms (screen ↔ true), pan/zoom
- `BoardLayer` - Drawing layer with MongoDB-backed persistence via `Drawings` collection
- `SelectionLayer` - Handles selection rectangles and item manipulation
- `LayerManager` - Orchestrates multiple layers, brush selection, and user preferences

**Brush System** (`imports/classes/brushes/`):
- `Brush` - Base class with pressure sensitivity support
- `LinesBrush` - Standard pressure-sensitive line drawing
- `ShakyBrush` - Wobbly/sketchy line effect
- `PaperBrush` - Paper.js-based rendering for smooth curves

**Data Model** (`imports/api/books/`):
- `Books` - Collection for book/canvas documents
- `Drawings` - Stroke data (stored in `lines` collection), indexed by `bookId`, `layerIndex`, `order`
- `Layers` - Layer metadata per book

### Routing

FlowRouter with BlazeLayout:
- `/` → `home` template
- `/book/:bookId` → `book` template with LayerManager instance

### Client Globals

Defined in `.eslintrc.js`: `FlowRouter`, `BlazeLayout`, `admin`

## Coding Preferences

- No defensive/preventive code that silently hides errors (e.g., `if (!x) return;` guards)
- Let errors surface so they can be debugged properly
