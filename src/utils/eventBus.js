const listeners = {};

export function subscribe(event, cb) {
  if (!listeners[event]) listeners[event] = new Set();
  listeners[event].add(cb);
  return () => {
    try { listeners[event].delete(cb); } catch (e) {}
  };
}

export function publish(event, payload) {
  const set = listeners[event];
  if (!set) return;
  set.forEach(cb => {
    try { cb(payload); } catch (e) { console.warn('eventBus callback error', e); }
  });
}

export function clearEvent(event) {
  if (listeners[event]) listeners[event].clear();
}
