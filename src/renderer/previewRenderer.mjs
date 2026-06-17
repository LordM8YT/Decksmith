const EMPTY_ACCENT = '#525252';

export function drawKeyPreview(canvas, { slot, action, plugin, label = null, isSelected = false }) {
  const { width, height } = slot.pixelSize || { width: 96, height: 96 };
  const context = canvas.getContext('2d');
  const previewLabel = label || action?.defaultLabel || '';
  const pluginTag = plugin ? getInitials(plugin.name) : '';
  const accent = hexToRgb(action?.accentColor || EMPTY_ACCENT);

  canvas.width = width;
  canvas.height = height;

  context.clearRect(0, 0, width, height);
  context.fillStyle = '#020202';
  context.fillRect(0, 0, width, height);

  context.fillStyle = action ? '#080808' : '#1a1a1a';
  drawRoundedRect(context, 4, 4, width - 8, height - 8, 16);
  context.fill();

  context.strokeStyle = action
    ? (isSelected ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.24)')
    : (isSelected ? 'rgba(255, 255, 255, 0.44)' : 'rgba(255, 255, 255, 0.12)');
  context.lineWidth = isSelected ? 3 : 2;
  drawRoundedRect(context, 5, 5, width - 10, height - 10, 15);
  context.stroke();

  if (!action) {
    return;
  }

  context.save();
  context.globalAlpha = 0.22;
  context.fillStyle = rgbToCss(accent);
  drawRoundedRect(context, 14, height - 12, width - 28, 3, 2);
  context.fill();
  context.restore();

  if (pluginTag) {
    context.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(context, 12, 12, Math.min(34, width - 24), 16, 8);
    context.fill();

    context.fillStyle = '#f6f6f6';
    context.font = `700 ${Math.max(8, Math.floor(width * 0.09))}px "Segoe UI Variable", Ubuntu, sans-serif`;
    context.textBaseline = 'middle';
    context.fillText(pluginTag, 16, 20);
  }

  context.fillStyle = '#fbfbfb';
  context.font = `800 ${Math.max(12, Math.floor(width * 0.18))}px "Segoe UI Variable", Ubuntu, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const lines = splitLabel(previewLabel, 2);
  const lineHeight = Math.max(14, Math.floor(height * 0.15));
  const firstLineY = lines.length === 1 ? height * 0.58 : height * 0.5;

  lines.forEach((line, index) => {
    context.fillText(line, width / 2, firstLineY + (index * lineHeight));
  });
}

export function buildHardwarePayload(options) {
  const canvas = document.createElement('canvas');
  drawKeyPreview(canvas, {
    ...options,
    isSelected: false
  });
  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    format: 'rgba',
    data: new Uint8ClampedArray(imageData.data)
  };
}

function getInitials(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function splitLabel(label, maxLines) {
  const words = String(label || '').trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  if (words.length === 1) {
    return [truncate(words[0])];
  }

  if (maxLines <= 1) {
    return [truncate(words.join(' '))];
  }

  const firstLine = [];
  const secondLine = [];

  for (const word of words) {
    const nextLine = secondLine.length ? secondLine : firstLine;
    const currentText = nextLine.join(' ');
    const nextText = currentText ? `${currentText} ${word}` : word;

    if (nextLine === firstLine && nextText.length <= 10) {
      firstLine.push(word);
      continue;
    }

    secondLine.push(word);
  }

  if (secondLine.length === 0) {
    return [truncate(firstLine.join(' '))];
  }

  return [
    truncate(firstLine.join(' ')),
    truncate(secondLine.join(' '))
  ];
}

function truncate(value) {
  return value.length > 11 ? `${value.slice(0, 10)}...` : value;
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function hexToRgb(hex) {
  const normalized = String(hex || EMPTY_ACCENT).replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => `${character}${character}`).join('')
    : normalized;

  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}
