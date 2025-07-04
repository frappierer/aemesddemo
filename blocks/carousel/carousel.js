import { createOptimizedPicture, readBlockConfig, decorateIcons } from '../../scripts/aem.js';

// Translate "auto-transition: true, timing: 3000ms" → { autoTransition, timing }
function parseConfig(cfg = '') {
  const out = {
    autoTransition: true,
    timing: 3000,
  };
  cfg.split(',').forEach((token) => {
    const [k, v] = token.split(':').map((s) => s && s.trim().toLowerCase());
    if (!k || !v) return;
    if (k === 'auto-transition') out.autoTransition = v === 'true';
    if (k === 'timing') {
      const num = parseInt(v.replace(/[^0-9]/g, ''), 10);
      if (!Number.isNaN(num)) out.timing = num;
    }
  });
  return out;
}

export default function decorate(block) {

  const configData = readBlockConfig(block);
  const cfgString = configData.carousel || '';
  const { autoTransition: autoTransitionCfg, timing } = parseConfig(cfgString);


  const maybeCfgRow = block.firstElementChild;
  if (
    maybeCfgRow
    && maybeCfgRow.children.length >= 2
    && maybeCfgRow.children[0].textContent.trim().toLowerCase() === 'carousel'
  ) {
    maybeCfgRow.remove();
  }


  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const autoTransition = autoTransitionCfg && !prefersReducedMotion;


  const rows = [...block.children];
  const slidesWrapper = document.createElement('div');
  slidesWrapper.className = 'carousel-slides';

  const slides = rows.map((row, idx) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Slide ${idx + 1} of ${rows.length}`);
    slide.setAttribute('aria-hidden', 'true');

    const cells = [...row.children];

    // Image
    if (cells[0]) {
      const img = cells[0].querySelector('img');
      if (img) {
        const picture = createOptimizedPicture(img.src, img.alt || '', idx === 0);
        slide.append(picture);
      }
    }

    // Content container
    const content = document.createElement('div');
    content.className = 'carousel-content';

    if (cells[1]) {
      const title = document.createElement('h3');
      title.innerHTML = cells[1].innerHTML;
      content.append(title);
    }

    if (cells[2]) {
      const desc = document.createElement('p');
      desc.innerHTML = cells[2].innerHTML;
      content.append(desc);
    }

    if (cells[3]) {
      const link = cells[3].querySelector('a');
      if (link) {
        link.classList.add('carousel-link');
        content.append(link);
      }
    }

    slide.append(content);
    slidesWrapper.append(slide);
    return slide;
  });

  decorateIcons(slidesWrapper);


  block.textContent = '';
  block.append(slidesWrapper);


  const controls = document.createElement('div');
  controls.className = 'carousel-controls';

  const createBtn = (cls, label, innerHTML) => {
    const btn = document.createElement('button');
    btn.className = `carousel-control ${cls}`;
    btn.setAttribute('aria-label', label);
    btn.innerHTML = innerHTML;
    return btn;
  };

  const prevBtn = createBtn('carousel-prev', 'Previous Slide', '&#10094;');
  const nextBtn = createBtn('carousel-next', 'Next Slide', '&#10095;');
  const pauseBtn = createBtn('carousel-pause', 'Pause Carousel', '&#10074;&#10074;');

  controls.append(prevBtn, pauseBtn, nextBtn);
  block.append(controls);

  let current = 0;
  slides[current].classList.add('active');
  slides[current].setAttribute('aria-hidden', 'false');

  const setActive = (newIdx) => {
    slides[current].classList.remove('active');
    slides[current].setAttribute('aria-hidden', 'true');
    slides[newIdx].classList.add('active');
    slides[newIdx].setAttribute('aria-hidden', 'false');
    current = newIdx;
  };

  const prev = () => setActive((current - 1 + slides.length) % slides.length);
  const next = () => setActive((current + 1) % slides.length);

  prevBtn.addEventListener('click', () => {
    prev();
  });

  nextBtn.addEventListener('click', () => {
    next();
  });

  // Auto-transition
  let intervalId = null;
  let isPaused = !autoTransition;


  if (isPaused) {
    pauseBtn.innerHTML = '&#9654;'; // play icon
    pauseBtn.setAttribute('aria-label', 'Play Carousel');
  }

  const startAuto = () => {
    if (!autoTransition || intervalId) return;
    intervalId = setInterval(next, timing);
  };

  const stopAuto = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };


  const togglePlayState = () => {
    if (isPaused) {
      pauseBtn.innerHTML = '&#10074;&#10074;'; // pause icon
      pauseBtn.setAttribute('aria-label', 'Pause Carousel');
      isPaused = false;
      startAuto();
    } else {
      pauseBtn.innerHTML = '&#9654;'; // play icon
      pauseBtn.setAttribute('aria-label', 'Play Carousel');
      isPaused = true;
      stopAuto();
    }
  };

  pauseBtn.addEventListener('click', togglePlayState);


  block.addEventListener('mouseenter', stopAuto);
  block.addEventListener('mouseleave', () => {
    if (!isPaused) startAuto();
  });
  block.addEventListener('focusin', stopAuto);
  block.addEventListener('focusout', () => {
    if (!isPaused) startAuto();
  });


  block.setAttribute('tabindex', '0');
  block.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        prev();
        e.preventDefault();
        break;
      case 'ArrowRight':
        next();
        e.preventDefault();
        break;
      case ' ': // Space toggles play / pause
      case 'Spacebar':
        togglePlayState();
        e.preventDefault();
        break;
      default:
        break;
    }
  });


  if (!isPaused) startAuto();
}
