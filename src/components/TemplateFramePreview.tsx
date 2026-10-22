import React from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Play,
  SkipBack,
  SkipForward,
  Shuffle,
  Plane,
} from 'lucide-react';
import { PhotoItem, TemplateConfig } from '../types';
import { getTemplateDimensions, getFontFamilyCss, calculateTemplateFitCrop, isDarkColor } from '../utils/templateRenderUtils';

interface TemplateFramePreviewProps {
  photo: PhotoItem;
  displaySrc?: string;
  className?: string;
  percentW?: number;
  percentH?: number;
  percentX?: number;
  percentY?: number;
  frameIndex?: number;
}

export const TemplateFramePreview: React.FC<TemplateFramePreviewProps> = ({
  photo,
  displaySrc,
  className = '',
  percentW,
  percentH,
  percentX,
  percentY,
  frameIndex = 0,
}) => {
  const imgSrc = displaySrc || photo.previewSrc || photo.originalSrc;
  const config = photo.templateConfig;

  // Calculate default percentages if not provided
  const imgW = photo.imgWidth || 100;
  const imgH = photo.imgHeight || 100;
  const scale = photo.scale || 1;
  const cropW = (photo.cropW || imgW) / scale;
  const cropH = (photo.cropH || imgH) / scale;

  const effPercentW = percentW ?? (imgW / cropW) * 100;
  const effPercentH = percentH ?? (imgH / cropH) * 100;
  const effPercentX = percentX ?? (-(photo.cropX || 0) / cropW) * 100;
  const effPercentY = percentY ?? (-(photo.cropY || 0) / cropH) * 100;

  if (!config || config.type === 'none') {
    return (
      <img
        src={imgSrc}
        alt={photo.name}
        draggable={false}
        className={`absolute max-w-none pointer-events-none transition-none ${className}`}
        style={{
          width: `${effPercentW}%`,
          height: `${effPercentH}%`,
          left: `${effPercentX}%`,
          top: `${effPercentY}%`,
        }}
      />
    );
  }

  const dims = getTemplateDimensions(photo.targetWidth, photo.targetHeight, config);
  const targetW = photo.targetWidth || 60;
  const targetH = photo.targetHeight || 90;

  // 1. Polaroid
  if (config.type === 'polaroid' && dims.type === 'polaroid') {
    const leftPercent = (dims.photoX / targetW) * 100;
    const topPercent = (dims.photoY / targetH) * 100;
    const widthPercent = (dims.photoW / targetW) * 100;
    const heightPercent = (dims.photoH / targetH) * 100;

    const fitCrop = calculateTemplateFitCrop(imgW, imgH, dims.photoW, dims.photoH, photo);
    const slotPercentW = (imgW / fitCrop.cropW) * 100;
    const slotPercentH = (imgH / fitCrop.cropH) * 100;
    const slotPercentX = (-fitCrop.cropX / fitCrop.cropW) * 100;
    const slotPercentY = (-fitCrop.cropY / fitCrop.cropH) * 100;

    return (
      <div
        className="w-full h-full relative overflow-hidden select-none"
        style={{ backgroundColor: config.frameColor || '#ffffff' }}
      >
        {/* Photo Box */}
        <div
          className="absolute overflow-hidden shadow-2xs pointer-events-none"
          style={{
            left: `${leftPercent}%`,
            top: `${topPercent}%`,
            width: `${widthPercent}%`,
            height: `${heightPercent}%`,
            backgroundColor: '#f1f5f9',
          }}
        >
          <img
            src={imgSrc}
            alt={photo.name}
            draggable={false}
            className="absolute max-w-none pointer-events-none transition-none"
            style={{
              width: `${slotPercentW}%`,
              height: `${slotPercentH}%`,
              left: `${slotPercentX}%`,
              top: `${slotPercentY}%`,
            }}
          />
        </div>

        {/* Polaroid Caption Footer */}
        <div
          className="absolute left-0 right-0 bottom-0 flex flex-col justify-center px-2 pointer-events-none"
          style={{
            height: `${(dims.bottom / targetH) * 100}%`,
            textAlign: config.textAlign || 'center',
            color: config.textColor || (isDarkColor(config.frameColor) ? '#f8fafc' : '#1e293b'),
            fontFamily: getFontFamilyCss(config.fontFamily),
          }}
        >
          {config.textLine1 && (
            <p
              className="font-semibold leading-tight truncate"
              style={{ fontSize: `clamp(9px, 3.5cqi, ${config.fontSizePt || 13}px)` }}
            >
              {config.textLine1}
            </p>
          )}
          {config.textLine2 && (
            <p
              className="text-xs leading-tight opacity-80 truncate mt-0.5"
              style={{ fontSize: `clamp(7px, 2.8cqi, ${(config.fontSizePt || 13) * 0.85}px)` }}
            >
              {config.textLine2}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 2. Instagram
  if (config.type === 'instagram' && dims.type === 'instagram') {
    const leftPercent = (dims.photoX / targetW) * 100;
    const topPercent = (dims.photoY / targetH) * 100;
    const widthPercent = (dims.photoW / targetW) * 100;
    const heightPercent = (dims.photoH / targetH) * 100;
    const headerHeightPercent = (dims.headerH / targetH) * 100;
    // Căn thụt lề chuẩn Instagram card, đảm bảo icon, avatar và text luôn nằm gọn gàng bên trong khung ảnh (hoặc cách mép 2.5% nếu chọn 0mm tràn viền)
    const insetPercent = dims.photoX > 0 ? Math.max(1, (1.2 / targetW) * 100) : 2.5;
    const contentPadLeft = leftPercent + insetPercent;
    const contentPadRight = leftPercent + insetPercent;

    const isDark = isDarkColor(config.frameColor);
    const textClass = isDark ? 'text-white' : 'text-slate-900';
    const borderClass = isDark ? 'border-white/10' : 'border-slate-100';
    const iconStroke = isDark ? 'text-white' : 'text-slate-900';
    const secondaryIcon = isDark ? 'text-slate-400' : 'text-slate-700';
    const hashtagClass = isDark ? 'text-blue-400' : 'text-blue-900/80';
    const dotsInactive = isDark ? 'bg-slate-600' : 'bg-slate-300';

    return (
      <div
        className="w-full h-full relative overflow-hidden select-none flex flex-col"
        style={{ backgroundColor: config.frameColor || '#ffffff' }}
      >
        {/* Instagram Header */}
        <div
          className={`w-full flex items-center justify-between pointer-events-none shrink-0 border-b ${borderClass}`}
          style={{
            height: `${headerHeightPercent}%`,
            paddingLeft: `${contentPadLeft}%`,
            paddingRight: `${contentPadRight}%`,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* Circular Avatar with Instagram story gradient ring */}
            <div
              className={`p-[1.5px] rounded-full shrink-0 ${
                config.instagram?.hasGradientRing !== false
                  ? 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]'
                  : 'bg-slate-200'
              }`}
            >
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white relative bg-slate-100 flex items-center justify-center">
                {config.instagram?.avatarType === 'custom' && config.instagram.avatarSrc ? (
                  <img src={config.instagram.avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                ) : config.instagram?.avatarType === 'initial' ? (
                  <span className="text-[11px] font-bold text-white bg-indigo-600 w-full h-full flex items-center justify-center">
                    {(config.instagram.username || 'D').charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <img
                    src={imgSrc}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Username */}
            <span className={`text-xs font-bold ${textClass} truncate`}>
              {config.instagram?.username || 'daudau_print'}
            </span>

            {/* Follow Button */}
            {config.instagram?.showFollowBtn && (
              <span className={`text-[9.5px] font-bold ${isDark ? 'text-blue-400 bg-blue-950/70 border-blue-800' : 'text-blue-600 bg-blue-50/90 border-blue-200'} px-2 py-0.5 rounded-md border ml-1`}>
                Theo dõi
              </span>
            )}
          </div>

          <MoreHorizontal className={`w-4 h-4 ${secondaryIcon} shrink-0`} />
        </div>

        {/* Main Photo Area */}
        {(() => {
          const fitCrop = calculateTemplateFitCrop(imgW, imgH, dims.photoW, dims.photoH, photo);
          const slotPercentW = (imgW / fitCrop.cropW) * 100;
          const slotPercentH = (imgH / fitCrop.cropH) * 100;
          const slotPercentX = (-fitCrop.cropX / fitCrop.cropW) * 100;
          const slotPercentY = (-fitCrop.cropY / fitCrop.cropH) * 100;

          return (
            <div
              className="relative overflow-hidden mx-auto shrink-0 bg-slate-100"
              style={{
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                marginTop: '1.5%',
              }}
            >
              <img
                src={imgSrc}
                alt={photo.name}
                draggable={false}
                className="absolute max-w-none pointer-events-none transition-none"
                style={{
                  width: `${slotPercentW}%`,
                  height: `${slotPercentH}%`,
                  left: `${slotPercentX}%`,
                  top: `${slotPercentY}%`,
                }}
              />
            </div>
          );
        })()}

        {/* Instagram Footer */}
        <div
          className="flex-1 py-1.5 flex flex-col justify-start pointer-events-none min-h-0"
          style={{
            paddingLeft: `${contentPadLeft}%`,
            paddingRight: `${contentPadRight}%`,
          }}
        >
          {config.instagram?.showActions !== false && (
            <div className={`flex items-center justify-between ${textClass} pt-1 pb-1`}>
              {/* Left group: Heart, Comment, Share */}
              <div className="flex items-center gap-3">
                <Heart
                  className={`w-5.5 h-5.5 transition-transform ${
                    config.instagram?.liked
                      ? 'text-[#ff3040] fill-[#ff3040]'
                      : `${iconStroke} stroke-[2]`
                  }`}
                />
                <MessageCircle className={`w-5.5 h-5.5 ${iconStroke} stroke-[2]`} />
                <Send className={`w-5.5 h-5.5 ${iconStroke} stroke-[2] -rotate-12 translate-y-[-1px]`} />
              </div>

              {/* Center Carousel dots */}
              <div className="flex items-center gap-1 opacity-70">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span className={`w-1.5 h-1.5 rounded-full ${dotsInactive}`}></span>
                <span className={`w-1.5 h-1.5 rounded-full ${dotsInactive}`}></span>
              </div>

              {/* Right Bookmark icon */}
              <Bookmark className={`w-5.5 h-5.5 ${iconStroke} stroke-[2]`} />
            </div>
          )}

          {/* Likes count */}
          <p className={`text-[10.5px] font-bold ${textClass} leading-tight pt-0.5`}>
            {config.instagram?.likesCount || '1,280 lượt thích'}
          </p>

          {/* Caption Lines */}
          <div
            className={`space-y-0.5 ${textClass} pt-0.5`}
            style={{ fontFamily: getFontFamilyCss(config.fontFamily || 'be_vietnam_pro') }}
          >
            {config.textLine1 && (
              <p className="text-[10px] font-medium leading-tight truncate">
                <span className="font-bold mr-1.5">{config.instagram?.username || 'daudau_print'}</span>
                {config.textLine1}
              </p>
            )}
            {config.textLine2 && (
              <p className={`text-[9px] ${hashtagClass} leading-tight truncate`}>
                {config.textLine2}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. Photostrip
  if (config.type === 'photostrip' && dims.type === 'photostrip') {
    return (
      <div
        className="w-full h-full relative overflow-hidden select-none"
        style={{
          backgroundColor: config.frameColor || '#ffffff',
        }}
      >
        {/* Photostrip Slots */}
        {dims.slots.map((slot, idx) => {
          const slotConfig = config.photostrip?.slots?.[idx];
          const slotSrc = slotConfig?.photoSrc || imgSrc;
          const slotImgW = slotConfig?.imgWidth || imgW;
          const slotImgH = slotConfig?.imgHeight || imgH;
          const slotFitCrop = calculateTemplateFitCrop(
            slotImgW,
            slotImgH,
            slot.w,
            slot.h,
            slotConfig || photo
          );
          const slotPercentW = (slotImgW / slotFitCrop.cropW) * 100;
          const slotPercentH = (slotImgH / slotFitCrop.cropH) * 100;
          const slotPercentX = (-slotFitCrop.cropX / slotFitCrop.cropW) * 100;
          const slotPercentY = (-slotFitCrop.cropY / slotFitCrop.cropH) * 100;

          return (
            <div
              key={idx}
              data-photostrip-slot={idx}
              className="absolute overflow-hidden bg-slate-100 rounded-2xs group/slot transition-all shadow-2xs"
              style={{
                left: `${(slot.x / targetW) * 100}%`,
                top: `${(slot.y / targetH) * 100}%`,
                width: `${(slot.w / targetW) * 100}%`,
                height: `${(slot.h / targetH) * 100}%`,
              }}
            >
              <img
                src={slotSrc}
                alt={slotConfig?.photoName || photo.name}
                draggable={false}
                className="absolute max-w-none pointer-events-none transition-none"
                style={{
                  width: `${slotPercentW}%`,
                  height: `${slotPercentH}%`,
                  left: `${slotPercentX}%`,
                  top: `${slotPercentY}%`,
                }}
              />
              {/* Số thứ tự ô 1, 2, 3, 4 tinh tế */}
              <span className="absolute top-1 left-1 bg-black/60 backdrop-blur-xs text-white text-[8px] font-mono font-bold px-1 rounded-sm opacity-0 group-hover/slot:opacity-100 transition-opacity pointer-events-none z-10">
                {idx + 1}
              </span>
            </div>
          );
        })}

        {/* Footer Text */}
        <div
          className="absolute flex flex-col justify-center items-center text-center px-1 pointer-events-none"
          style={{
            left: `${(dims.textX / targetW) * 100}%`,
            top: `${(dims.textY / targetH) * 100}%`,
            width: `${(dims.textW / targetW) * 100}%`,
            height: `${(dims.textH / targetH) * 100}%`,
            color: config.textColor || '#334155',
            fontFamily: getFontFamilyCss(config.fontFamily),
          }}
        >
          {config.textLine1 && (
            <p className="text-[8.5px] font-bold tracking-wider uppercase leading-none truncate">
              {config.textLine1}
            </p>
          )}
          {config.textLine2 && (
            <p className="text-[7.5px] opacity-75 mt-0.5 leading-none truncate">
              {config.textLine2}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 4. Viền Film
  if (config.type === 'film' && dims.type === 'film') {
    const leftPercent = (dims.photoX / targetW) * 100;
    const topPercent = (dims.photoY / targetH) * 100;
    const widthPercent = (dims.photoW / targetW) * 100;
    const heightPercent = (dims.photoH / targetH) * 100;

    let frameNumStr = config.film?.frameNumber || '01';
    if (config.film?.autoIncrement) {
      frameNumStr = String(frameIndex + 1).padStart(2, '0');
    }

    const fitCrop = calculateTemplateFitCrop(imgW, imgH, dims.photoW, dims.photoH, photo);
    const slotPercentW = (imgW / fitCrop.cropW) * 100;
    const slotPercentH = (imgH / fitCrop.cropH) * 100;
    const slotPercentX = (-fitCrop.cropX / fitCrop.cropW) * 100;
    const slotPercentY = (-fitCrop.cropY / fitCrop.cropH) * 100;

    return (
      <div
        className="w-full h-full relative overflow-hidden select-none"
        style={{ backgroundColor: config.frameColor || '#0a0a0a' }}
      >
        {/* Left Vertical Film Text */}
        {config.film?.sideText !== '' && (
          <div
            className="absolute left-0 top-0 bottom-0 flex items-center justify-center pointer-events-none"
            style={{ width: `${leftPercent}%` }}
          >
            <span
              className="text-[7.5px] font-mono tracking-widest text-amber-500/90 uppercase font-bold whitespace-nowrap rotate-270 origin-center select-none"
              style={{ fontFamily: getFontFamilyCss(config.fontFamily || 'mono') }}
            >
              {config.film?.sideText ?? 'FUJIFILM SUPERIA 400'}
            </span>
          </div>
        )}

        {/* Film Photo Area */}
        <div
          className="absolute overflow-hidden bg-slate-900 pointer-events-none"
          style={{
            left: `${leftPercent}%`,
            top: `${topPercent}%`,
            width: `${widthPercent}%`,
            height: `${heightPercent}%`,
          }}
        >
          <img
            src={imgSrc}
            alt={photo.name}
            draggable={false}
            className="absolute max-w-none pointer-events-none transition-none"
            style={{
              width: `${slotPercentW}%`,
              height: `${slotPercentH}%`,
              left: `${slotPercentX}%`,
              top: `${slotPercentY}%`,
            }}
          />
        </div>

        {/* Bottom Right Frame Number */}
        <div className="absolute right-1.5 bottom-0.5 pointer-events-none text-amber-500 font-mono font-bold text-[8.5px] tracking-tight">
          {frameNumStr}
        </div>
      </div>
    );
  }

  // 5. Bookmark
  if (config.type === 'bookmark' && dims.type === 'bookmark') {
    const leftPercent = (dims.photoX / targetW) * 100;
    const topPercent = (dims.photoY / targetH) * 100;
    const widthPercent = (dims.photoW / targetW) * 100;
    const heightPercent = (dims.photoH / targetH) * 100;

    const fitCrop = calculateTemplateFitCrop(imgW, imgH, dims.photoW, dims.photoH, photo);
    const slotPercentW = (imgW / fitCrop.cropW) * 100;
    const slotPercentH = (imgH / fitCrop.cropH) * 100;
    const slotPercentX = (-fitCrop.cropX / fitCrop.cropW) * 100;
    const slotPercentY = (-fitCrop.cropY / fitCrop.cropH) * 100;

    return (
      <div
        className="w-full h-full relative overflow-hidden select-none flex flex-col"
        style={{ backgroundColor: config.frameColor || '#ffffff' }}
      >
        {/* Hole Punch Guide Mark */}
        {config.bookmark?.hasHolePunchGuide && (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full border border-dashed border-slate-400 w-3 h-3 flex items-center justify-center pointer-events-none z-10"
            style={{ top: `${(dims.holeY / targetH) * 100}%` }}
          >
            <div className="w-1 h-1 rounded-full bg-slate-500" />
          </div>
        )}

        {/* Photo Area */}
        <div
          className="absolute overflow-hidden bg-slate-100 pointer-events-none shadow-2xs"
          style={{
            left: `${leftPercent}%`,
            top: `${topPercent}%`,
            width: `${widthPercent}%`,
            height: `${heightPercent}%`,
          }}
        >
          <img
            src={imgSrc}
            alt={photo.name}
            draggable={false}
            className="absolute max-w-none pointer-events-none transition-none"
            style={{
              width: `${slotPercentW}%`,
              height: `${slotPercentH}%`,
              left: `${slotPercentX}%`,
              top: `${slotPercentY}%`,
            }}
          />
        </div>

        {/* Footer Area */}
        <div
          className="absolute left-0 right-0 bottom-0 flex flex-col justify-center px-2 text-center pointer-events-none"
          style={{
            top: `${(dims.textY / targetH) * 100}%`,
            height: `${(dims.textH / targetH) * 100}%`,
            color: config.textColor || (isDarkColor(config.frameColor) ? '#f8fafc' : '#1e293b'),
            fontFamily: getFontFamilyCss(config.fontFamily),
          }}
        >
          {config.textLine1 && (
            <p
              className="font-semibold italic leading-tight truncate"
              style={{ fontSize: `clamp(8px, 3cqi, ${config.fontSizePt || 11}px)` }}
            >
              {config.textLine1}
            </p>
          )}
          {config.textLine2 && (
            <p
              className="text-xs opacity-75 mt-0.5 leading-tight truncate"
              style={{ fontSize: `clamp(7px, 2.5cqi, ${(config.fontSizePt || 11) * 0.85}px)` }}
            >
              {config.textLine2}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 6. Photocard (K-Pop Idol Card bo góc)
  if (config.type === 'photocard' && dims.type === 'photocard') {
    const border = dims.border || 0;
    const bottom = dims.bottom || 0;
    const rPercent = ((dims.borderRadius || 3.5) / Math.min(targetW, targetH)) * 100;
    const borderPercentX = (border / targetW) * 100;
    const borderPercentY = (border / targetH) * 100;
    const bottomPercentY = (bottom / targetH) * 100;

    const fitCrop = calculateTemplateFitCrop(imgW, imgH, dims.photoW, dims.photoH, photo);
    const slotPercentW = (imgW / fitCrop.cropW) * 100;
    const slotPercentH = (imgH / fitCrop.cropH) * 100;
    const slotPercentX = (-fitCrop.cropX / fitCrop.cropW) * 100;
    const slotPercentY = (-fitCrop.cropY / fitCrop.cropH) * 100;

    return (
      <div
        className="w-full h-full relative overflow-hidden select-none shadow-xs"
        style={{
          backgroundColor: config.frameColor || '#ffffff',
          borderRadius: `${rPercent}%`,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
        }}
      >
        {/* Photo Box */}
        <div
          className="absolute overflow-hidden pointer-events-none"
          style={{
            left: `${borderPercentX}%`,
            top: `${borderPercentY}%`,
            right: `${borderPercentX}%`,
            bottom: `${borderPercentY + bottomPercentY}%`,
            borderRadius: border > 0 ? `${Math.max(2, rPercent - borderPercentX)}%` : `${rPercent}%`,
          }}
        >
          <img
            src={imgSrc}
            alt={photo.name}
            draggable={false}
            className="absolute max-w-none pointer-events-none transition-none"
            style={{
              width: `${slotPercentW}%`,
              height: `${slotPercentH}%`,
              left: `${slotPercentX}%`,
              top: `${slotPercentY}%`,
            }}
          />
        </div>

        {/* Optional Bottom Text */}
        {bottom > 0 && (config.textLine1 || config.textLine2) && (
          <div
            className="absolute left-0 right-0 bottom-0 flex flex-col justify-center px-2 text-center pointer-events-none"
            style={{
              height: `${bottomPercentY}%`,
              color: config.textColor || (isDarkColor(config.frameColor) ? '#f8fafc' : '#1e293b'),
              fontFamily: getFontFamilyCss(config.fontFamily),
            }}
          >
            {config.textLine1 && (
              <p className="font-bold truncate text-[11px] leading-tight">
                {config.textLine1}
              </p>
            )}
            {config.textLine2 && (
              <p className="text-[9px] opacity-75 truncate leading-tight">
                {config.textLine2}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // 7. Spotify Music Player
  if (config.type === 'spotify' && dims.type === 'spotify') {
    const isDark = config.spotify?.theme !== 'light';
    const bgColor = isDark ? '#121212' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#0f172a';
    const subTextColor = isDark ? '#a7a7a7' : '#64748b';
    const accentColor = '#1db954';

    const photoHeightPercent = (dims.photoH / targetH) * 100;

    const fitCrop = calculateTemplateFitCrop(imgW, imgH, dims.photoW, dims.photoH, photo);
    const slotPercentW = (imgW / fitCrop.cropW) * 100;
    const slotPercentH = (imgH / fitCrop.cropH) * 100;
    const slotPercentX = (-fitCrop.cropX / fitCrop.cropW) * 100;
    const slotPercentY = (-fitCrop.cropY / fitCrop.cropH) * 100;

    const songTitle = config.spotify?.songTitle || config.textLine1 || 'Bài Hát Yêu Thích';
    const artistName = config.spotify?.artistName || config.textLine2 || 'Nghệ Sĩ Thể Hiện';
    const progressPercent = Math.min(100, Math.max(0, config.spotify?.progressPercent ?? 38));

    return (
      <div
        className="w-full h-full relative overflow-hidden select-none flex flex-col p-2.5"
        style={{
          backgroundColor: config.frameColor && config.frameColor !== '#ffffff' ? config.frameColor : bgColor,
          color: textColor,
          fontFamily: getFontFamilyCss(config.fontFamily),
        }}
      >
        {/* Album Art */}
        <div
          className="relative overflow-hidden rounded-lg shadow-md shrink-0 w-full"
          style={{ height: `${photoHeightPercent}%` }}
        >
          <img
            src={imgSrc}
            alt={photo.name}
            draggable={false}
            className="absolute max-w-none pointer-events-none transition-none"
            style={{
              width: `${slotPercentW}%`,
              height: `${slotPercentH}%`,
              left: `${slotPercentX}%`,
              top: `${slotPercentY}%`,
            }}
          />
        </div>

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-between pt-2 overflow-hidden pointer-events-none">
          {/* Soundwave Code */}
          {config.spotify?.showSpotifyCode !== false && (
            <div className="flex items-center justify-center gap-0.5 h-3 my-0.5 opacity-90">
              {[4, 8, 12, 6, 10, 14, 7, 11, 5, 9, 13, 7, 11, 4, 9, 12, 6, 11, 14, 8, 5, 10, 12, 6, 9, 5].map((h, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full"
                  style={{
                    height: `${h}px`,
                    backgroundColor: isDark ? '#ffffff' : '#0f172a',
                  }}
                />
              ))}
            </div>
          )}

          {/* Song Info */}
          <div className="min-w-0">
            <h4 className="font-bold text-xs truncate leading-tight" style={{ color: config.textColor || textColor }}>
              {songTitle}
            </h4>
            <p className="text-[10px] truncate mt-0.5 leading-tight" style={{ color: subTextColor }}>
              {artistName}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-1 w-full bg-slate-700/40 rounded-full relative overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: isDark ? '#ffffff' : accentColor,
                }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono" style={{ color: subTextColor }}>
              <span>{config.spotify?.currentTime || '01:28'}</span>
              <span>{config.spotify?.duration || '03:45'}</span>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center justify-between px-1">
            <Shuffle className="w-2.5 h-2.5 opacity-70" />
            <div className="flex items-center gap-2">
              <SkipBack className="w-3 h-3 fill-current opacity-80" />
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shadow-xs"
                style={{
                  backgroundColor: isDark ? '#ffffff' : '#0f172a',
                  color: isDark ? '#121212' : '#ffffff',
                }}
              >
                <Play className="w-3 h-3 fill-current ml-0.5" />
              </div>
              <SkipForward className="w-3 h-3 fill-current opacity-80" />
            </div>
            <Heart className="w-2.5 h-2.5 fill-current text-green-500" />
          </div>
        </div>
      </div>
    );
  }

  // 8. Boarding Pass / Vé máy bay Vintage
  if (config.type === 'ticket' && dims.type === 'ticket') {
    const theme = config.ticket?.theme || 'airline_blue';
    const isKraft = theme === 'vintage_kraft';
    const isDark = theme === 'airline_blue';

    const headerBg = isKraft ? '#78350f' : isDark ? '#0284c7' : '#1e293b';
    const cardBg = isKraft ? '#fef3c7' : '#ffffff';
    const textColor = isKraft ? '#451a03' : '#0f172a';
    const subTextColor = isKraft ? '#92400e' : '#64748b';

    const passengerName = config.ticket?.passengerName || config.textLine2 || 'NGUYEN VAN A';
    const fromCode = config.ticket?.from || 'HAN';
    const toCode = config.ticket?.to || 'SGN';
    const flight = config.ticket?.flight || 'VN-2026';
    const gate = config.ticket?.gate || '08';
    const seat = config.ticket?.seat || '12A';
    const flightDate = config.ticket?.date || new Date().toLocaleDateString('vi-VN');

    const fitCrop = calculateTemplateFitCrop(imgW, imgH, dims.photoW, dims.photoH, photo);
    const slotPercentW = (imgW / fitCrop.cropW) * 100;
    const slotPercentH = (imgH / fitCrop.cropH) * 100;
    const slotPercentX = (-fitCrop.cropX / fitCrop.cropW) * 100;
    const slotPercentY = (-fitCrop.cropY / fitCrop.cropH) * 100;

    const photoHeightPercent = (dims.photoH / targetH) * 100;

    return (
      <div
        className="w-full h-full relative overflow-hidden select-none flex flex-col shadow-xs"
        style={{
          backgroundColor: cardBg,
          color: textColor,
          fontFamily: getFontFamilyCss(config.fontFamily),
        }}
      >
        {/* Header Bar */}
        <div
          className="h-7 px-2 flex items-center justify-between text-white shrink-0"
          style={{ backgroundColor: headerBg }}
        >
          <div className="flex items-center gap-1 font-bold text-[10px]">
            <Plane className="w-3 h-3" />
            <span>BOARDING PASS</span>
          </div>
          <span className="font-mono font-bold text-[9px]">{flight}</span>
        </div>

        {/* Photo Area */}
        <div className="p-2 pb-1 shrink-0">
          <div
            className="relative overflow-hidden rounded-md shadow-2xs w-full"
            style={{ height: `${photoHeightPercent * 1.5}px` }}
          >
            <img
              src={imgSrc}
              alt={photo.name}
              draggable={false}
              className="absolute max-w-none pointer-events-none transition-none"
              style={{
                width: `${slotPercentW}%`,
                height: `${slotPercentH}%`,
                left: `${slotPercentX}%`,
                top: `${slotPercentY}%`,
              }}
            />
          </div>
        </div>

        {/* Flight Details */}
        <div className="px-2.5 py-1 flex-1 flex flex-col justify-between pointer-events-none min-h-0">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[7.5px] font-bold block" style={{ color: subTextColor }}>FROM</span>
              <span className="text-sm font-extrabold tracking-tight" style={{ color: headerBg }}>{fromCode}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[7px] font-mono" style={{ color: subTextColor }}>FLIGHT</span>
              <span className="text-xs font-bold">➔</span>
            </div>
            <div className="text-right">
              <span className="text-[7.5px] font-bold block" style={{ color: subTextColor }}>TO</span>
              <span className="text-sm font-extrabold tracking-tight" style={{ color: headerBg }}>{toCode}</span>
            </div>
          </div>

          <div>
            <span className="text-[7px] font-bold block" style={{ color: subTextColor }}>PASSENGER</span>
            <p className="font-bold text-[10px] truncate uppercase">{passengerName}</p>
          </div>

          <div className="grid grid-cols-3 gap-1 pt-0.5 border-t border-slate-200/60">
            <div>
              <span className="text-[6.5px] font-bold block" style={{ color: subTextColor }}>GATE</span>
              <span className="font-mono font-bold text-[9px]">{gate}</span>
            </div>
            <div>
              <span className="text-[6.5px] font-bold block" style={{ color: subTextColor }}>SEAT</span>
              <span className="font-mono font-bold text-[9px]">{seat}</span>
            </div>
            <div>
              <span className="text-[6.5px] font-bold block" style={{ color: subTextColor }}>DATE</span>
              <span className="font-mono text-[8px] truncate block">{flightDate}</span>
            </div>
          </div>
        </div>

        {/* Perforated Stub Line with notches */}
        <div className="relative flex items-center justify-between my-0.5">
          <div className="w-2.5 h-2.5 rounded-r-full bg-slate-200 -ml-1 border-r border-slate-300/60 shadow-inner" />
          <div className="flex-1 border-b border-dashed border-slate-300 mx-1" />
          <div className="w-2.5 h-2.5 rounded-l-full bg-slate-200 -mr-1 border-l border-slate-300/60 shadow-inner" />
        </div>

        {/* Stub Section with Barcode */}
        <div className="px-3 pb-1.5 text-center pointer-events-none">
          <div className="h-5 flex items-center justify-center gap-[1.5px] overflow-hidden my-0.5">
            {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 1, 2, 3, 2, 1, 4, 1, 3, 2, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 1, 2].map((w, idx) => (
              <div
                key={idx}
                className="h-full bg-slate-900"
                style={{ width: `${w * 1.5}px` }}
              />
            ))}
          </div>
          <span className="font-mono text-[7px] tracking-widest uppercase opacity-75">
            {config.ticket?.barcodeText || 'DAU-DAU-PRINT-2026'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={photo.name}
      draggable={false}
      className={`absolute max-w-none pointer-events-none transition-none ${className}`}
      style={{
        width: `${effPercentW}%`,
        height: `${effPercentH}%`,
        left: `${effPercentX}%`,
        top: `${effPercentY}%`,
      }}
    />
  );
};
