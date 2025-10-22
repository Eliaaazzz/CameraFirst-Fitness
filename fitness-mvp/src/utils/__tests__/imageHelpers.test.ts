import { compressImage, getFileSize } from '@/utils/imageHelpers';

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(async (uri: string) => ({ uri: uri.replace('.jpg', '.compressed.jpg') })),
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(async (uri: string) => ({ size: uri.includes('compressed') ? 150000 : 4000000 })),
  readAsStringAsync: jest.fn(async () => 'ZmFrZUJhc2U2NA=='),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('react-native', () => ({
  Image: {
    getSize: (uri: string, success: (w: number, h: number) => void) => success(3000, 2000),
  },
}));

describe('imageHelpers', () => {
  it('compresses large images down to target', async () => {
    const result = await compressImage('file:///photo.jpg', { maxDimension: 1024, quality: 0.8 });
    expect(result.uri).toContain('compressed');
    const size = await getFileSize(result.uri);
    expect(size).toBeLessThan(2000000);
  });
});
