/**
 * Bild-Kacheln (image tiles) block decoration.
 *
 * Expected authoring markup (HTML as produced by AEM/Franklin):
 * <div class="bild-kacheln block">
 *   <div>
 *     <p>Tile title</p>
 *     <p><a href="/path">Mehr Informationen</a></p>
 *   </div>
 *   ...repeat for each tile...
 * </div>
 *
 * This script turns each row into an <li> element and adds an “overlay” anchor so the
 * entire tile area is clickable when a link is provided.
 */

export default function decorate(block) {
  const ul = document.createElement('ul');

  // Convert each immediate child <div> (authoring row) into <li>
  [...block.children].forEach((row) => {
    const li = document.createElement('li');

    // Move all children from row to li
    while (row.firstChild) li.append(row.firstChild);

    // Find first anchor to treat as CTA
    const link = li.querySelector('a');
    if (link) {
      link.classList.add('tile-cta');
      // Screen-reader label for overlay link if not set
      if (!link.title) link.title = link.textContent.trim();

      // Duplicate link as invisible overlay so the whole tile is clickable
      const overlay = document.createElement('a');
      overlay.href = link.href;
      overlay.setAttribute('aria-label', link.getAttribute('aria-label') || link.textContent.trim());
      if (link.target) overlay.target = link.target;
      overlay.rel = link.rel || 'noopener noreferrer';
      overlay.className = 'tile-link';
      // The overlay contains no text so it doesn’t get announced twice
      li.append(overlay);
    }

    // Ensure first heading within li is rendered as <h3>
    const firstHeading = li.querySelector('h1, h2, h3, h4, h5, h6, p');
    if (firstHeading && firstHeading.tagName.toLowerCase() === 'p') {
      const headingText = firstHeading.textContent;
      const h3 = document.createElement('h3');
      h3.textContent = headingText;
      firstHeading.replaceWith(h3);
    }

    ul.append(li);
  });

  // Replace original content with list
  block.textContent = '';
  block.append(ul);
}
