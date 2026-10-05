import { describe, it, expect } from 'vitest';
import { calculateAlignmentSnap, SnapTarget } from './alignmentGuides';

describe('Smart Magnetic Snapping (calculateAlignmentSnap)', () => {
  const pageW = 210;
  const pageH = 297;
  const margin = 5;
  const gap = 2;

  it('should snap to left margin when within 3mm threshold', () => {
    // Current photo is at x=6.2mm (within 3mm of left margin=5mm)
    const current = { x: 6.2, y: 50, w: 60, h: 90 };
    const result = calculateAlignmentSnap(current, [], pageW, pageH, margin, gap);

    expect(result.hasSnappedX).toBe(true);
    expect(result.x).toBe(5); // Snapped to left margin
    expect(result.guides.some((g) => g.type === 'vertical')).toBe(true);
  });

  it('should not snap if position is far beyond threshold', () => {
    const current = { x: 35, y: 50, w: 60, h: 90 };
    const result = calculateAlignmentSnap(current, [], pageW, pageH, margin, gap);

    expect(result.hasSnappedX).toBe(false);
    expect(result.hasSnappedY).toBe(false);
    expect(result.x).toBe(35);
    expect(result.y).toBe(50);
    expect(result.guides.length).toBe(0);
  });

  it('should snap to center of the page', () => {
    // Center of page is 105mm. Photo width is 60mm. Center aligned x = 105 - 30 = 75mm.
    const current = { x: 76.1, y: 50, w: 60, h: 90 };
    const result = calculateAlignmentSnap(current, [], pageW, pageH, margin, gap);

    expect(result.hasSnappedX).toBe(true);
    expect(result.x).toBe(75);
    expect(result.guides.some((g) => g.isCenter)).toBe(true);
  });

  it('should snap to neighboring photo borders', () => {
    const existingNeighbor: SnapTarget = {
      id: 'photo_1',
      instanceIndex: 0,
      x: 10,
      y: 10,
      w: 60,
      h: 90,
    };

    // User is dragging photo to y=10.8mm (close to neighbor top border at y=10)
    const current = { x: 80, y: 10.8, w: 60, h: 90 };
    const result = calculateAlignmentSnap(current, [existingNeighbor], pageW, pageH, margin, gap);

    expect(result.hasSnappedY).toBe(true);
    expect(result.y).toBe(10);
    expect(result.guides.some((g) => g.type === 'horizontal')).toBe(true);
  });
});
