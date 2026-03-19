# iOS App Store Release Notes

Last checked: 2026-03-19

## Current status

- Privacy policy URL is already live at `https://aurafitness.org/privacy-policy.html`.
- Terms of service is live at `https://aurafitness.org/terms-of-service.html`.
- Data deletion page is live at `https://aurafitness.org/data-deletion.html`.
- Firebase Hosting is configured in the repo, so the legal pages are part of the deployed web bundle.
- `frontend/eas.json` now exists and is ready for `eas build` / `eas submit`.

## App Store Connect values for this project

- App name: `AuraFitness`
- Bundle ID: `com.elia.aurafit`
- SKU recommendation: `com.elia.aurafit`
- Privacy Policy URL: `https://aurafitness.org/privacy-policy.html`
- Support URL recommendation: `https://aurafitness.org`
- Marketing URL recommendation: `https://aurafitness.org`
- Primary category recommendation: `Health & Fitness`

Secondary category is optional. `Food & Drink` is a reasonable choice if you want the nutrition side to be more visible.

## Create the app in App Store Connect

1. Sign in to App Store Connect.
2. Open `Apps`.
3. Click `+` -> `New App`.
4. Fill:
   - Name: `AuraFitness`
   - Primary language: your shipping language
   - Bundle ID: `com.elia.aurafit`
   - SKU: `com.elia.aurafit`
5. After the app record exists, open `App Information`.
6. Copy the `Apple ID`. This is the `ascAppId` used by `eas submit`.
7. Fill metadata before App Review:
   - Description
   - Keywords
   - Support URL
   - Marketing URL
   - Privacy Policy URL
   - Category
   - Screenshots
   - App Privacy questionnaire

## Screenshots

There are no App Store screenshot assets checked into this repo right now.

Prepare at least:

- iPhone 6.9-inch screenshots
- or iPhone 6.5-inch screenshots

Use the real app UI from a production-like build. Avoid simulator placeholder data that does not match the shipped experience.

## EAS setup

Run from the Expo app directory:

```bash
cd frontend
npm install -g eas-cli
eas login
eas build:configure
```

What this does:

- `eas-cli`: installs the Expo build/submit CLI
- `eas login`: links the CLI to your Expo account
- `eas build:configure`: links or creates the remote EAS project and validates local config

Note: `frontend/eas.json` is already present, but the project still needs to be linked to your Expo account the first time you run EAS commands.

## Build

### Internal test build

```bash
cd frontend
eas build --platform ios --profile preview
```

Use this when you want a TestFlight-oriented binary without submitting it yet.

### Production build

```bash
cd frontend
eas build --platform ios --profile production
```

What happens on the first production build:

- EAS checks the iOS credentials
- EAS may ask you to log in to Apple Developer
- EAS may create or reuse the distribution certificate and provisioning profile
- EAS uploads the resulting IPA to the Expo build dashboard

## Submit

Interactive submit:

```bash
cd frontend
eas submit --platform ios --profile production
```

One-command build and submit:

```bash
cd frontend
eas build --platform ios --profile production --auto-submit
```

During submit you need:

- the App Store Connect app already created
- the `ascAppId` from App Store Connect
- Apple credentials or an App Store Connect API key

After submit:

- the build appears in App Store Connect / TestFlight
- Apple still needs to process the build
- release to the App Store is not automatic
- you still need to finish metadata and send the build to App Review

## Important release note

I aligned the native iOS `Info.plist` with the current app identity:

- display name is now `AuraFitness`
- URL schemes now include `com.elia.aurafit`
- URL schemes now include the Google reversed iOS client ID

Remaining legacy naming still exists in the Xcode target and project names (`FitnessMVP`). That is not usually store-visible, but you should keep it in mind when selecting schemes, certificates, and build targets.
