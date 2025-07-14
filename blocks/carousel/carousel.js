import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

/**
 * How to create this block in SharePoint/Google Drive:
 * 
 * Create a table with the following structure:
 * +----------------------------------------------------------------+
 * | Carousel | auto-transition: true, timing: 3000ms, loop: true |
 * +================================================================+
 * | ![Image Alt](image1.jpg) | Title 1 | Description 1 | Link 1   |
 * +----------------------------------------------------------------+
 * | ![Image Alt](image2.jpg) | Title 2 | Description 2 | Link 2   |
 * +----------------------------------------------------------------+
 * | ![Image Alt](image3.jpg) | Title 3 | Description 3 | Link 3   |
 * +----------------------------------------------------------------+
 * 
 * First row contains settings (not rendered):
 * - auto-transition: true/false - Enable/disable auto-transition
 * - timing: 3000ms - Transition timing in milliseconds
 * - loop: true/false - Enable/disable infinite loop
 * 
 * Each content row contains:
 * - Column 1: Image with alt text
 * - Column 2: Slide title
 * - Column 3: Slide description  
 * - Column 4: Call-to-action link
 */

export default function decorate(block) {
  // Parse block configuration from first row
  const configRow = block.querySelector(':scope > div:first-child');
  let config = {
    autoTransition: false,
    timing: 3000,
    loop: true,
  };

  // Extract settings from first row if it contains configuration
  if (configRow && configRow.children.length === 2) {
    const settingsText = configRow.children[1]?.textContent || '';
    if (settingsText.includes(':')) {
      // Parse settings like "auto-transition: true, timing: 3000ms"
      const settings = settingsText.split(',').reduce((acc, setting) => {
        const [key, value] = setting.split(':').map((s) => s.trim());
        if (key && value) {
          acc[key.replace(/-/g, '')] = value;
        }
        return acc;
      }, {});

      config.autoTransition = settings.autotransition === 'true';
      config.timing = parseInt(settings.timing, 10) || 3000;
      config.loop = settings.loop !== 'false';

      // Remove config row from DOM
      configRow.remove();
    }
  }

  // Create carousel structure
  const carouselWrapper = document.createElement('div');
  carouselWrapper.className = 'carousel-wrapper';

  const slidesContainer = document.createElement('div');
  slidesContainer.className = 'carousel-slides';
  slidesContainer.setAttribute('role', 'region');
  slidesContainer.setAttribute('aria-label', 'Carousel');
  slidesContainer.setAttribute('aria-live', 'polite');

  // Convert remaining rows to slides
  const slideRows = [...block.children];
  const slides = [];

  slideRows.forEach((row, index) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-label', `Slide ${index + 1} of ${slideRows.length}`);
    slide.setAttribute('aria-hidden', index > 0 ? 'true' : 'false');

    const cols = [...row.children];
    
    // Create slide content structure
    const slideContent = document.createElement('div');
    slideContent.className = 'carousel-slide-content';

    // Process image (Column 1)
    if (cols[0]) {
      const imageWrapper = document.createElement('div');
      imageWrapper.className = 'carousel-slide-image';
      
      const img = cols[0].querySelector('img');
      if (img) {
        // Use proper breakpoints for responsive images
        const breakpoints = [
          { media: '(min-width: 600px)', width: '2000' },
          { width: '750' }
        ];
        const picture = createOptimizedPicture(img.src, img.alt, index === 0, breakpoints);
        imageWrapper.appendChild(picture);
      }
      slideContent.appendChild(imageWrapper);
    }

    // Create text content container
    const textContent = document.createElement('div');
    textContent.className = 'carousel-slide-text';

    // Process title (Column 2)
    if (cols[1] && cols[1].textContent.trim()) {
      const title = document.createElement('h3');
      title.className = 'carousel-slide-title';
      title.textContent = cols[1].textContent.trim();
      textContent.appendChild(title);
    }

    // Process description (Column 3)
    if (cols[2] && cols[2].textContent.trim()) {
      const description = document.createElement('p');
      description.className = 'carousel-slide-description';
      description.textContent = cols[2].textContent.trim();
      textContent.appendChild(description);
    }

    // Process link (Column 4)
    if (cols[3]) {
      const link = cols[3].querySelector('a');
      if (link) {
        link.className = 'carousel-slide-cta button primary';
        textContent.appendChild(link);
      }
    }

    if (textContent.children.length > 0) {
      slideContent.appendChild(textContent);
    }

    slide.appendChild(slideContent);
    slidesContainer.appendChild(slide);
    slides.push(slide);
  });

  // Clear original block content
  block.textContent = '';

  // Create controls container
  const controlsContainer = document.createElement('div');
  controlsContainer.className = 'carousel-controls';

  // Create previous button
  const prevButton = document.createElement('button');
  prevButton.className = 'carousel-control carousel-control-prev';
  prevButton.setAttribute('aria-label', 'Previous slide');
  prevButton.innerHTML = '<span aria-hidden="true">‹</span>';

  // Create next button
  const nextButton = document.createElement('button');
  nextButton.className = 'carousel-control carousel-control-next';
  nextButton.setAttribute('aria-label', 'Next slide');
  nextButton.innerHTML = '<span aria-hidden="true">›</span>';

  controlsContainer.appendChild(prevButton);
  controlsContainer.appendChild(nextButton);

  // Create indicators
  const indicatorsContainer = document.createElement('div');
  indicatorsContainer.className = 'carousel-indicators';
  indicatorsContainer.setAttribute('role', 'tablist');

  slides.forEach((_, index) => {
    const indicator = document.createElement('button');
    indicator.className = 'carousel-indicator';
    indicator.setAttribute('role', 'tab');
    indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
    indicator.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    indicator.dataset.slide = index;
    indicatorsContainer.appendChild(indicator);
  });

  // Assemble carousel
  carouselWrapper.appendChild(slidesContainer);
  carouselWrapper.appendChild(controlsContainer);
  block.appendChild(carouselWrapper);
  block.appendChild(indicatorsContainer);

  // Carousel functionality
  let currentSlide = 0;
  let autoTransitionInterval = null;
  let isPaused = false;

  function updateSlide(index) {
    // Hide all slides
    slides.forEach((slide, i) => {
      slide.classList.remove('active');
      slide.setAttribute('aria-hidden', 'true');
      
      // Update indicators
      const indicator = indicatorsContainer.children[i];
      if (indicator) {
        indicator.setAttribute('aria-selected', 'false');
        indicator.classList.remove('active');
      }
    });

    // Show current slide
    slides[index].classList.add('active');
    slides[index].setAttribute('aria-hidden', 'false');
    
    // Update current indicator
    const currentIndicator = indicatorsContainer.children[index];
    if (currentIndicator) {
      currentIndicator.setAttribute('aria-selected', 'true');
      currentIndicator.classList.add('active');
    }

    // Update ARIA live region
    slidesContainer.setAttribute('aria-label', `Carousel, slide ${index + 1} of ${slides.length}`);

    currentSlide = index;
  }

  function nextSlide() {
    if (config.loop) {
      updateSlide((currentSlide + 1) % slides.length);
    } else if (currentSlide < slides.length - 1) {
      updateSlide(currentSlide + 1);
    }
  }

  function prevSlide() {
    if (config.loop) {
      updateSlide((currentSlide - 1 + slides.length) % slides.length);
    } else if (currentSlide > 0) {
      updateSlide(currentSlide - 1);
    }
  }

  function startAutoTransition() {
    if (config.autoTransition && !isPaused && slides.length > 1) {
      autoTransitionInterval = setInterval(nextSlide, config.timing);
    }
  }

  function stopAutoTransition() {
    if (autoTransitionInterval) {
      clearInterval(autoTransitionInterval);
      autoTransitionInterval = null;
    }
  }

  function pauseAutoTransition() {
    isPaused = true;
    stopAutoTransition();
  }

  function resumeAutoTransition() {
    isPaused = false;
    // Resume after 1 second delay
    setTimeout(() => {
      if (!isPaused) {
        startAutoTransition();
      }
    }, 1000);
  }

  // Event listeners
  prevButton.addEventListener('click', () => {
    prevSlide();
    pauseAutoTransition();
    resumeAutoTransition();
  });

  nextButton.addEventListener('click', () => {
    nextSlide();
    pauseAutoTransition();
    resumeAutoTransition();
  });

  // Indicator clicks
  indicatorsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('carousel-indicator')) {
      const slideIndex = parseInt(e.target.dataset.slide, 10);
      updateSlide(slideIndex);
      pauseAutoTransition();
      resumeAutoTransition();
    }
  });

  // Keyboard navigation
  block.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        prevSlide();
        pauseAutoTransition();
        resumeAutoTransition();
        break;
      case 'ArrowRight':
        nextSlide();
        pauseAutoTransition();
        resumeAutoTransition();
        break;
      case ' ':
      case 'Enter':
        if (e.target.classList.contains('carousel-indicator')) {
          e.preventDefault();
          e.target.click();
        }
        break;
    }
  });

  // Pause on hover/focus
  carouselWrapper.addEventListener('mouseenter', pauseAutoTransition);
  carouselWrapper.addEventListener('mouseleave', resumeAutoTransition);
  carouselWrapper.addEventListener('focusin', pauseAutoTransition);
  carouselWrapper.addEventListener('focusout', (e) => {
    // Only resume if focus is leaving the carousel entirely
    if (!carouselWrapper.contains(e.relatedTarget)) {
      resumeAutoTransition();
    }
  });

  // Pause when page is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseAutoTransition();
    } else {
      resumeAutoTransition();
    }
  });

  // Handle prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  function handleReducedMotionChange() {
    if (prefersReducedMotion.matches) {
      config.autoTransition = false;
      stopAutoTransition();
    }
  }

  prefersReducedMotion.addEventListener('change', handleReducedMotionChange);
  handleReducedMotionChange();

  // Initialize
  updateSlide(0);
  startAutoTransition();

  // Ensure slides container is focusable for screen readers
  slidesContainer.setAttribute('tabindex', '0');
}