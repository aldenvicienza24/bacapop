export function readableTextColor(color, dark = '#12162f', light = '#fffdf8') {
  if (typeof color !== 'string') return dark;

  let hex = color.trim().replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((value) => value + value).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return dark;

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;

  return brightness < 150 ? light : dark;
}
