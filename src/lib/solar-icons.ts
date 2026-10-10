const assets = import.meta.glob<string>('../assets/icon-*.png', { eager: true, query: '?url', import: 'default' });
const symbols: Record<string, string> = {
  '🌍': 'earth', '☀️': 'sun', '🌕': 'moon', '🌙': 'moon', '🌓': 'moon', '🌗': 'moon',
  '🪐': 'saturn', '⚪': 'mercury', '🟡': 'venus', '🔴': 'mars', '🟤': 'jupiter', '🌀': 'uranus', '🔵': 'neptune',
  '🌌': 'galaxy', '🌅': 'sunrise', '🌸': 'flower', '🌿': 'flower', '🍂': 'leaf', '❄️': 'snow',
  '👆': 'hand', '👀': 'hand', '💡': 'sun', '📅': 'book', '🔭': 'back', '🚀': 'galaxy', '☄️': 'galaxy', '✕': 'close', '🇮🇩': 'flag',
};
export function iconMarkup(name: string) {
  const url = assets[`../assets/icon-${name}.png`];
  return url ? `<img class="solar-icon-3d" src="${url}" width="32" height="32" alt="" aria-hidden="true" draggable="false">` : '';
}
export function replaceIconText(html: string) {
  for (const [symbol, name] of Object.entries(symbols)) html = html.split(symbol).join(iconMarkup(name));
  return html;
}
export function setSolarIcon(element: HTMLElement | null, name: string) {
  if (!element) return;
  if (element.dataset['icon'] === name && element.firstElementChild?.getAttribute('src') === assets[`../assets/icon-${name}.png`]) return;
  element.dataset['icon'] = name;
  element.innerHTML = iconMarkup(name);
}
export function mountControlIcons() {
  const controls: Record<string, string> = { 'btn-toggle-tools': 'settings', 'btn-reset-cam': 'reset', 'btn-toggle-info': 'book', 'btn-fullscreen': 'fullscreen' };
  for (const [id, name] of Object.entries(controls)) {
    const button = document.getElementById(id);
    button?.querySelector('svg')?.remove();
    button?.insertAdjacentHTML('afterbegin', iconMarkup(name));
  }
  const old = document.getElementById('play-pause-icon');
  if (old) {
    const replacement = document.createElement('span');
    replacement.id = old.id;
    setSolarIcon(replacement, 'pause');
    old.replaceWith(replacement);
  }
}