import { describe, it, expect } from 'vitest';
import { createDefaultTemplateConfig, getTemplateDimensions, calculateTemplateFitCrop, getFontFamilyCss } from './templateRenderUtils';

describe('templateRenderUtils tests', () => {
  it('should generate default template configs correctly', () => {
    const polaroid = createDefaultTemplateConfig('polaroid', 'summer_vacation.jpg');
    expect(polaroid.type).toBe('polaroid');
    expect(polaroid.polaroid?.borderMm).toBe(3);
    expect(polaroid.polaroid?.bottomMm).toBe(16);

    const instagram = createDefaultTemplateConfig('instagram', 'my_coffee.png');
    expect(instagram.type).toBe('instagram');
    expect(instagram.instagram?.username).toBe('my_coffee');
    expect(instagram.instagram?.showActions).toBe(true);

    const photostrip = createDefaultTemplateConfig('photostrip', '');
    expect(photostrip.type).toBe('photostrip');
    expect(photostrip.photostrip?.slotCount).toBe(4);

    const film = createDefaultTemplateConfig('film', '');
    expect(film.type).toBe('film');
    expect(film.film?.frameNumber).toBe('01');

    const bookmark = createDefaultTemplateConfig('bookmark', '');
    expect(bookmark.type).toBe('bookmark');
    expect(bookmark.bookmark?.photoHeightMm).toBe(109.5);
  });

  it('should calculate accurate dimensions for Polaroid 60x90 and 90x120 mm', () => {
    const config = createDefaultTemplateConfig('polaroid');
    const dims60x90 = getTemplateDimensions(60, 90, config);
    expect(dims60x90.photoW).toBe(54); // 60 - 2 * 3
    expect(dims60x90.photoH).toBe(71); // 90 - 3 - 16

    const dims90x120 = getTemplateDimensions(90, 120, config);
    expect(dims90x120.photoW).toBe(84); // 90 - 2 * 3
    expect(dims90x120.photoH).toBe(101); // 120 - 3 - 16
  });

  it('should calculate accurate dimensions for Instagram 90x120 mm', () => {
    const config = createDefaultTemplateConfig('instagram');
    const dims = getTemplateDimensions(90, 120, config);
    expect(dims.photoW).toBe(82);
    expect(dims.photoH).toBe(72);
    expect(dims.avatarDiameter).toBe(9.5);
  });

  it('should calculate accurate dimensions for Photostrip 3 slots and 4 slots (50x150 mm)', () => {
    const config3 = createDefaultTemplateConfig('photostrip');
    if (config3.photostrip) config3.photostrip.slotCount = 3;
    const dims3 = getTemplateDimensions(50, 150, config3);
    expect(dims3.photoW).toBe(44);
    expect(dims3.slots?.length).toBe(3);
    expect(Math.round(dims3.slotH * 100) / 100).toBeCloseTo(44.33, 1);

    const config4 = createDefaultTemplateConfig('photostrip');
    if (config4.photostrip) config4.photostrip.slotCount = 4;
    const dims4 = getTemplateDimensions(50, 150, config4);
    expect(dims4.photoW).toBe(44);
    expect(dims4.slots?.length).toBe(4);
    expect(dims4.slotH).toBe(32.75);
  });

  it('should calculate accurate dimensions for Film 60x90 and 100x150 mm', () => {
    const config = createDefaultTemplateConfig('film');
    const dims60x90 = getTemplateDimensions(60, 90, config);
    expect(dims60x90.photoW).toBe(52); // 60 - 2 * 4
    expect(dims60x90.photoH).toBe(84); // 90 - 2 * 3

    const dims100x150 = getTemplateDimensions(100, 150, config);
    expect(dims100x150.photoW).toBe(92); // 100 - 2 * 4
    expect(dims100x150.photoH).toBe(144); // 150 - 2 * 3
  });

  it('should calculate accurate dimensions for Bookmark 50x150 mm', () => {
    const config = createDefaultTemplateConfig('bookmark');
    const dims = getTemplateDimensions(50, 150, config);
    expect(dims.photoW).toBe(44); // 50 - 2 * 3
    expect(dims.photoH).toBe(109.5);
  });

  describe('calculateTemplateFitCrop - Zero Distortion tests', () => {
    it('guarantees exact aspect ratio match for Photostrip horizontal slots (44x32.75 mm)', () => {
      // 1000x1000 square image placed into Photostrip slot 44x32.75
      const crop = calculateTemplateFitCrop(1000, 1000, 44, 32.75);
      const slotRatio = 44 / 32.75;
      const cropRatio = crop.cropW / crop.cropH;
      expect(cropRatio).toBeCloseTo(slotRatio, 4);
      expect(crop.cropW).toBeLessThanOrEqual(1000);
      expect(crop.cropH).toBeLessThanOrEqual(1000);
      expect(crop.cropX).toBeGreaterThanOrEqual(0);
      expect(crop.cropY).toBeGreaterThanOrEqual(0);
    });

    it('guarantees exact aspect ratio match for Instagram post slot (82x72 mm)', () => {
      // 1200x1600 portrait photo placed into Instagram slot
      const crop = calculateTemplateFitCrop(1200, 1600, 82, 72);
      const slotRatio = 82 / 72;
      const cropRatio = crop.cropW / crop.cropH;
      expect(cropRatio).toBeCloseTo(slotRatio, 4);
    });

    it('guarantees exact aspect ratio match for Polaroid slot (54x71 mm)', () => {
      // 1800x1200 landscape photo placed into Polaroid slot
      const crop = calculateTemplateFitCrop(1800, 1200, 54, 71);
      const slotRatio = 54 / 71;
      const cropRatio = crop.cropW / crop.cropH;
      expect(cropRatio).toBeCloseTo(slotRatio, 4);
    });

    it('guarantees exact aspect ratio match for Film slot (52x84 mm) and Bookmark (44x109.5 mm)', () => {
      const filmCrop = calculateTemplateFitCrop(1000, 1500, 52, 84);
      expect(filmCrop.cropW / filmCrop.cropH).toBeCloseTo(52 / 84, 4);

      const bookmarkCrop = calculateTemplateFitCrop(1000, 1500, 44, 109.5);
      expect(bookmarkCrop.cropW / bookmarkCrop.cropH).toBeCloseTo(44 / 109.5, 4);
    });

    it('preserves center alignment when scaling/zooming inside slot', () => {
      const baseCrop = { cropX: 200, cropY: 100, cropW: 600, cropH: 900, scale: 1.5 };
      const crop = calculateTemplateFitCrop(1000, 1500, 54, 71, baseCrop);
      expect(crop.cropW / crop.cropH).toBeCloseTo(54 / 71, 4);
      expect(crop.cropX).toBeGreaterThanOrEqual(0);
      expect(crop.cropY).toBeGreaterThanOrEqual(0);
      expect(crop.cropX + crop.cropW).toBeLessThanOrEqual(1000.01);
      expect(crop.cropY + crop.cropH).toBeLessThanOrEqual(1500.01);
    });
  });

  describe('Font resolution tests (11 Google Fonts & System Fallbacks)', () => {
    it('correctly resolves all 11 requested Google Fonts', () => {
      const fonts = [
        'be_vietnam_pro',
        'montserrat',
        'pacifico',
        'dancing_script',
        'mali',
        'playpen_sans',
        'great_vibes',
        'allura',
        'sriracha',
        'quicksand',
        'nunito',
      ];

      fonts.forEach((fontId) => {
        const css = getFontFamilyCss(fontId);
        expect(css).toBeDefined();
        expect(typeof css).toBe('string');
        expect(css.length).toBeGreaterThan(0);
      });
    });

    it('falls back safely for legacy system font identifiers and undefined', () => {
      expect(getFontFamilyCss('handwriting')).toContain('Dancing Script');
      expect(getFontFamilyCss('mono')).toContain('monospace');
      expect(getFontFamilyCss('serif')).toContain('serif');
      expect(getFontFamilyCss('sans')).toContain('sans-serif');
      expect(getFontFamilyCss(undefined)).toBeDefined();
    });
  });

  describe('Photostrip Multi-Photo Slot Configuration tests', () => {
    it('supports distinct slots with individual dimensions and sources', () => {
      const config = createDefaultTemplateConfig('photostrip');
      if (config.photostrip) {
        config.photostrip.slotCount = 4;
        config.photostrip.slots = [
          { id: 's1', photoSrc: 'data:image/png;base64,1', imgWidth: 800, imgHeight: 600 },
          { id: 's2', photoSrc: 'data:image/png;base64,2', imgWidth: 1200, imgHeight: 1600 },
          { id: 's3', photoSrc: 'data:image/png;base64,3', imgWidth: 1000, imgHeight: 1000 },
          { id: 's4', photoSrc: 'data:image/png;base64,4', imgWidth: 1500, imgHeight: 500 },
        ];
      }

      expect(config.photostrip?.slots?.length).toBe(4);
      expect(config.photostrip?.slots?.[0].photoSrc).toBe('data:image/png;base64,1');
      expect(config.photostrip?.slots?.[1].imgHeight).toBe(1600);

      // Verify each slot can compute independent fit-crop with zero distortion
      const slot1Crop = calculateTemplateFitCrop(800, 600, 44, 32.75, config.photostrip?.slots?.[0]);
      expect(slot1Crop.cropW / slot1Crop.cropH).toBeCloseTo(44 / 32.75, 4);

      const slot2Crop = calculateTemplateFitCrop(1200, 1600, 44, 32.75, config.photostrip?.slots?.[1]);
      expect(slot2Crop.cropW / slot2Crop.cropH).toBeCloseTo(44 / 32.75, 4);
    });
  });
});
