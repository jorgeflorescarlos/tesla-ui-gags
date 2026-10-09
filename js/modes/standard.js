/* Standard: the plain light "garage" look, as a baseline. */
TeslaUI.registerMode({
  id: 'standard',
  name: 'Standard',
  tagline: 'The everyday look.',
  theme: 'light',
  paint: '#2a2d33',
  temp: '72°F',
  hideCard: true,
  background: 'linear-gradient(#f3f4f6, #dfe2e6 62%, #c9cdd3)',
  art: '<svg viewBox="0 0 200 190" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">' +
    '<rect width="200" height="190" fill="#e4e6ea"/><rect y="120" width="200" height="70" fill="#cfd3d8"/>' +
    '<path d="M30 128 C40 112 70 104 95 100 C120 96 150 104 172 120 L174 132 L30 134 Z" fill="#2a2d33"/>' +
    '<circle cx="62" cy="134" r="12" fill="#111"/><circle cx="146" cy="134" r="12" fill="#111"/></svg>',
  enter: function (ctx) {
    ctx.scene('<svg viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">' +
      '<defs><radialGradient id="stdFloor" cx="50%" cy="68%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
      '<ellipse cx="800" cy="690" rx="700" ry="160" fill="url(#stdFloor)"/></svg>');
  }
});
