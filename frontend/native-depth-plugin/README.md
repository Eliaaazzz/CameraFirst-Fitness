# Native real-world-scale plugins (`__getDepthAtCenter` + `ARScaleModule`)

This folder contains **reference templates** for the native code that gives the meal
camera a real-world scale (`img_w_cm`) so the backend can reason about portion size
instead of guessing. There are two independent sources, by device tier:

| Tier (`useDeviceCapabilities`) | Source | Native file | JS hook | Accuracy |
|---|---|---|---|---|
| `lidar` (LiDAR/ToF) | depth map center | `GetDepthAtCenterPlugin.swift` / `.kt` | `useDepthCamera` | ≈±1cm |
| `standard_ar` (ARKit, no depth sensor) | horizontal-plane raycast | `ARScaleModule.swift` | `useARScale` | ≈±3cm |
| `basic` | plate-reference default (35cm) | — | — | ≈±5cm |

> ⚠️ These native files **cannot be compiled or tested outside Xcode / Android Studio
> on a real device**. Treat them as correct starting points, not drop-in code.

## What is actually wired today (read this before trusting the diagrams)

- **`standard_ar` AR path — wired in JS, one device-side step remaining.**
  `ARScaleModule.measure()` → `useARScale` (with a finiteness + 12–90cm plausibility
  gate) → the capture screen passes `imgWcm` via `navigation.setParams(...)` →
  `ReviewMealScreen` reads `route.params.imgWcm` (`ReviewMealScreen.tsx`) → sends
  `img_w_cm` to the backend. The only missing piece is mounting the AR calibration
  step on the capture screen (needs a real device — see below).
- **`lidar`/`ToF` depth path — native template only; the JS conversion is NOT
  implemented yet.** `useDepthCamera` exposes a `DepthResult` with `distanceCm`, but
  **there is no `distance → img_w_cm` conversion in JS**, `DepthResult` does not carry
  `fx`, and `CaptureMetadata` does not carry `imgWcm`. To finish this path you must add
  the conversion and thread `imgWcm` into the same `route.params.imgWcm` the AR path
  uses (see "Completing the LiDAR path"). Until then the depth plugin can run but its
  scale never reaches the backend, and the app uses the 35cm plate default — safe, just
  not yet adding LiDAR scale.

```
standard_ar:  ARScaleModule.measure() → useARScale(imgWcm) → setParams → ReviewMealScreen → img_w_cm  ✅ wired (JS)
lidar/ToF:    __getDepthAtCenter(frame) → useDepthCamera(DepthResult.distanceCm) → [ ⚠ no img_w_cm conversion yet ]
```

## The contract (what the depth plugin must return)

A plain object matching `DepthResult` in `src/hooks/useDepthCamera.ts`:

```ts
{
  hasDepth: boolean,
  distance: number | null,      // meters, center of frame
  distanceCm: number | null,    // == distance * 100
  confidence: number,           // 0..1
  width?: number,
  height?: number,
  accuracy?: 'absolute' | 'relative' | 'high' | 'medium' | 'low',
  error?: string,
}
```

The Swift/Kotlin templates also return an `fx` (focal length in px, scaled to the video
frame width) — the value the pinhole conversion needs. **Note:** `fx` is **not** part of
the `DepthResult` interface today, so it is currently ignored on the JS side. To use it,
add `fx` (and `width`) to `DepthResult` and implement the conversion below.

## Completing the LiDAR path (the missing JS conversion)

The pinhole conversion the depth path needs (this helper does **not** exist in the repo
yet — add it, e.g. `src/utils/scale.ts`):

```ts
// img_w_cm = distanceCm * frameWidthPx / fxPx   (fx and width in the SAME resolution)
export function estimateImageWidthCm(distanceCm: number, fx: number, width: number): number | null {
  if (!isFinite(distanceCm) || !(fx > 0) || !(width > 0)) return null;
  const cm = (distanceCm * width) / fx;
  return cm >= 12 && cm <= 90 ? cm : null; // same plausibility window as useARScale
}
```

Then add `fx` to `DepthResult` + `CaptureMetadata`, compute `imgWcm` in
`VisionCameraView.takePhoto`, and pass it through `route.params.imgWcm` exactly like the
AR path. The native `fx` is "strongly preferred"; a `horizontalFovDeg`/FOV fallback is
**not** implemented (the native side does not emit it).

## iOS (Swift) — `ios/GetDepthAtCenterPlugin.swift` + `.m`

A VisionCamera frame processor only receives the **video** `CMSampleBuffer`; iOS never
attaches `AVDepthData` to it. So depth must come from a **separate**
`AVCaptureDepthDataOutput`, paired with video via `AVCaptureDataOutputSynchronizer`. The
template reflects this:

1. Configure `AVCaptureDepthDataOutput` on your session and an
   `AVCaptureDataOutputSynchronizer` over `[videoOutput, depthOutput]`. Enable
   `isCameraCalibrationDataDeliveryEnabled` on the depth connection (otherwise `fx` is
   unavailable and the plugin reports `hasDepth:false` rather than a bad scale).
