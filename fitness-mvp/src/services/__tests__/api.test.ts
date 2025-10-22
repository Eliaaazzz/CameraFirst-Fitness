import { __testables } from '@/services/api';

describe('buildImageFormData', () => {
  const { buildImageFormData } = __testables;

  it('appends image and metadata payload', () => {
    const formData = buildImageFormData('file:///tmp/photo.jpg', 'image', {
      level: 'beginner',
      durationMinutes: 45,
      equipment: ['bands', 'mat'],
    });

    expect(formData.get('level')).toBe('beginner');
    expect(formData.get('durationMinutes')).toBe('45');
    expect(formData.get('equipment')).toBe(JSON.stringify(['bands', 'mat']));
    expect(formData.get('image')).toBeTruthy();
  });

  it('falls back to default filename when missing', () => {
    const formData = buildImageFormData('file:///tmp/upload', 'photo');
    const imageField = formData.get('photo');

    expect(imageField).toBeTruthy();
  });
});
