# Implementation Plan: Aura Glassmorphism UI Refine

This plan outlines the steps to transform the AuraFitness Dashboard into a modern, "Glassmorphism + Pink Glow" aesthetic. The goal is to create a premium "Aura" feel with semi-transparent cards and a glowing pink ambient background.

## 1. Create the `AuraBackground` Component
We need a reusable background component that provides the "Pink Glow" behind the content.

*   **Objective**: Replace the standard solid background with a dynamic ambient background.
*   **Implementation**:
    *   Create `components/common/AuraBackground.tsx`.
    *   Use a base `View` with a light/dark gradient background.
    *   Add absolute positioned "Glow Orbs" (Views with high border radius and simpler CSS-like shadows or `expo-linear-gradient` with opacity).
    *   **The Pink Aura**: Place a large, blurred pink glow (`#EC4899` or similar) in the top-right or center area to shine through the cards.
    *   **Secondary Glow**: A softer violet/blue glow to balance it.
    *   *Optional*: Add simple `Animated.View` scaling to make the aura "breathe".

## 2. Implement Glassmorphism Card Style
Update the `Card` styling to act as "frosted glass".

*   **Objective**: Make cards semi-transparent so the Aura shines through.
*   **Styles**:
    *   **Background**: Change from solid colors to `rgba(255, 255, 255, 0.6)` (Light Mode) or `rgba(30, 30, 30, 0.6)` (Dark Mode).
    *   **Blur**: Use `expo-blur`'s `BlurView` wrapper for *true* glassmorphism on iOS/Android.
    *   **Border**: Add a subtle "glass edge" border: `borderColor: 'rgba(255, 255, 255, 0.5)'` with `borderWidth: 1`.
    *   **Shadow**: Use a soft, colored shadow to lift the card, but keep it subtle.

## 3. Refine `DashboardScreen`
Integrate the new background and card styles.

*   **Step 3.1: Integrate Background**: Wrap the entire Dashboard content in `<AuraBackground>`.
*   **Step 3.2: Update Cards**:
    *   Refactor the `dashboardCardStyle` we created earlier.
    *   Instead of the "Welcome Card" style, we switch to "Glass Style".
    *   Ensure all text has sufficient contrast against the potentially complex background.
*   **Step 3.3: "Snap Your Meal" Polishing**:
    *   Ensure the "Snap Your Meal" card (which is now a card) looks like a premium glass element.
    *   Maybe give it a slightly stronger frosted effect or a subtle gradient *border* to make it stand out as the primary action.

## 4. UI Polish & Animations
*   **Header**: Make the header transparent so it floats over the Aura.
*   **Tour Highlights**: Ensure the Tour "Spotlight" looks good against the glass cards (might need to darken the backdrop more).
*   **Bottom Tab**: (Optional) Apply glass effect to the bottom tab bar if possible (using `BlurView` in navigation config).

## Execution Strategy
1.  **Create `AuraBackground`** and test it on Dashboard.
2.  **Update `Card` component** (or create `GlassCard`) to support the blur effect.
3.  **Apply to Dashboard** and tune the opacity/colors.
