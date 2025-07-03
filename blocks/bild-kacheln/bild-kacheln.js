import {
  createOptimizedPicture,
  readBlockConfig,
  decorateIcons,
} from '../../scripts/aem.js';

/**
 * Build the optimized picture element from a given image URL and alt text.
 * Uses the recommended break-points for responsive images in EDS.
 *
 * @param {string} src Image source URL
 * @param {string} alt Alternative text
 * @returns {HTMLElement} the <picture> element
 */
function buildPicture(src, alt = '') {
  const breakpoints = [
    { media: '(min-width: 600px)', width: '2000' },
    { width: '750' },
  ];
  return createOptimizedPicture(src, alt, false, breakpoints);
}

/**
 * Converts the initial authored markup into the final DOM expected on the
 * front-end. It supports an optional leading configuration section and an
 * arbitrary number of item rows each representing one tile.
 *
 * Authoring expectations (table based):
 * ┌────────┬──────────────────────────┐
 * │ id     │ toll                     │ ← optional config row (any order)
 * │ title  │ Toll Services            │ ← optional config row
 * │ image  │ (picture)                │ ← optional config row
 * ├────────┼──────────────────────────┤
 * │ Mautbox │ https://example.com/link│ ← tile row (title / link)
 * │ Vignette│ https://example.com/link│
 * └────────┴──────────────────────────┘
 *
 * The remaining (non config) rows are treated as tiles.
 *
 * @param {HTMLElement} block The block root element
 */
export default function decorate(block) {
  /* --------------------------------------------------------------------- */
  /* 1. Read and strip configuration rows                                 */
  /* --------------------------------------------------------------------- */

  const cfg = readBlockConfig(block);

  // Remove rows that belong to the configuration so they don’t get
  // processed as tiles later on.
  [...block.children].forEach((row) => {
    const key = row.firstElementChild?.textContent?.trim()?.toLowerCase();
    if (key && ['id', 'title', 'image', 'imagealt', 'classes', 'margin-top', 'margin-bottom'].includes(key)) {
      row.remove();
    }
  });

  // Apply simple configuration values
  if (cfg.id) {
    // apply the id on the surrounding section if possible to enable jump links
    const section = block.closest('.section');
    if (section) section.id = cfg.id;
    else block.id = cfg.id;
  }

  if (cfg.classes) {
    const classes = Array.isArray(cfg.classes) ? cfg.classes : [cfg.classes];
    classes.forEach((c) => block.classList.add(c));
  }

  /* --------------------------------------------------------------------- */
  /* 2. Build the semantic DOM structure                                   */
  /* --------------------------------------------------------------------- */

  const wrapper = document.createElement('div');
  wrapper.className = 'bild-kacheln-wrapper';

  // Optional image column
  if (cfg.image) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'bild-kacheln-image';
    imageWrapper.append(buildPicture(cfg.image, cfg.imagealt || cfg.title || ''));
    wrapper.append(imageWrapper);
    block.classList.add('has-image');
  }

  // Tiles list
  const ul = document.createElement('ul');
  ul.className = 'bild-kacheln-tiles';

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'bild-kacheln-tile';

    // Retrieve title and link from the 2 authored columns (if any)
    const [titleCol, linkCol] = row.children;

    // Build title element (rich-text supported)
    const titleSpan = document.createElement('span');
    titleSpan.className = 'bild-kacheln-tile-title';
    if (titleCol) {
      // Copy all child nodes to preserve markup (strong, em, ...)
      while (titleCol.firstChild) {
        titleSpan.append(titleCol.firstChild);
      }
    }

    // Build link wrapper if link present
    let anchor;
    const linkEl = linkCol?.querySelector('a');
    if (linkEl) {
      anchor = document.createElement('a');
      anchor.href = linkEl.href;
      if (linkEl.title) anchor.title = linkEl.title;
      if (linkEl.target) anchor.target = linkEl.target;
      anchor.append(titleSpan);
      li.append(anchor);
    } else {
      li.append(titleSpan);
    }

    ul.append(li);
  });

  decorateIcons(ul);

  wrapper.append(ul);

  /* --------------------------------------------------------------------- */
  /* 3. Replace authored content with the final structure                  */
  /* --------------------------------------------------------------------- */

  block.textContent = '';
  if (cfg.title) {
    // Screen-reader only heading for accessibility
    const heading = document.createElement('h2');
    heading.className = 'visually-hidden';
    heading.textContent = cfg.title;
    block.append(heading);
  }

  block.append(wrapper);
}
