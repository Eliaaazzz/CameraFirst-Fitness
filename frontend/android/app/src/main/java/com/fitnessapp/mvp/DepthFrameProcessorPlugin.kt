/**
 * DepthFrameProcessorPlugin.kt
 *
 * Native Android Frame Processor Plugin for react-native-vision-camera
 * Reads ToF (Time-of-Flight) depth data from compatible devices.
 *
 * Supported devices:
 * - Samsung Galaxy S20 Ultra, S21 Ultra, S22 Ultra, S23 Ultra, S24 Ultra
 * - Google Pixel 4, 4 XL (ToF sensor)
 * - Huawei P40 Pro, Mate 40 Pro
 *
 * Usage in JS:
 *   const depth = getDepthAtCenter(frame);
 *   // Returns: { distance: 0.35, confidence: 0.90, hasDepth: true }
 */

package com.fitnessapp.mvp

import android.graphics.ImageFormat
import android.media.Image
import com.mrousavy.camera.frameprocessors.Frame
import com.mrousavy.camera.frameprocessors.FrameProcessorPlugin
import com.mrousavy.camera.frameprocessors.VisionCameraProxy
import java.nio.ShortBuffer

class DepthFrameProcessorPlugin(proxy: VisionCameraProxy, options: Map<String, Any>?) :
    FrameProcessorPlugin() {

    companion object {
        private const val TAG = "DepthFrameProcessor"

        /**
         * Register this plugin with VisionCamera
         */
        @JvmStatic
        fun register(proxy: VisionCameraProxy) {
            proxy.addFrameProcessorPlugin("getDepthAtCenter", ::DepthFrameProcessorPlugin)
        }
    }

    override fun callback(frame: Frame, arguments: Map<String, Any>?): Any? {
        val image = frame.image

        // Check if this is a depth frame
        // Depth images typically use DEPTH16 format (16-bit depth values)
        if (image.format != ImageFormat.DEPTH16 && image.format != ImageFormat.DEPTH_POINT_CLOUD) {
            return mapOf(
                "hasDepth" to false,
                "distance" to null,
                "confidence" to 0.0,
                "error" to "No depth data in frame (format: ${image.format})"
            )
        }

        return try {
            val depthResult = readDepthAtCenter(image)
            depthResult
        } catch (e: Exception) {
            mapOf(
                "hasDepth" to false,
                "distance" to null,
                "confidence" to 0.0,
                "error" to "Failed to read depth: ${e.message}"
            )
        }
    }

    /**
     * Read depth value at the center of the image
     *
     * DEPTH16 format:
     * - Each pixel is a 16-bit unsigned short
     * - Upper 3 bits: confidence (0-7, where 7 is highest confidence)
     * - Lower 13 bits: depth in millimeters (0-8191mm range)
     */
    private fun readDepthAtCenter(image: Image): Map<String, Any?> {
        val width = image.width
        val height = image.height
        val centerX = width / 2
        val centerY = height / 2

        // Get the depth plane
        val plane = image.planes[0]
        val buffer = plane.buffer

        // Calculate pixel position
        val rowStride = plane.rowStride
        val pixelStride = plane.pixelStride

        // Read the 16-bit depth value at center
        val offset = centerY * rowStride + centerX * pixelStride
        buffer.position(offset)

        val depthRaw = buffer.short.toInt() and 0xFFFF

        // Extract confidence (upper 3 bits)
        val confidenceValue = (depthRaw shr 13) and 0x7
        val confidence = confidenceValue / 7.0 // Normalize to 0-1

        // Extract depth in mm (lower 13 bits)
        val depthMm = depthRaw and 0x1FFF

        // Convert to meters
        val depthMeters = depthMm / 1000.0

        // Check for invalid values
        if (depthMm == 0 || depthMm == 0x1FFF) {
            return mapOf(
                "hasDepth" to true,
                "distance" to null,
                "distanceCm" to null,
                "confidence" to 0.0,
                "error" to "Invalid depth value (out of range or no return)",
                "width" to width,
                "height" to height
            )
        }

        return mapOf(
            "hasDepth" to true,
            "distance" to depthMeters,
            "distanceCm" to depthMm / 10.0, // mm to cm
            "confidence" to confidence,
            "width" to width,
            "height" to height,
            "rawValue" to depthRaw,
            "accuracy" to if (confidence > 0.7) "high" else if (confidence > 0.4) "medium" else "low"
        )
    }
}
