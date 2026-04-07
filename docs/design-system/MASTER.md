# AuraFitness Design System

## Product Direction
- Positioning: premium performance with calm confidence.
- Tone: clear, warm, trustworthy, restrained.
- Core promise: log quickly, understand clearly, stay consistent.
- Anti-patterns: mascot-first UI, decorative AI language, full-screen glassmorphism, arbitrary gradients, overloaded dashboards.

## Brand Rules
- Primary brand color is warm terracotta.
- Secondary accent is restrained eucalyptus, not bright cyan.
- Mascot stays secondary and only appears in onboarding, empty, or celebration states.
- Core product surfaces use Aura mark or neutral product chrome, not cute illustration.
- Do not lead with “AI” in navigation, hero copy, or plan cards.

## Color Tokens
- Background: `#F6F2EC`
- Surface elevated: `#FFFFFF`
- Surface variant: `#F3EEE6`
- Primary: `#C96A34`
- Primary dark: `#A7552A`
- Secondary: `#2F7A6A`
- Text primary: `#171511`
- Text secondary: `#4E473E`
- Text muted: `#7B7368`
- Border: `#E3DCD2`

## Typography
- Use the shared `Text` component only.
- Hierarchy:
  - `hero`: primary numeric emphasis or auth/paywall hero.
  - `heading1`: page title.
  - `heading2`: section hero or primary card title.
  - `heading3`: section header.
  - `heading4`: action title or dense block heading.
  - `body`: default content.
  - `caption`: secondary support copy.
  - `label`: small uppercase metadata.
- Do not introduce screen-local font sizes unless there is a product-critical reason.

## Surfaces
- Default card: solid elevated surface with subtle border and soft shadow.
- Use `BentoCard` for grouped product modules, not for visual novelty.
- Glass treatment is allowed only for floating nav/sheet chrome.
- Empty, error, and settings rows should use solid surfaces.

## Motion
- Default durations:
  - Fast: 150ms
  - Base: 220ms
  - Slow: 300ms
- Respect reduced motion.
- Avoid infinite decorative motion on primary actions and empty states.

## Copy Rules
- Prefer:
  - smart logging
  - clear targets
  - weekly insight
  - active plan
  - build plan
- Avoid:
  - AI-powered everything
  - startup slogans
  - fake social proof or unsupported claims

## Acceptance Checks
- One primary visual center per screen.
- No mixed mascot + glass + gradient + chart overload above the fold.
- All new UI uses shared tokens and shared text scale.
- Core tasks remain discoverable within two steps.

