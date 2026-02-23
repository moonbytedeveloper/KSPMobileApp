if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    configurable: true,
    writable: true,
    value: function () { return [...this].reverse(); },
  });
}