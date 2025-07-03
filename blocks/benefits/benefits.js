import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Benefits – Bild Kacheln (image tiles)
 *
 * Expected markup before decoration (as authored in a spreadsheet):
 *
 * | Picture | Title | Link |
 * | Picture | Title | Link |
 * | ...     | ...   | ...  |
 *
 * Each table row is turned into a <li> representing a tile. The block itself
 * becomes an unordered list that is rendered as a responsive grid.
 *
 * Features implemented according to DKV-166 requirements (excerpt):
 *   • Three tiles per row on desktop, two on tablets, one on mobile.
 *   • The entire tile becomes clickable if it contains a link.
 *   • Images are passed through createOptimizedPicture to ensure performance.
 */

export default function decorate(block) {
  // Create the container list that will hold the tiles.
  const ul = document.createElement('ul');
  ul.className = 'benefits-list';

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'benefits-tile';

    // Move all original row children into the tile.
    while (row.firstChild) {
      li.append(row.firstChild);
    }

    // If a picture exists, optimise it.
    li.querySelectorAll('img').forEach((img) => {
      const picture = img.closest('picture');
      if (picture) {
        /* replaceWith keeps alt text from the original <img> */
        picture.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
      }
    });

    // If the tile contains exactly one link, make the whole tile clickable.
    const links = li.querySelectorAll('a[href]');
    if (links.length === 1) {
      const [link] = links;
      // If the link is not already wrapping the whole content, wrap.
      if (link.parentElement !== li) {
        link.replaceWith(...link.childNodes); // unwrap existing link
        link.innerHTML = li.innerHTML;
        li.innerHTML = '';
        li.append(link);
      } else {
        // Ensure the link takes the full space.
        link.classList.add('benefits-link');
      }
    }

    ul.append(li);
  });

  // Clean up and append the new structure.
  block.textContent = '';
  block.append(ul);
}
