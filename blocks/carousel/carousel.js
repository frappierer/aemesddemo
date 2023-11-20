import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorateCarousel(block) {
  // Convert block children to an array of slides
  const slides = Array.from(block.children);
  let currentSlide = 0;

  // Function to change the display of slides
  function showSlide(index) {
    slides.forEach(slide => slide.style.display = 'none'); // Hide all slides
    slides[index].style.display = 'block'; // Show the new slide
    currentSlide = index;
  }

  // Iterate over slides to replace img with optimized picture elements
  slides.forEach((slide) => {
    const img = slide.querySelector('img');
    if (img) {
      // Replace img with optimized picture element
      const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
      img.replaceWith(picture);
    }
  });

  // Create previous and next buttons for the carousel
  const prevButton = document.createElement('button');
  prevButton.className = 'carousel-control-prev';
  prevButton.textContent = '<'; // You can also use an icon or SVG here
  const nextButton = document.createElement('button');
  nextButton.className = 'carousel-control-next';
  nextButton.textContent = '>'; // You can also use an icon or SVG here

  // Insert buttons into the carousel
  block.prepend(prevButton);
  block.append(nextButton);

  // Event listeners for previous and next buttons
  prevButton.addEventListener('click', () => {
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(prevIndex);
  });

  nextButton.addEventListener('click', () => {
    const nextIndex = (currentSlide + 1) % slides.length;
    showSlide(nextIndex);
  });

  // Initialize the first slide as active
  showSlide(0);
}

document.addEventListener('DOMContentLoaded', () => {
  const carouselBlock = document.querySelector('.carousel');
  if (carouselBlock) {
    decorateCarousel(carouselBlock);
  } else {
    console.error('Carousel block not found');
  }
});