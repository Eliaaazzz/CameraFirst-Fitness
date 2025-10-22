import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export type CompressOptions = {
  maxDimension?: number; // max width or height
  quality?: number; // 0..1
  stripExif?: boolean; // reserved for future use
};

export const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });

export const getFileSize = async (uri: string): Promise<number> => {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true });
    return (info.size as number) ?? 0;
  } catch {
    return 0;
  }
};

export const compressImage = async (
  uri: string,
  { maxDimension = 1024, quality = 0.8 }: CompressOptions = {},
): Promise<{ uri: string; size: number }> => {
  const { width, height } = await getImageDimensions(uri);
  const largest = Math.max(width, height);
  const resize = largest > maxDimension
    ? width >= height
      ? { width: maxDimension }
      : { height: maxDimension }
    : undefined;

  const actions: ImageManipulator.Action[] = [];
  if (resize) actions.push({ resize });

  const result = await ImageManipulator.manipulateAsync(
    uri,
    actions,
    { compress: quality, format: ImageManipulator.SaveFormat.JPEG },
  );

  const size = await getFileSize(result.uri);
  return { uri: result.uri, size };
};

export const convertToBase64 = async (uri: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:image/jpeg;base64,${base64}`;
};

