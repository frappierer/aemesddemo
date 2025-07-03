/*
 * Bild Kacheln (Image Tiles) block – Franklin implementation
 * ----------------------------------------------------------
 * Franklin authors the block as a table with one column:
 *   | Bild Kacheln |
 *   | ------------ |
 *   | Row 1        |
 *   | Row 2        |
 * Each subsequent row becomes a tile and can contain:
 *   – A heading (any <h*> or <p>) used as tile title
 *   – A link (<a>) to make the whole tile clickable
 *   – Anything else (images, additional text)
 *
 * The decorate function converts the raw DOM into a semantic list structure
 * and applies the class names expected by the companion CSS file.
 */

import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Determines whether a node is (or contains) a heading element.
 * @param {Element} el
 * @returns {HTMLHeadingElement|null}
 */
function extractHeading(el) {
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) return heading;
  // Fallback: first paragraph becomes heading-like if bold text maybe.
  const firstChild = el.querySelector('p');
  return firstChild;
}

/**
 * Wraps `li` content into an anchor if a link is present inside.
 * The first link found will govern the wrapping; duplicates are removed.
 * @param {HTMLLIElement} li
 */
function wrapInLink(li) {
  const link = li.querySelector('a[href]');
  if (!link) return;

  // Clone the link (without its children) to use as wrapper
  const wrapper = link.cloneNode(false);
  wrapper.classList.add('bild-kacheln-tile');

  // Move all li children into the wrapper
  while (li.firstChild) wrapper.append(li.firstChild);

  // Inside the moved content there might still be links. Replace them with spans to comply with
  // HTML validity (no nested anchors) while preserving their visual content.
  wrapper.querySelectorAll('a').forEach((a) => {
    if (a === wrapper) return; // skip the wrapper itself
    const span = document.createElement('span');
    span.innerHTML = a.innerHTML;
    a.replaceWith(span);
  });

  // Remove tile styling from li (now applied to anchor) and append wrapper
  li.classList.remove('bild-kacheln-tile');
  li.append(wrapper);
}

export default function decorate(block) {
  // Optional screen-reader only title: treat the first row that contains a single heading element inside a <p>.
  const firstRow = block.firstElementChild;
  let srTitle;
  if (firstRow && firstRow.children.length === 1 && firstRow.querySelector('strong, h1, h2, h3, h4, h5, h6')) {
    // Move it outside and mark as sr-only
    srTitle = firstRow.textContent.trim();
    firstRow.remove();
  }

  // Build semantic list.
  const ul = document.createElement('ul');
  ul.classList.add('bild-kacheln');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.classList.add('bild-kacheln-tile');

    // Move original row children into li
    while (row.firstChild) li.append(row.firstChild);

    // If tile contains a link make tile clickable (full-area anchor)
    wrapInLink(li);

    // Ensure heading element has correct class for spacing
    const heading = extractHeading(li);
    if (heading) heading.classList.add('bild-kacheln-tile-title');

    ul.append(li);
  });

  // Process all images at once after structure is built (use default breakpoints for proper img element creation)
  ul.querySelectorAll('img').forEach((img) => {
    const picture = img.closest('picture');
    if (picture) {
      picture.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]));
    } else {
      // If img is not inside a picture, replace the img directly
      img.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]));
    }
  });

  // Clear block and append processed list
  block.textContent = '';
  if (srTitle) {
    const h2 = document.createElement('h2');
    h2.textContent = srTitle;
    h2.classList.add('bild-kacheln-sr-only');
    block.append(h2);
  }
  block.append(ul);
}
