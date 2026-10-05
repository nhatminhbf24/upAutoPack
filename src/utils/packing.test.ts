import { describe, it, expect } from 'vitest';
import { packImagesToPages, A4_WIDTH_MM, A4_HEIGHT_MM } from './packing';
import { PhotoItem, LayoutSettings } from '../types';

const mockDefaultSettings: LayoutSettings = {
  margin: 5,
  gap: 2,
  cutLines: false,
  smartCrop: false,
  autoNesting: false,
  paperOrientation: 'portrait',
  duplexMode: false,
};

function createMockPhoto(id: string, width = 60, height = 90, qty = 1): PhotoItem {
  return {
    id,
    name: `photo_${id}.jpg`,
    originalSrc: 'data:image/jpeg;base64,mock',
    imgWidth: 600,
    imgHeight: 900,
    targetWidth: width,
    targetHeight: height,
    shape: 'rect',
    qty,
    scale: 1,
    cropX: 0,
    cropY: 0,
    cropW: 600,
    cropH: 900,
    rotation: 0,
  };
}

describe('Bin Packing Engine (packImagesToPages)', () => {
  it('should return empty pages array when input photos is empty', () => {
    const result = packImagesToPages([], mockDefaultSettings);
    expect(result).toEqual([]);
  });

  it('should place a single photo with correct margins and dimensions', () => {
    const photos = [createMockPhoto('1', 60, 90, 1)];
    const pages = packImagesToPages(photos, mockDefaultSettings);

    expect(pages.length).toBe(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].items.length).toBe(1);

    const item = pages[0].items[0];
    expect(item.id).toBe('1');
    expect(item.x).toBe(mockDefaultSettings.margin);
    expect(item.y).toBe(mockDefaultSettings.margin);
    expect(item.w).toBe(60);
    expect(item.h).toBe(90);
  });

  it('should respect quantity (qty) and instantiate multiple copies', () => {
    const photos = [createMockPhoto('1', 50, 70, 3)];
    const pages = packImagesToPages(photos, mockDefaultSettings);

    const totalItems = pages.reduce((acc, p) => acc + p.items.length, 0);
    expect(totalItems).toBe(3);
    expect(pages[0].items[0].instanceIndex).toBe(0);
    expect(pages[0].items[1].instanceIndex).toBe(1);
    expect(pages[0].items[2].instanceIndex).toBe(2);
  });

  it('should paginate to Page 2 when photos exceed A4 capacity', () => {
    // A4 is 210 x 297 mm. A 100 x 140 mm photo takes a large portion. 6 photos will exceed 1 page.
    const photos = [createMockPhoto('large', 100, 140, 6)];
    const pages = packImagesToPages(photos, mockDefaultSettings);

    expect(pages.length).toBeGreaterThan(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[1].pageNumber).toBe(2);
  });

  it('should adapt to landscape paper orientation', () => {
    const landscapeSettings: LayoutSettings = {
      ...mockDefaultSettings,
      paperOrientation: 'landscape',
    };

    const photos = [createMockPhoto('1', 60, 90, 1)];
    const pages = packImagesToPages(photos, landscapeSettings);

    expect(pages.length).toBe(1);
    // In landscape, page width is 297 mm and page height is 210 mm
    const item = pages[0].items[0];
    expect(item.x + item.w).toBeLessThanOrEqual(A4_HEIGHT_MM); // 297mm
  });

  it('should horizontally mirror even pages when duplexMode is enabled', () => {
    const duplexSettings: LayoutSettings = {
      ...mockDefaultSettings,
      duplexMode: true,
    };

    // Force at least 2 pages
    const photos = [createMockPhoto('item', 150, 200, 2)];
    const pages = packImagesToPages(photos, duplexSettings);

    expect(pages.length).toBe(2);
    const p1Item = pages[0].items[0];
    const p2Item = pages[1].items[0];

    // Page 2 (even page) should be mirrored across A4_WIDTH_MM: x' = 210 - (x + w)
    const expectedMirroredX = Math.round((A4_WIDTH_MM - (p1Item.x + p1Item.w)) * 100) / 100;
    expect(p2Item.x).toBe(expectedMirroredX);
  });
});
