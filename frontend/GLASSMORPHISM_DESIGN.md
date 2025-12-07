# TodaysMealCard - Visual Design Guide

## Component Layout

### TodaysMealCard (Normal State)
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─ Glassmorphic Background ──────────────────────────────┐ │
│  │ (Semi-transparent white, frosted glass effect)        │ │
│  │                                                        │ │
│  │  ┌──────────────┐    Today's Meals                    │ │
│  │  │              │    1850                             │ │
│  │  │ Food Image   │    kcal                             │ │
│  │  │ (110 x 110)  │    1 meal logged               [→] │ │
│  │  │              │                                     │ │
│  │  └──────────────┘                                     │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│   (Border: White glow effect)                               │
└─────────────────────────────────────────────────────────────┘
```

### TodaysMealCard (Pressed State)
```
┌─────────────────────────────────────────────────────────────┐
│  Scale: 0.95 (slightly compressed)                          │
│  ┌─ Glassmorphic Background ──────────────────────────────┐ │
│  │ (More visible, darker on press)                        │ │
│  │         ◌ Ripple expanding outward                    │ │
│  │       ◌   ◌                                            │ │
│  │     ◌       ◌      [Content centered]                  │ │
│  │   ◌           ◌                                        │ │
│  │ ◌               ◌                                      │ │
│  │   ◌           ◌                                        │ │
│  │     ◌       ◌                                          │ │
│  │       ◌   ◌                                            │ │
│  │         ◌                                              │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│   (Ripple effect: White circle expanding outward)           │
└─────────────────────────────────────────────────────────────┘
```

### Ripple Animation Timeline
```
Frame 0ms    Frame 150ms    Frame 300ms    Frame 450ms    Frame 600ms
(Tap)        (Expanding)    (Expanding)    (Fading)       (Complete)

◌            ◌              ◌⟲             ◌              (invisible)
             ◌╱╲◌           ╱◌╲╲╱◌         ╱  ◌╲╱╲╱◌

Scale: 0→1   Scale: 1→2     Scale: 2→3     Scale: 3→4     Scale: 4
Opacity: 1   Opacity: 1     Opacity: 0.7   Opacity: 0.2   Opacity: 0
```

## TodaysMealDetail Modal

### Modal Layout (Bottom Sheet)
```
┌─────────────────────────────────────────────────────────────┐
│  Tap on card triggers:                                      │
│  1. Background dims with rgba(0,0,0,0.5)                   │
│  2. Modal slides up from bottom                            │
│  3. Modal zooms in with spring animation                   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Today's Meals                                    ✕  │  │
│  │  2 meals logged                                       │  │
│  │                                                      │  │
│  │  ┌─ Total Calories ──────────────────────────────┐  │  │
│  │  │                                               │  │  │
│  │  │  Total Calories                               │  │  │
│  │  │  1850 kcal                                    │  │  │
│  │  │                                               │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │                                                      │  │
│  │  Meal 1                                             │  │
│  │  ┌──────────┐                                       │  │
│  │  │          │  Breakfast           950 kcal   ✎    │  │
│  │  │ Pancakes │  08:30 AM                             │  │
│  │  │ Image    │  Protein: 12g                         │  │
│  │  │          │  Carbs: 65g                           │  │
│  │  └──────────┘  Fat: 28g                             │  │
│  │                                                      │  │
│  │  Meal 2                                             │  │
│  │  ┌──────────┐                                       │  │
│  │  │          │  Lunch               900 kcal    ✎    │  │
│  │  │ Salad    │  12:45 PM                             │  │
│  │  │ Image    │  (tap to expand)                      │  │
│  │  │          │                                       │  │
│  │  └──────────┘                                       │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  (Dark background #1a1a1a, glassmorphic layers)           │
└─────────────────────────────────────────────────────────────┘
```

## Color Palette

### Light Theme (Card)
```
- Background: rgba(255, 255, 255, 0.1) - Subtle glass tint
- Border: rgba(255, 255, 255, 0.4) - Bright white outline
- Text Primary: #FFFFFF (White)
- Text Secondary: rgba(255, 255, 255, 0.6) (Dimmed white)
- Ripple: rgba(255, 255, 255, 0.4) (White glow)
- Arrow Button: rgba(255, 255, 255, 0.15) background
```

### Dark Theme (Modal)
```
- Background: #1a1a1a (Very dark)
- Borders: rgba(255, 255, 255, 0.1) (Subtle dividers)
- Text Primary: #FFFFFF (White)
- Text Secondary: rgba(255, 255, 255, 0.6) (Dimmed white)
- Accent: #4CAF50 (Green for edit button)
- Glass Layer: rgba(255, 255, 255, 0.08) (Frosted effect)
```

## Animation Specifications

### Card Spring Physics
```
Press → Scale: 1 → 0.95
  Damping: 10
  Mass: 1
  Duration: ~150ms (spring physics)

Release → Scale: 0.95 → 1
  Damping: 10
  Mass: 1
  Duration: ~150ms (bouncy return)
```

### Ripple Wave
```
Start: Center (50%, 50%)
- Initial scale: 0
- Initial opacity: 1
- Initial color: rgba(255, 255, 255, 0.4)

Animation:
- Duration: 600ms
- Easing: Easing.out(Easing.quad)
- End scale: 4 (4x expansion)
- End opacity: 0 (fade away)

Path: Circular expansion from center
```

### Modal Entry
```
Entry Animation: ZoomIn.springify()
- Starts: Center with small scale
- Ends: Full view at normal scale
- Duration: ~400ms
- Physics: Spring (bouncy)

Overlay Animation:
- Background fades in from transparent to rgba(0,0,0,0.5)
- Duration: ~300ms
```

### Meal List Items
```
Each meal animates:
- Animation: FadeInDown
- Stagger: index * 50ms (items enter sequentially)
- Duration: ~400ms each
- Effect: Slides down while fading in
```

## Responsive Behavior

### Phone (< 600px)
- Card width: Full width - 32px padding
- Image size: 110px × 110px
- Font sizes: As specified
- Modal height: 90% of screen

### Tablet (600px - 1024px)
- Card width: 90% centered or up to 500px max
- Image size: 130px × 130px
- Font sizes: +2-4px for legibility
- Modal height: 80% of screen

### Web Desktop (> 1024px)
- Card width: 500px centered
- Image size: 140px × 140px
- Font sizes: Standard
- Modal width: 600px max, centered
- Modal height: 80% of viewport

## Accessibility Features

- High contrast: White text on dark/semi-transparent backgrounds
- Touch target size: All buttons ≥ 44px for easy tapping
- Semantic structure: Pressable components have proper labels
- Visual feedback: Clear scaling and ripple on interaction
- Color not only indicator: Icons and text work together
- Dark mode support: Naturally works in dark themes

## Dark Mode Compatibility

The card and modal are designed with dark mode in mind:
- Light backgrounds use transparency to work over dark wallpapers
- Modal uses dark theme by default
- Text uses white for contrast
- All colors tested on dark backgrounds

---

**Design System**: Glassmorphism + Material Design 3
**Animation Framework**: React Native Reanimated v2+
**Status**: ✅ Production Ready