2. In the synchronizer delegate, push each synchronized depth into the store:
   ```swift
   let d = collection.synchronizedData(for: depthOutput) as? AVCaptureSynchronizedDepthData
   if let d, !d.depthDataWasDropped { DepthStore.shared.update(d.depthData, timestamp: d.timestamp) }
   ```
   The frame processor reads the freshest depth that matches the current frame timestamp.
3. **ARKit alternative for LiDAR.** Run an `ARSession` with
   `frameSemantics = .sceneDepth` and read `frame.sceneDepth.depthMap` +
   `frame.camera.intrinsics[0][0]`. That is a separate session from VisionCamera, so
   expose it as a native module (like `ARScaleModule`) and read it in `useDepthCamera`.

Register the plugin (VisionCamera v4) — see the `.m` file. JS calls it as
`global.__getDepthAtCenter(frame)` via the `useFrameProcessor` worklet in
`useDepthCamera.ts`.

## Android (Kotlin) — `android/GetDepthAtCenterPlugin.kt`

Use a Camera2 `DEPTH16` / ToF output. VisionCamera delivers the YUV video frame, so depth
comes from a parallel `ImageReader` keyed by timestamp — implement `DepthBridge`
(`latestDepthImage` + `focalLengthPx`) to hand the latest depth `Image` and the
`LENS_INTRINSIC_CALIBRATION` `fx` (scaled to frame width) to the plugin. The decode reads
the low 13 bits as depth (mm) and the high 3 bits as the real confidence code. Register
via `FrameProcessorPluginRegistry.addFrameProcessorPlugin("getDepthAtCenter", ...)`. If
`fx` is 0 (DepthBridge not yet implemented) the plugin returns `hasDepth:false`.

## Build / test steps (on your machine)

1. Copy the iOS files into your Xcode target (add the `-Swift.h` bridging import in the
   `.m`); copy the Kotlin file into your Android package.
2. Wire the depth source (iOS synchronizer → `DepthStore`; Android `DepthBridge`).
3. `cd frontend && npx expo prebuild`, then build to a **real device with LiDAR/ToF**
   (simulators have no depth).
4. Implement the JS conversion above, then confirm the backend request carries a measured
   `img_w_cm` (not the 35cm default).

## How to verify scale is flowing

- AR path: log `imgWcm` returned by `useARScale.measure()`, and confirm
  `route.params.imgWcm` is set on `ReviewMealScreen`.
- Depth path (after wiring the conversion): log the computed `imgWcm` where you set
  `route.params.imgWcm` — `CaptureMetadata` itself carries only
  `{ distanceCm, confidence, accuracy, deviceTier }` today.
- Backend `GeminiMealAnalysisService` logs the prompt context; confirm
  `"img_w_cm": <measured>` appears instead of the 35cm default.

---

# `ARScaleModule` — `standard_ar` (no-LiDAR) scale source

For devices with ARKit but **no** depth sensor (most non-Pro iPhones, ARCore Androids).
Instead of a depth map it raycasts the center of the frame to a detected **horizontal
plane** (the table) and returns the camera-to-plane distance → `img_w_cm` via the same
pinhole formula. Tier sits between LiDAR (±1cm) and the plate fallback (±5cm), at ≈±3cm.

```
no depth sensor + ARKit ──▶ ARScaleModule.measure() ──▶ useARScale (imgWcm)
                                                         └▶ ReviewMealScreen route param → img_w_cm  (same sink as the LiDAR path)
```

Files: `ios/ARScaleModule.swift` + `ios/ARScaleModule.m`. JS: `src/hooks/useARScale.ts`
(degrades to `supported=false` → plate fallback when the native module is absent — never
fabricates a number). `measure()` returns `{ hasScale, distanceCm, imgWcm, fx, trackingState }`.

> ⚠️ REFERENCE TEMPLATE — ARKit needs its own `ARSession`; it can't run at the same time
> as the VisionCamera/expo-camera preview. Intended as a brief **calibration tap**
> (start → measure → stop), NOT a continuous parallel session.

## Integration (remaining device-side steps)

1. Add `ARScaleModule.swift` + `.m` to the Xcode target (same `-Swift.h` bridging import
   as the depth plugin). Ensure `NSCameraUsageDescription` is set.
2. In the capture screen, for `tier === 'standard_ar'`, mount a brief AR calibration step:
   `const ar = useARScale(); await ar.start(); const imgWcm = await ar.measure(); ar.stop();`
   then pass `imgWcm` into the same `navigation.setParams({ ... imgWcm })` sink
   `ReviewMealScreen` reads. (This is the part that needs a real device — ARKit
   raycasting does not run in the simulator.)
3. Android/ARCore equivalent (`Frame.hitTest` on a detected plane) is a parallel TODO; the
   JS hook already no-ops on Android until added.

## Verify

- `await NativeModules.ARScaleModule.isSupported()` → `true` on an ARKit device.
- After a `measure()` aimed at food on a table, `useARScale` returns a value inside the
  plausible **12–90 cm** window (out-of-range raycasts are gated to `null` in
  `useARScale`, **not** clamped), and the backend prompt carries `"img_w_cm": <measured>`.
