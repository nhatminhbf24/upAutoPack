import { DEFAULT_SIZE_PRESETS, SizePreset } from '../types';

/**
 * Finds the preset in DEFAULT_SIZE_PRESETS with the closest aspect ratio and dimensions
 * to the input image dimensions (imgWidth x imgHeight).
 */
export function findClosestPreset(
  imgWidth: number,
  imgHeight: number,
  customPresets?: SizePreset[]
): SizePreset {
  const presetsToSearch = customPresets && customPresets.length > 0
    ? [...customPresets, ...DEFAULT_SIZE_PRESETS]
    : DEFAULT_SIZE_PRESETS;

  if (!imgWidth || !imgHeight || imgWidth <= 0 || imgHeight <= 0) {
    return DEFAULT_SIZE_PRESETS[2]; // Default: 6x9 cm
  }

  const imgAspect = imgWidth / imgHeight;
  const isImagePortrait = imgHeight >= imgWidth;

  let bestPreset = presetsToSearch[0];
  let minDiffScore = Number.MAX_VALUE;

  for (const preset of presetsToSearch) {
    // Determine the preset's orientation aspect ratio
    const presetAspect = preset.width / preset.height;
    const isPresetPortrait = preset.height >= preset.width;

    // Penalty if orientation (portrait vs landscape) doesn't match
    const orientationPenalty = isImagePortrait === isPresetPortrait ? 0 : 0.6;

    // Aspect ratio difference score (log ratio or absolute relative diff)
    const aspectDiff = Math.abs(Math.log(imgAspect / presetAspect));

    // Combine diff score
    const totalScore = aspectDiff + orientationPenalty;

    if (totalScore < minDiffScore) {
      minDiffScore = totalScore;
      bestPreset = preset;
    }
  }

  return bestPreset;
}
