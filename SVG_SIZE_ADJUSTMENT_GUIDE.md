# SVG Size Adjustment Guide

## Quick Reference

### 1. **Container Size** (Line 56)
Controls the overall container that holds the SVG:

```tsx
<div className="relative flex-1 w-5/6 max-h-[635px] overflow-visible">
```

**To adjust:**
- **Width**: Change `w-5/6` (83.33% width) to:
  - `w-full` = 100% width
  - `w-3/4` = 75% width
  - `w-1/2` = 50% width
  - `w-[600px]` = Fixed 600px width

- **Height**: Change `max-h-[635px]` to:
  - `max-h-[800px]` = Max 800px height
  - `h-[500px]` = Fixed 500px height
  - `h-full` = Full height of parent

**Example:**
```tsx
<div className="relative flex-1 w-full max-h-[800px] overflow-visible">
```

---

### 2. **SVG ViewBox** (Line 77)
Controls the coordinate system and scaling:

```tsx
<svg viewBox="0 0 1200 800" ...>
```

**To adjust:**
- **Match V1.svg**: Change to `viewBox="0 0 1092 738"`
- **Make it wider**: `viewBox="0 0 1400 800"` (wider aspect ratio)
- **Make it taller**: `viewBox="0 0 1200 1000"` (taller aspect ratio)
- **Zoom in**: `viewBox="100 100 1000 600"` (shows middle portion)
- **Zoom out**: `viewBox="-100 -100 1400 1000"` (shows more area)

**Note:** Changing viewBox will scale everything proportionally.

---

### 3. **SVG Path Coordinates** (Lines 83, 97, 104, 179)
The actual shape path from V1.svg:

```tsx
<path d="M0.500012 469V688.5C0.500012 708 10.5001 736.499 53 736.499C95.5 736.499 1033 737 1049 737C1065 737 1091.5 717 1091.5 688.5C1091.5 660 1091 84.9999 1091 62.5C1091 40 1061 0.500026 1038.5 0.500005H782.5H427.5H53C13 0.499974 0.500038 20.5 0.500012 40V469Z" />
```

**To scale the path:**
- **Scale up 20%**: Multiply all numbers by 1.2
- **Scale down 20%**: Multiply all numbers by 0.8
- **Move position**: Add/subtract from x coordinates (first number in each pair)
- **Move vertically**: Add/subtract from y coordinates (second number in each pair)

**Example - Scale up 10%:**
```tsx
// Original: M0.500012 469
// Scaled: M0.550013 515.9 (multiply by 1.1)
```

**Better approach:** Use CSS `transform: scale()` instead of editing path coordinates.

---

### 4. **ForeignObject Sizes** (Content inside SVG)

#### **Image Container** (Lines 115-120)
```tsx
<foreignObject x="0" y="0" width="1200" height="800" ...>
```

**To adjust:**
- Match viewBox: If viewBox is `1092 738`, change to `width="1092" height="738"`
- Scale proportionally: `width="1400" height="933"` (scaled up ~17%)

#### **Logo Position** (Line 137)
```tsx
<foreignObject x="465" y="-30" width="280" height="120">
```

**To adjust:**
- **Move left/right**: Change `x="465"` (lower = left, higher = right)
- **Move up/down**: Change `y="-30"` (lower = up, higher = down)
- **Logo size**: Change `width="280" height="120"`

**Example - Move logo to top-left:**
```tsx
<foreignObject x="50" y="20" width="280" height="120">
```

#### **Bottom Card** (Line 152)
```tsx
<foreignObject x="0" y="540" width="350" height="400">
```

**To adjust:**
- **Vertical position**: Change `y="540"` (lower = higher on screen)
- **Card size**: Change `width="350" height="400"`

**Example - Move card up:**
```tsx
<foreignObject x="0" y="400" width="350" height="400">
```

---

## Common Adjustments

### Make SVG Bigger Overall
```tsx
// 1. Increase container max height
<div className="relative flex-1 w-5/6 max-h-[800px] overflow-visible">

// 2. Keep viewBox the same (or adjust proportionally)
<svg viewBox="0 0 1200 800" ...>
```

### Make SVG Smaller Overall
```tsx
// 1. Decrease container max height
<div className="relative flex-1 w-5/6 max-h-[500px] overflow-visible">

// 2. Keep viewBox the same
```

### Scale Path to Match ViewBox
If viewBox is `1092 738` but path uses coordinates up to `1091.5`:
- Path already matches! No changes needed.
- If you change viewBox, you may need to scale the path.

### Use CSS Transform (Easiest)
Add transform to the SVG:
```tsx
<svg
  className="absolute inset-0 z-10 h-full w-full"
  style={{ transform: 'scale(1.2)' }} // 20% bigger
  viewBox="0 0 1200 800"
  ...
>
```

---

## Step-by-Step: Adjust Size

1. **Decide what to change:**
   - Container size? → Edit line 56
   - SVG coordinate system? → Edit line 77 (viewBox)
   - Shape size? → Edit path coordinates OR use CSS transform
   - Content positions? → Edit foreignObject x/y/width/height

2. **Test incrementally:**
   - Make small changes (10-20% at a time)
   - Check browser to see results
   - Adjust foreignObject positions if needed

3. **Keep proportions:**
   - If viewBox changes, adjust foreignObject dimensions proportionally
   - Example: viewBox `1200x800` → `1092x738` means scale by `0.91`

---

## Current Settings

- **Container**: `w-5/6` (83.33% width), `max-h-[635px]`
- **ViewBox**: `0 0 1200 800`
- **Path**: Uses V1.svg path (coordinates 0-1091.5, 0-737)
- **Image area**: `1200x800`
- **Logo**: `x=465, y=-30, 280x120`
- **Bottom card**: `x=0, y=540, 350x400`
