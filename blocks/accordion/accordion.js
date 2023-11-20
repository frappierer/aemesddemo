import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  // Select all direct child divs of the block. Each div should contain a header-content pair
  block.querySelectorAll(':scope > div').forEach((row) => {
    const [header, content] = row.children;
    header.classList.add('accordion-header');
    content.classList.add('accordion-content');

    // Optimize any images within the content
    content.querySelectorAll('img').forEach(img => {
      const picture = img.closest('picture');
      if (picture) {
        picture.replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]));
      }
    });

    // Click event to toggle the display of the content
    header.addEventListener('click', () => {
      // Check if the content is currently displayed
      const isContentVisible = content.style.display === 'block';
      // Hide all content elements
      block.querySelectorAll('.accordion-content').forEach(cont => {
        cont.style.display = 'none';
        cont.previousElementSibling.classList.remove('active-header');
      });
      // Toggle the display of the clicked content
      content.style.display = isContentVisible ? 'none' : 'block';
      header.classList.toggle('active-header', !isContentVisible);
    });
  });
}
