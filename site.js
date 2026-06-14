document.addEventListener('click', event => {
  const button = event.target.closest('.burst-button, .button, .choice-button, .genre-tab, .guide-answer, .guide-result');
  if (!button) return;

  const rect = button.getBoundingClientRect();
  const originX = event.clientX || rect.left + rect.width / 2;
  const originY = event.clientY || rect.top + rect.height / 2;
  const colors = ['#f6c76c', '#e54b7a', '#22d3ee', '#8b5cf6', '#fff8f2'];

  button.classList.add('button-pressed');
  window.setTimeout(() => button.classList.remove('button-pressed'), 260);

  const ring = document.createElement('span');
  ring.className = 'burst-ring';
  ring.style.left = `${originX}px`;
  ring.style.top = `${originY}px`;
  document.body.appendChild(ring);
  window.setTimeout(() => ring.remove(), 760);

  for (let i = 0; i < 22; i += 1) {
    const dot = document.createElement('span');
    const angle = (Math.PI * 2 * i) / 22;
    const distance = 38 + Math.random() * 82;
    const size = 4 + Math.random() * 8;
    dot.className = 'burst-dot';
    dot.style.left = `${originX}px`;
    dot.style.top = `${originY}px`;
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.background = colors[i % colors.length];
    dot.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    dot.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    document.body.appendChild(dot);
    window.setTimeout(() => dot.remove(), 820);
  }
});
