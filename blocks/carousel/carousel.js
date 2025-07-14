import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

export default function decorate(block) {
  // Read configuration from first row if it contains settings
  const config = readBlockConfig(block);
  const autoTransition = config.autoTransition !== 'false';
  const timing = parseInt(config.timing || '3000', 10);

  // Remove config row if it exists
  if (block.firstElementChild && block.firstElementChild.textContent.includes('auto-transition')) {
    block.firstElementChild.remove();
  }

  // Transform block children into slides
  const slides = [...block.children].map((row, index) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'tabpanel');
    slide.setAttribute('aria-label', `Slide ${index + 1}`);
    slide.id = `carousel-slide-${index}`;

    // Extract content from row
    const [imageCell, titleCell, descriptionCell, linkCell] = [...row.children];

    // Create slide content container
    const slideContent = document.createElement('div');
    slideContent.className = 'carousel-slide-content';

    // Process image
    if (imageCell) {
      const img = imageCell.querySelector('img');
      if (img) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'carousel-slide-image';
        imageWrapper.append(imageCell.firstElementChild);
        slideContent.append(imageWrapper);
      }
    }

    // Create text content container
    const textContent = document.createElement('div');
    textContent.className = 'carousel-slide-text';

    // Add title
    if (titleCell && titleCell.textContent.trim()) {
      const title = document.createElement('h3');
      title.className = 'carousel-slide-title';
      title.textContent = titleCell.textContent.trim();
      textContent.append(title);
    }

    // Add description
    if (descriptionCell && descriptionCell.textContent.trim()) {
      const description = document.createElement('p');
      description.className = 'carousel-slide-description';
      description.textContent = descriptionCell.textContent.trim();
      textContent.append(description);
    }

    // Add link
    if (linkCell) {
      const link = linkCell.querySelector('a');
      if (link) {
        link.className = 'carousel-slide-link';
        textContent.append(link);
      }
    }

    if (textContent.children.length > 0) {
      slideContent.append(textContent);
    }

    slide.append(slideContent);
    return slide;
  });

  // Clear block and create carousel structure
  block.textContent = '';
  
  // Create carousel container
  const carouselContainer = document.createElement('div');
  carouselContainer.className = 'carousel-container';
  carouselContainer.setAttribute('role', 'region');
  carouselContainer.setAttribute('aria-label', 'Carousel');
  carouselContainer.setAttribute('aria-roledescription', 'carousel');

  // Create slides wrapper
  const slidesWrapper = document.createElement('div');
  slidesWrapper.className = 'carousel-slides';
  slidesWrapper.setAttribute('aria-live', 'polite');
  slides.forEach((slide) => slidesWrapper.append(slide));

  // Create navigation controls
  const navControls = document.createElement('div');
  navControls.className = 'carousel-nav-controls';

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.className = 'carousel-control carousel-control-prev';
  prevButton.setAttribute('aria-label', 'Previous slide');
  prevButton.innerHTML = '<span aria-hidden="true">‹</span>';
  
  // Next button
  const nextButton = document.createElement('button');
  nextButton.className = 'carousel-control carousel-control-next';
  nextButton.setAttribute('aria-label', 'Next slide');
  nextButton.innerHTML = '<span aria-hidden="true">›</span>';

  navControls.append(prevButton, nextButton);

  // Create indicators
  const indicators = document.createElement('div');
  indicators.className = 'carousel-indicators';
  indicators.setAttribute('role', 'tablist');
  indicators.setAttribute('aria-label', 'Slide navigation');

  slides.forEach((_, index) => {
    const indicator = document.createElement('button');
    indicator.className = 'carousel-indicator';
    indicator.setAttribute('role', 'tab');
    indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
    indicator.setAttribute('aria-controls', `carousel-slide-${index}`);
    indicator.setAttribute('data-slide-index', index);
    indicators.append(indicator);
  });

  // Create status announcement for screen readers
  const status = document.createElement('div');
  status.className = 'carousel-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  status.style.position = 'absolute';
  status.style.left = '-10000px';
  status.style.width = '1px';
  status.style.height = '1px';
  status.style.overflow = 'hidden';

  // Assemble carousel
  carouselContainer.append(slidesWrapper, navControls, indicators);
  block.append(carouselContainer, status);

  // State management
  let currentSlide = 0;
  let autoTransitionInterval;
  let isPaused = false;

  // Function to show a specific slide
  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
      slide.setAttribute('aria-hidden', i !== index);
    });

    // Update indicators
    indicators.querySelectorAll('.carousel-indicator').forEach((indicator, i) => {
      indicator.classList.toggle('active', i === index);
      indicator.setAttribute('aria-selected', i === index);
    });

    // Update status for screen readers
    status.textContent = `Slide ${index + 1} of ${slides.length}`;
    
    currentSlide = index;
  }

  // Function to go to next slide
  function nextSlide() {
    const nextIndex = (currentSlide + 1) % slides.length;
    showSlide(nextIndex);
  }

  // Function to go to previous slide
  function prevSlide() {
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(prevIndex);
  }

  // Auto-transition functionality
  function startAutoTransition() {
    if (autoTransition && !isPaused) {
      autoTransitionInterval = setInterval(nextSlide, timing);
    }
  }

  function stopAutoTransition() {
    if (autoTransitionInterval) {
      clearInterval(autoTransitionInterval);
      autoTransitionInterval = null;
    }
  }

  // Event listeners
  prevButton.addEventListener('click', () => {
    prevSlide();
    stopAutoTransition();
    startAutoTransition();
  });

  nextButton.addEventListener('click', () => {
    nextSlide();
    stopAutoTransition();
    startAutoTransition();
  });

  // Indicator click handlers
  indicators.addEventListener('click', (e) => {
    const indicator = e.target.closest('.carousel-indicator');
    if (indicator) {
      const index = parseInt(indicator.getAttribute('data-slide-index'), 10);
      showSlide(index);
      stopAutoTransition();
      startAutoTransition();
    }
  });

  // Keyboard navigation
  carouselContainer.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        prevSlide();
        stopAutoTransition();
        startAutoTransition();
        break;
      case 'ArrowRight':
        nextSlide();
        stopAutoTransition();
        startAutoTransition();
        break;
      case ' ':
      case 'Enter':
        if (e.target.classList.contains('carousel-indicator')) {
          e.preventDefault();
          e.target.click();
        }
        break;
      default:
        break;
    }
  });

  // Pause on hover/focus
  carouselContainer.addEventListener('mouseenter', () => {
    isPaused = true;
    stopAutoTransition();
  });

  carouselContainer.addEventListener('mouseleave', () => {
    isPaused = false;
    if (!document.activeElement.closest('.carousel')) {
      setTimeout(() => {
        if (!isPaused) {
          startAutoTransition();
        }
      }, 1000);
    }
  });

  carouselContainer.addEventListener('focusin', () => {
    isPaused = true;
    stopAutoTransition();
  });

  carouselContainer.addEventListener('focusout', (e) => {
    if (!carouselContainer.contains(e.relatedTarget)) {
      isPaused = false;
      setTimeout(() => {
        if (!isPaused && !document.activeElement.closest('.carousel')) {
          startAutoTransition();
        }
      }, 1000);
    }
  });

  // Optimize images after DOM structure is complete
  block.querySelectorAll('img').forEach((img) => {
    const picture = img.closest('picture');
    if (picture) {
      const optimizedPicture = createOptimizedPicture(
        img.src,
        img.alt,
        false,
        [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]
      );
      picture.replaceWith(optimizedPicture);
    }
  });

  // Initialize
  showSlide(0);
  if (autoTransition) {
    startAutoTransition();
  }
}