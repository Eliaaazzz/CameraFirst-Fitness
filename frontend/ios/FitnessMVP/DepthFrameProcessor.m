/**
 * DepthFrameProcessor.m
 *
 * Objective-C registration for the Swift frame processor plugin.
 * Required for VisionCamera to discover and load the plugin.
 */

#import <Foundation/Foundation.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

// Forward declaration of Swift class
@interface DepthFrameProcessorPlugin : FrameProcessorPlugin
@end

// Register the plugin when the module loads
@interface DepthFrameProcessorPluginLoader : NSObject
@end

@implementation DepthFrameProcessorPluginLoader

+ (void)load {
  // Register on main queue to ensure VisionCamera is initialized
  dispatch_async(dispatch_get_main_queue(), ^{
    [FrameProcessorPluginRegistry addFrameProcessorPlugin:@"getDepthAtCenter"
                                          withInitializer:^FrameProcessorPlugin* _Nonnull(VisionCameraProxyHolder* _Nonnull proxy,
                                                                                           NSDictionary* _Nullable options) {
      return [[DepthFrameProcessorPlugin alloc] initWithProxy:proxy withOptions:options];
    }];
  });
}

@end
