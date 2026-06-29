//
//  MetrifulLidarModule.swift
//  On-demand LiDAR depth measurement + on-device portion geometry for food-calorie correction.
//
//  Why a module (not a VisionCamera frame-processor plugin): VisionCamera does NOT pipe AVDepthData
//  into frame processors, so the old GetDepthAtCenterPlugin could never read real depth. Meal logging
//  only needs ONE depth reading at capture time, so we run a brief dedicated depth session and return:
//    - distanceCm + fx  -> JS computes img_w_cm (scale hint), AND
//    - volume_cm3, area_cm2, mean_h_cm  -> the depth features the calorie corrector consumes.
//  The geometry mirrors the offline pipeline (geom_depth.py): estimate the table plane from the depth
//  border, integrate height-above-plane * per-pixel area over the central food region.
//
//  Auto-linked by Expo (use_expo_modules! in the Podfile). Requires a LiDAR device (iPhone 12 Pro+)
//  and iOS 15.4+ for builtInLiDARDepthCamera.
//

import ExpoModulesCore
import AVFoundation
import CoreVideo

public class MetrifulLidarModule: Module {
  private let measurer = LidarMeasurer()

  public func definition() -> ModuleDefinition {
    Name("MetrifulLidar")

    Function("isAvailable") { () -> Bool in
      LidarMeasurer.deviceAvailable()
    }

    // Brief depth capture. Resolves the depth reading + portion geometry, or { hasDepth: false }.
    // Never rejects — callers fall back to the backend's default plate-width assumption.
    AsyncFunction("measure") { (promise: Promise) in
      self.measurer.measure { result in promise.resolve(result) }
    }
  }
}

/// Runs a short dedicated AVCaptureSession on the LiDAR depth camera and, per frame, computes the
/// center distance + a geometric portion estimate (volume/area/height). Returns the richest frame.
final class LidarMeasurer: NSObject, AVCaptureDepthDataOutputDelegate {
  private let session = AVCaptureSession()
  private let depthOutput = AVCaptureDepthDataOutput()
  private let queue = DispatchQueue(label: "com.elia.aurafit.lidar")
  private var frames: [[String: Any]] = []
  private var done: (([String: Any]) -> Void)?
  private let targetFrames = 6

