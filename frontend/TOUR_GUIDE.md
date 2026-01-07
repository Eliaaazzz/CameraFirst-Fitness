# Tour Guide Implementation Guide

This document explains how the Tour Guide feature is implemented in AuraFitness. It is designed to mimic the look and feel of `react-joyride`.

## Architecture

The tour system uses the **Context API** to manage state globally. This allows any component to register itself as a step in the tour, and for the tour controller to be accessed from anywhere.

### Key Components

1.  **`TourGuideProvider`** (`frontend/src/components/tour/TourProvider.tsx`)
    *   This component wraps the entire application (in `App.tsx`).
    *   It manages the state of the tour (current step, active status).
    *   It renders the `Modal` that contains the spotlight overlay and the tooltip.

2.  **`TourGuideZone`** (`frontend/src/components/tour/TourProvider.tsx`)
    *   This is a wrapper component used to mark an element as a tour step.
    *   It automatically measures the position of its children and registers them with the provider.
    *   **Usage:** Wrap any UI element you want to highlight.

3.  **`Tooltip`** (`frontend/src/components/tour/Tooltip.tsx`)
    *   The visual card that appears pointing to the element.
    *   It contains the title, text, and navigation buttons ("Next", "Back", "Skip").
    *   Styled to match the requested design (White card, Red/Pink button).

4.  **`SpotlightOverlay`** (`frontend/src/components/tour/SpotlightOverlay.tsx`)
    *   The dark overlay that dims the rest of the screen and creates a "hole" (spotlight) around the target element using `react-native-svg`.

## How to Use

### 1. Define Tour Steps
Define your steps in `frontend/src/config/tourSteps.ts`. Each step needs a unique `zone` number.

```typescript
export const DASHBOARD_TOUR_STEPS = [
  {
    zone: 1,
    title: 'First Step',
    text: 'Description for the first step.',
  },
  // ...
];
```

### 2. Wrap UI Elements with `TourGuideZone`
In your screen (e.g., `DashboardScreen.tsx`), import `TourGuideZone` and wrap the elements you want to highlight.

```tsx
import { TourGuideZone } from '@/components/tour/TourProvider';

// ...

<TourGuideZone
  zone={1}
  text="Description"
  title="First Step"
>
  <Button>My Target Button</Button>
</TourGuideZone>
```

### 3. Start the Tour
Use the `useTourGuideController` hook to start the tour.

```tsx
import { useTourGuideController } from '@/components/tour/TourProvider';

const MyComponent = () => {
  const { start, canStart } = useTourGuideController();

  const handleStartTour = () => {
    if (canStart) {
      start();
    }
  };

  return <Button onPress={handleStartTour}>Start Tour</Button>;
}
```

## Customization

*   **Styles**: Edit `frontend/src/components/tour/Tooltip.tsx` to change colors, fonts, or layout of the tooltip card.
*   **Overlay**: Edit `frontend/src/components/tour/SpotlightOverlay.tsx` to change the backdrop color or opacity.

## Implementation Details for "React Joyride" Look

The `Tooltip.tsx` component has been customized to match the specific design:
*   **Centered Title**: `styles.tooltipTitle`
*   **Step Counter**: The "Next" button dynamically shows "Step X of Y".
*   **Design**: Square-ish rounded corners (`borderRadius: 6`) and shadow.
*   **Colors**: Primary button uses `#ff0044`.
