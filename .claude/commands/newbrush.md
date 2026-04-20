---
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(npx eslint:*)
description: Create a new creative brush with custom visual effects
---

# New Brush Creator

You are creating a new brush for the Infinite canvas application. The user has described the visual effect they want: **$ARGUMENTS**

## Step 1: Read the documentation

First, read the brush creation guide:

```
Read new_brush.md
```

Also read an existing creative brush for reference:

```
Read imports/classes/brushes/nebula.js
```

## Step 2: Design the effect

Based on "$ARGUMENTS", design a unique visual effect. Consider:

- **Colors**: Solid, gradient, rainbow, temperature-based?
- **Shapes**: Lines, particles, waves, spirals?
- **Animation**: Time-based changes, pressure response?
- **Layers**: Single stroke or multi-layer glow?

## Step 3: Create the brush

1. **Choose a name**: Short, lowercase, no spaces (e.g., `fire`, `sparkle`, `aurora`)

2. **Create the brush file**: `imports/classes/brushes/<name>.js`
   - Extend `LinesBrush`
   - Implement `draw()` for real-time feedback
   - Implement `drawing()` for saved stroke replay (must be deterministic!)
   - Use seeded random for any randomness in `drawing()`

3. **Register in LayerManager**: `imports/classes/layers/layerManager.js`
   - Add import
   - Add to `this.brushes`
   - Add case in `brushForType()`

4. **Add UI**: `client/book.html`
   - Add menu items with 3 sizes (small, medium, large)
   - Choose appropriate FontAwesome icon

5. **Add handlers**: `client/book.js`
   - Add click handlers for each size
   - Add hover handler for selection preview

## Step 4: Verify

Run ESLint to check for errors:

```
npx eslint imports/classes/brushes/<name>.js
```

## ESLint Rules to Follow

- No `continue` statements → use `if` blocks
- No `for...of` loops → use `forEach`
- Class methods must use `this` → wrap helpers in instance methods
- No parentheses around single arrow params: `x => x` not `(x) => x`
- Use object destructuring: `const { foo } = obj`

## Creative Effect Ideas

### Fire/Sparks:
- Orange-red-yellow gradient based on pressure
- Particles rising upward with random drift
- Flickering opacity

### Ice/Crystal:
- Blue-white-cyan colors
- Sharp angular lines
- Crystalline particle patterns

### Electric:
- Bright cyan/white with purple edges
- Jagged zigzag lines
- Branching lightning particles

### Smoke/Cloud:
- Gray gradients with low opacity
- Soft, diffuse multiple layers
- Drift effect based on time

### Rainbow/Prismatic:
- HSL hue cycling based on position or time
- Multiple offset layers for depth
- Sparkle particles

## Output

After creating the brush, tell the user:
1. The brush name and what it does
2. How to select it in the UI (menu location)
3. The visual effect they can expect