  static func deviceAvailable() -> Bool {
    if #available(iOS 15.4, *) {
      return AVCaptureDevice.default(.builtInLiDARDepthCamera, for: .video, position: .back) != nil
    }
    return false
  }

  func measure(_ completion: @escaping ([String: Any]) -> Void) {
    queue.async {
      guard #available(iOS 15.4, *),
            let device = AVCaptureDevice.default(.builtInLiDARDepthCamera, for: .video, position: .back) else {
        DispatchQueue.main.async { completion(["hasDepth": false, "reason": "no_lidar"]) }
        return
      }
      self.frames.removeAll()
      self.done = completion
      do {
        self.session.beginConfiguration()
        self.session.inputs.forEach { self.session.removeInput($0) }
        self.session.outputs.forEach { self.session.removeOutput($0) }

        let input = try AVCaptureDeviceInput(device: device)
        guard self.session.canAddInput(input) else { throw NSError(domain: "lidar", code: 1) }
        self.session.addInput(input)

        guard self.session.canAddOutput(self.depthOutput) else { throw NSError(domain: "lidar", code: 2) }
        self.session.addOutput(self.depthOutput)
        self.depthOutput.isFilteringEnabled = true
        self.depthOutput.setDelegate(self, callbackQueue: self.queue)

        if let fmt = device.activeFormat.supportedDepthDataFormats.first(where: {
          CMFormatDescriptionGetMediaSubType($0.formatDescription) == kCVPixelFormatType_DepthFloat32
        }) {
          try device.lockForConfiguration()
          device.activeDepthDataFormat = fmt
          device.unlockForConfiguration()
        }
        if let conn = self.depthOutput.connection(with: .depthData) { conn.isEnabled = true }

        self.session.commitConfiguration()
        self.session.startRunning()
        self.queue.asyncAfter(deadline: .now() + 2.0) { [weak self] in self?.finish() }
      } catch {
        self.session.commitConfiguration()
        DispatchQueue.main.async { completion(["hasDepth": false, "reason": "config_error"]) }
        self.done = nil
      }
    }
  }

  func depthDataOutput(_ output: AVCaptureDepthDataOutput,
                       didOutput depthData: AVDepthData,
                       timestamp: CMTime,
                       connection: AVCaptureConnection) {
    let converted = depthData.depthDataType == kCVPixelFormatType_DepthFloat32
      ? depthData
      : depthData.converting(toDepthDataType: kCVPixelFormatType_DepthFloat32)

    let map = converted.depthDataMap
    CVPixelBufferLockBaseAddress(map, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(map, .readOnly) }

    let w = CVPixelBufferGetWidth(map)
    let h = CVPixelBufferGetHeight(map)
    guard w > 0, h > 0, let base = CVPixelBufferGetBaseAddress(map) else { return }
    let rowBytes = CVPixelBufferGetBytesPerRow(map)

    // fx (px) scaled to depth-map width.
    var fx: Float = 0
    if let cal = converted.cameraCalibrationData {
      let ref = cal.intrinsicMatrixReferenceDimensions
      let fxRef = cal.intrinsicMatrix.columns.0.x
      fx = ref.width > 0 ? fxRef * Float(w) / Float(ref.width) : fxRef
    }
    guard fx > 0 else { return }

    @inline(__always) func depthAt(_ x: Int, _ y: Int) -> Float {
      base.advanced(by: y * rowBytes).assumingMemoryBound(to: Float32.self)[x]
    }

    // --- table plane = median of a depth border ring (the plate/surface) ---
    let b = max(2, min(w, h) / 16)
    var border: [Float] = []
    for y in 0..<h {
      let topBottom = y < b || y >= h - b
      for x in 0..<w where (topBottom || x < b || x >= w - b) {
        let d = depthAt(x, y); if d.isFinite && d > 0 { border.append(d) }
      }
    }
    guard border.count > 50 else { return }
    border.sort(); let plane = border[border.count / 2]   // meters

    // --- center distance (median of small center window) ---
    let cx = w / 2, cy = h / 2, r = max(1, min(w, h) / 32)
    var center: [Float] = []
    for y in max(0, cy - r)...min(h - 1, cy + r) {
      for x in max(0, cx - r)...min(w - 1, cx + r) {
        let d = depthAt(x, y); if d.isFinite && d > 0 { center.append(d) }
      }
    }
    guard !center.isEmpty else { return }
    center.sort(); let distM = center[center.count / 2]

    // --- portion geometry over the central 80% (mirror of geom_depth.py) ---
    let x0 = w / 10, x1 = w - w / 10, y0 = h / 10, y1 = h - h / 10
    var volCm3: Float = 0, areaCm2: Float = 0, hSumCm: Float = 0, npx = 0
    for y in y0..<y1 {
      for x in x0..<x1 {
        let d = depthAt(x, y); if !(d.isFinite && d > 0) { continue }
        let heightM = plane - d                       // food rises toward camera (smaller depth)
        if heightM > 0.005 {                          // > 0.5 cm above plane = food
          let pxLin = d / fx                           // meters per pixel at this depth
          let pxAreaM2 = pxLin * pxLin
          volCm3 += heightM * pxAreaM2 * 1_000_000     // m^3 -> cm^3
          areaCm2 += pxAreaM2 * 10_000                 // m^2 -> cm^2
          hSumCm += heightM * 100                       // m -> cm
          npx += 1
        }
      }
    }
    let meanHcm = npx > 0 ? hSumCm / Float(npx) : 0

    frames.append([
      "distanceCm": distM * 100.0,
      "distance": distM,
      "fx": fx,
      "width": w,
      "volumeCm3": volCm3,
      "areaCm2": areaCm2,
      "meanHCm": meanHcm,
      "npx": npx,
    ])
    if frames.count >= targetFrames { finish() }
  }

  /// Return the frame with the most food pixels (most complete view); never throws.
  private func finish() {
    guard let completion = done else { return }
    done = nil
    if session.isRunning { session.stopRunning() }
    guard let best = frames.max(by: { ($0["npx"] as? Int ?? 0) < ($1["npx"] as? Int ?? 0) }) else {
      DispatchQueue.main.async { completion(["hasDepth": false, "reason": "no_samples"]) }
      return
    }
    var result = best
    result["hasDepth"] = true
    result["confidence"] = 0.95
    result["accuracy"] = "absolute"
    DispatchQueue.main.async { completion(result) }
  }
}
