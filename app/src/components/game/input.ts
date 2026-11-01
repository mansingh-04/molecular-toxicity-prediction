/** Global keyboard/mouse state for the player controller (read every frame, no React re-renders). */
export const keys = new Set<string>();
export const look = { dx: 0, dy: 0, dragging: false };

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

let installed = 0;
function down(e: KeyboardEvent) {
  if (isTyping(e.target)) return;
  keys.add(e.code);
}
function up(e: KeyboardEvent) {
  keys.delete(e.code);
}
function blur() {
  keys.clear();
  look.dragging = false;
}
function move(e: MouseEvent) {
  if (document.pointerLockElement || look.dragging) {
    look.dx += e.movementX;
    look.dy += e.movementY;
  }
}
function mouseUp() {
  look.dragging = false;
}

export function installInput() {
  if (installed++ > 0) return;
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', mouseUp);
}

export function uninstallInput() {
  if (--installed > 0) return;
  window.removeEventListener('keydown', down);
  window.removeEventListener('keyup', up);
  window.removeEventListener('blur', blur);
  window.removeEventListener('mousemove', move);
  window.removeEventListener('mouseup', mouseUp);
  keys.clear();
}

export { isTyping };
