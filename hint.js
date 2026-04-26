/* ============================================================
   hint.js — magnifying glass hint system (shared)
   Scans for [data-hint] elements and injects clickable icons.
   ============================================================ */

(function () {
  let activeTooltip = null;
  let activeIcon    = null;

  function init() {
    document.querySelectorAll('[data-hint]').forEach(addHintIcon);
    document.addEventListener('click', closeHint);
  }

  function addHintIcon(el) {
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }

    const icon = document.createElement('button');
    icon.className = 'hint-icon';
    icon.type = 'button';
    icon.setAttribute('aria-label', 'What is this?');
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`;

    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (activeIcon === icon) { closeHint(); return; }
      showHint(icon, el.dataset.hint);
    });

    el.appendChild(icon);
  }

  function showHint(iconEl, text) {
    closeHint();

    const tooltip = document.createElement('div');
    tooltip.className = 'hint-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);

    // Position to the right of the icon, vertically centred
    const ir  = iconEl.getBoundingClientRect();
    const gap = 10;

    tooltip.style.top       = '0px';
    tooltip.style.left      = '0px';
    tooltip.style.transform = 'none';

    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;

    let left = ir.right + gap;
    let top  = ir.top + ir.height / 2 - th / 2;

    // Flip left if it would overflow the right edge
    if (left + tw > window.innerWidth - 10) {
      left = ir.left - tw - gap;
    }
    // Clamp left edge
    if (left < 10) left = 10;

    // Clamp vertical
    if (top < 10) top = 10;
    if (top + th > window.innerHeight - 10) top = window.innerHeight - th - 10;

    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';

    activeTooltip = tooltip;
    activeIcon    = iconEl;
  }

  function closeHint() {
    if (activeTooltip) { activeTooltip.remove(); activeTooltip = null; }
    activeIcon = null;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
