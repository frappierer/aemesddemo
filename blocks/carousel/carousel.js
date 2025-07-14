/*
 * Carousel Block
 *
 * Table Structure for Content Authors:
 * +----------------------------------------------------------------+
 * | Carousel | auto-transition: true, timing: 3000ms             |
 * +================================================================+
 * | ![Image Alt](image1.jpg) | Title 1 | Description 1 | Link 1   |
 * +----------------------------------------------------------------+
 * | ![Image Alt](image2.jpg) | Title 2 | Description 2 | Link 2   |
 * +----------------------------------------------------------------+
 * | ![Image Alt](image3.jpg) | Title 3 | Description 3 | Link 3   |
 * +----------------------------------------------------------------+
 *
 * First row contains block name and optional configuration
 * Subsequent rows contain: Image | Title | Description | Link
 */

import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

export default function decorate(block) {
  const config = readBlockConfig(block);
  const autoTransition = config['auto-transition'] === 'true';
  const timing = parseInt(config.timing, 10) || 3000;

  // Convert block children to structured slides
  const slides = [];
  [...block.children].forEach((row, index) => {
    // Skip first row if it contains configuration
    if (index === 0 && row.children.length === 2 && row.children[0].textContent.toLowerCase().includes('carousel')) {
      return;
    }

    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('aria-hidden', 'true');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Slide ${slides.length + 1}`);

    const cols = [...row.children];

    // Image (first column)
    if (cols[0]) {
      const imageDiv = document.createElement('div');
      imageDiv.className = 'carousel-image';
      while (cols[0].firstElementChild) {
        imageDiv.append(cols[0].firstElementChild);
      }
      slide.append(imageDiv);
    }

    // Content area (remaining columns)
    const contentDiv = document.createElement('div');
    contentDiv.className = 'carousel-content';

    // Title (second column)
    if (cols[1]) {
      const titleDiv = document.createElement('div');
      titleDiv.className = 'carousel-title';
      while (cols[1].firstElementChild) {
        titleDiv.append(cols[1].firstElementChild);
      }
      contentDiv.append(titleDiv);
    }

    // Description (third column)
    if (cols[2]) {
      const descDiv = document.createElement('div');
      descDiv.className = 'carousel-description';
      while (cols[2].firstElementChild) {
        descDiv.append(cols[2].firstElementChild);
      }
      contentDiv.append(descDiv);
    }

    // Link (fourth column)
    if (cols[3]) {
      const linkDiv = document.createElement('div');
      linkDiv.className = 'carousel-link';
      while (cols[3].firstElementChild) {
        linkDiv.append(cols[3].firstElementChild);
      }
      contentDiv.append(linkDiv);
    }

    slide.append(contentDiv);
    slides.push(slide);
  });

  if (slides.length === 0) return;

  // Create carousel container
  const carouselContainer = document.createElement('div');
  carouselContainer.className = 'carousel-container';
  carouselContainer.setAttribute('role', 'region');
  carouselContainer.setAttribute('aria-label', 'Carousel');
  carouselContainer.setAttribute('aria-live', 'polite');

  // Create slides wrapper
  const slidesWrapper = document.createElement('div');
  slidesWrapper.className = 'carousel-slides';
  slides.forEach((slide) => slidesWrapper.append(slide));

  // Create navigation controls
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Carousel controls');

  const prevButton = document.createElement('button');
  prevButton.className = 'carousel-control carousel-control-prev';
  prevButton.setAttribute('aria-label', 'Previous slide');
  prevButton.innerHTML = '<span aria-hidden="true">‹</span>';

  const nextButton = document.createElement('button');
  nextButton.className = 'carousel-control carousel-control-next';
  nextButton.setAttribute('aria-label', 'Next slide');
  nextButton.innerHTML = '<span aria-hidden="true">›</span>';

  // Auto-transition toggle
  let pauseButton;
  if (autoTransition) {
    pauseButton = document.createElement('button');
    pauseButton.className = 'carousel-pause';
    pauseButton.setAttribute('aria-label', 'Pause auto-transition');
    pauseButton.innerHTML = '<span aria-hidden="true">⏸</span>';
  }

  controls.append(prevButton, nextButton);
  if (pauseButton) controls.append(pauseButton);

  // Create indicators
  const indicators = document.createElement('div');
  indicators.className = 'carousel-indicators';
  indicators.setAttribute('role', 'tablist');
  indicators.setAttribute('aria-label', 'Slide indicators');

  slides.forEach((_, index) => {
    const indicator = document.createElement('button');
    indicator.className = 'carousel-indicator';
    indicator.setAttribute('role', 'tab');
    indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
    indicator.setAttribute('aria-selected', 'false');
    indicator.dataset.slide = index;
    indicators.append(indicator);
  });

  carouselContainer.append(slidesWrapper, controls, indicators);

  // State management
  let currentSlide = 0;
  let autoTransitionInterval;
  let isTransitioning = false;
  let isPaused = false;

  // Update slide display and accessibility
  function updateSlides() {
    slides.forEach((slide, index) => {
      if (index === currentSlide) {
        slide.classList.add('active');
        slide.setAttribute('aria-hidden', 'false');
      } else {
        slide.classList.remove('active');
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    // Update indicators
    indicators.querySelectorAll('.carousel-indicator').forEach((indicator, index) => {
      if (index === currentSlide) {
        indicator.classList.add('active');
        indicator.setAttribute('aria-selected', 'true');
      } else {
        indicator.classList.remove('active');
        indicator.setAttribute('aria-selected', 'false');
      }
    });

    // Update screen reader announcement
    carouselContainer.setAttribute('aria-live', 'polite');
    const announcement = `Slide ${currentSlide + 1} of ${slides.length}`;
    carouselContainer.setAttribute('aria-label', `Carousel - ${announcement}`);
  }

  // Navigate to specific slide
  function goToSlide(index) {
    if (isTransitioning || index === currentSlide) return;

    isTransitioning = true;
    currentSlide = index;
    updateSlides();

    setTimeout(() => {
      isTransitioning = false;
    }, 300);
  }

  // Navigate to next slide
  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }

  // Navigate to previous slide
  function prevSlide() {
    const prev = (currentSlide - 1 + slides.length) % slides.length;
    goToSlide(prev);
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

  function toggleAutoTransition() {
    isPaused = !isPaused;
    if (isPaused) {
      stopAutoTransition();
      pauseButton.setAttribute('aria-label', 'Resume auto-transition');
      pauseButton.innerHTML = '<span aria-hidden="true">▶</span>';
    } else {
      startAutoTransition();
      pauseButton.setAttribute('aria-label', 'Pause auto-transition');
      pauseButton.innerHTML = '<span aria-hidden="true">⏸</span>';
    }
  }

  // Event listeners
  prevButton.addEventListener('click', () => {
    stopAutoTransition();
    prevSlide();
    setTimeout(() => startAutoTransition(), 1000);
  });

  nextButton.addEventListener('click', () => {
    stopAutoTransition();
    nextSlide();
    setTimeout(() => startAutoTransition(), 1000);
  });

  if (pauseButton) {
    pauseButton.addEventListener('click', toggleAutoTransition);
  }

  // Indicator click handlers
  indicators.addEventListener('click', (e) => {
    if (e.target.classList.contains('carousel-indicator')) {
      const slideIndex = parseInt(e.target.dataset.slide, 10);
      stopAutoTransition();
      goToSlide(slideIndex);
      setTimeout(() => startAutoTransition(), 1000);
    }
  });

  // Keyboard navigation
  carouselContainer.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        stopAutoTransition();
        prevSlide();
        setTimeout(() => startAutoTransition(), 1000);
        break;
      case 'ArrowRight':
        e.preventDefault();
        stopAutoTransition();
        nextSlide();
        setTimeout(() => startAutoTransition(), 1000);
        break;
      case 'Home':
        e.preventDefault();
        stopAutoTransition();
        goToSlide(0);
        setTimeout(() => startAutoTransition(), 1000);
        break;
      case 'End':
        e.preventDefault();
        stopAutoTransition();
        goToSlide(slides.length - 1);
        setTimeout(() => startAutoTransition(), 1000);
        break;
      case ' ':
      case 'Spacebar':
        if (pauseButton) {
          e.preventDefault();
          toggleAutoTransition();
        }
        break;
      default:
        // No action for other keys
        break;
    }
  });

  // Pause on hover/focus
  carouselContainer.addEventListener('mouseenter', stopAutoTransition);
  carouselContainer.addEventListener('mouseleave', () => {
    setTimeout(() => startAutoTransition(), 1000);
  });

  carouselContainer.addEventListener('focusin', stopAutoTransition);
  carouselContainer.addEventListener('focusout', () => {
    setTimeout(() => startAutoTransition(), 1000);
  });

  // Respect reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion && autoTransition) {
    isPaused = true;
    if (pauseButton) {
      pauseButton.setAttribute('aria-label', 'Resume auto-transition');
      pauseButton.innerHTML = '<span aria-hidden="true">▶</span>';
    }
  }

  // Initialize
  updateSlides();
  if (!prefersReducedMotion) {
    startAutoTransition();
  }

  // Process images after DOM structure is complete
  carouselContainer.querySelectorAll('img').forEach((img) => {
    const picture = createOptimizedPicture(
      img.src,
      img.alt,
      false,
      [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }],
    );
    if (img.closest('picture')) {
      img.closest('picture').replaceWith(picture);
    } else {
      img.replaceWith(picture);
    }
  });

  // Clear block content and append new structure
  block.textContent = '';
  block.append(carouselContainer);
}
