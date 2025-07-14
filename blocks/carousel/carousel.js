/**
 * Carousel Block
 * 
 * Author Instructions for Creating Carousel in SharePoint/Google Docs:
 * 
 * Create a table with the following structure:
 * 
 * Row 1: | Carousel | auto-transition: true, timing: 3000 |
 * Row 2: | ![Image Alt](image1.jpg) | Title 1 | Description 1 | [Link Text](/link1) |
 * Row 3: | ![Image Alt](image2.jpg) | Title 2 | Description 2 | [Link Text](/link2) |
 * Row 4: | ![Image Alt](image3.jpg) | Title 3 | Description 3 | [Link Text](/link3) |
 * 
 * First row contains block name and optional settings:
 * - auto-transition: true/false (default: false)
 * - timing: milliseconds between slides (default: 3000, range: 1000-10000)
 * 
 * Each content row contains:
 * - Column 1: Image
 * - Column 2: Title
 * - Column 3: Description
 * - Column 4: Link (optional)
 */

import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

export default function decorate(block) {
  // Parse settings from first row if it contains configuration
  let config = { autoTransition: false, timing: 3000 };
  const firstRow = block.children[0];
  
  if (firstRow && firstRow.children.length === 2) {
    const firstCell = firstRow.children[0].textContent.trim().toLowerCase();
    const secondCell = firstRow.children[1].textContent.trim();
    
    if (firstCell === 'carousel' && secondCell.includes(':')) {
      // Parse settings
      const settings = secondCell.split(',').reduce((acc, setting) => {
        const [key, value] = setting.split(':').map(s => s.trim());
        if (key === 'auto-transition') {
          acc.autoTransition = value === 'true';
        } else if (key === 'timing') {
          const timing = parseInt(value, 10);
          if (timing >= 1000 && timing <= 10000) {
            acc.timing = timing;
          }
        }
        return acc;
      }, config);
      
      config = settings;
      // Remove settings row from DOM
      firstRow.remove();
    }
  }

  // Create carousel structure
  const carousel = document.createElement('div');
  carousel.className = 'carousel-container';
  carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-label', 'Image carousel');
  
  // Create slides container
  const slidesContainer = document.createElement('div');
  slidesContainer.className = 'carousel-slides';
  slidesContainer.setAttribute('aria-live', 'polite');
  
  // Create navigation
  const navigation = document.createElement('nav');
  navigation.className = 'carousel-navigation';
  navigation.setAttribute('aria-label', 'Carousel navigation');
  
  // Create controls container
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  
  // Process slides
  const slides = [];
  [...block.children].forEach((row, index) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'tabpanel');
    slide.setAttribute('id', `carousel-slide-${index}`);
    slide.setAttribute('aria-label', `Slide ${index + 1}`);
    
    const [imageCol, titleCol, descCol, linkCol] = row.children;
    
    // Create slide content container
    const slideContent = document.createElement('div');
    slideContent.className = 'carousel-slide-content';
    
    // Process image
    if (imageCol) {
      const img = imageCol.querySelector('img');
      if (img) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'carousel-slide-image';
        imageWrapper.append(imageCol.firstElementChild);
        slideContent.append(imageWrapper);
      }
    }
    
    // Create text content container
    const textContent = document.createElement('div');
    textContent.className = 'carousel-slide-text';
    
    // Process title
    if (titleCol && titleCol.textContent.trim()) {
      const title = document.createElement('h3');
      title.className = 'carousel-slide-title';
      title.textContent = titleCol.textContent.trim();
      textContent.append(title);
    }
    
    // Process description
    if (descCol && descCol.textContent.trim()) {
      const desc = document.createElement('p');
      desc.className = 'carousel-slide-description';
      desc.textContent = descCol.textContent.trim();
      textContent.append(desc);
    }
    
    // Process link
    if (linkCol) {
      const link = linkCol.querySelector('a');
      if (link) {
        link.className = 'carousel-slide-link';
        textContent.append(link);
      }
    }
    
    if (textContent.children.length > 0) {
      slideContent.append(textContent);
    }
    
    slide.append(slideContent);
    slides.push(slide);
    slidesContainer.append(slide);
    
    // Create indicator button
    const indicator = document.createElement('button');
    indicator.className = 'carousel-indicator';
    indicator.setAttribute('role', 'tab');
    indicator.setAttribute('aria-controls', `carousel-slide-${index}`);
    indicator.setAttribute('aria-label', `Go to slide ${index + 1}`);
    indicator.dataset.slide = index;
    navigation.append(indicator);
  });
  
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
  
  // Add controls
  controls.append(prevButton, nextButton);
  
  // Carousel state
  let currentSlide = 0;
  let autoTransitionInterval = null;
  let isPaused = false;
  
  // Update slide visibility and ARIA attributes
  function showSlide(index) {
    slides.forEach((slide, i) => {
      const isActive = i === index;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', !isActive);
    });
    
    // Update indicators
    navigation.querySelectorAll('.carousel-indicator').forEach((indicator, i) => {
      const isActive = i === index;
      indicator.classList.toggle('active', isActive);
      indicator.setAttribute('aria-selected', isActive);
      indicator.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    
    // Update current slide
    currentSlide = index;
    
    // Announce to screen readers
    const announcement = `Slide ${index + 1} of ${slides.length}`;
    slidesContainer.setAttribute('aria-label', announcement);
  }
  
  // Navigate to specific slide
  function goToSlide(index) {
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    showSlide(index);
  }
  
  // Auto-transition functions
  function startAutoTransition() {
    if (config.autoTransition && !isPaused && slides.length > 1) {
      autoTransitionInterval = setInterval(() => {
        goToSlide(currentSlide + 1);
      }, config.timing);
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
    setTimeout(() => {
      if (!isPaused) {
        startAutoTransition();
      }
    }, 1000);
  }
  
  // Event listeners
  prevButton.addEventListener('click', () => {
    goToSlide(currentSlide - 1);
    pauseAutoTransition();
    resumeAutoTransition();
  });
  
  nextButton.addEventListener('click', () => {
    goToSlide(currentSlide + 1);
    pauseAutoTransition();
    resumeAutoTransition();
  });
  
  // Indicator click handlers
  navigation.addEventListener('click', (e) => {
    if (e.target.classList.contains('carousel-indicator')) {
      const slideIndex = parseInt(e.target.dataset.slide, 10);
      goToSlide(slideIndex);
      pauseAutoTransition();
      resumeAutoTransition();
    }
  });
  
  // Keyboard navigation
  carousel.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft':
        goToSlide(currentSlide - 1);
        pauseAutoTransition();
        resumeAutoTransition();
        break;
      case 'ArrowRight':
        goToSlide(currentSlide + 1);
        pauseAutoTransition();
        resumeAutoTransition();
        break;
      case 'Home':
        goToSlide(0);
        pauseAutoTransition();
        resumeAutoTransition();
        break;
      case 'End':
        goToSlide(slides.length - 1);
        pauseAutoTransition();
        resumeAutoTransition();
        break;
    }
  });
  
  // Pause on hover/focus
  carousel.addEventListener('mouseenter', pauseAutoTransition);
  carousel.addEventListener('mouseleave', resumeAutoTransition);
  carousel.addEventListener('focusin', pauseAutoTransition);
  carousel.addEventListener('focusout', (e) => {
    // Only resume if focus is leaving the carousel entirely
    if (!carousel.contains(e.relatedTarget)) {
      resumeAutoTransition();
    }
  });
  
  // Handle prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (prefersReducedMotion.matches) {
    config.autoTransition = false;
  }
  
  prefersReducedMotion.addEventListener('change', (e) => {
    if (e.matches) {
      config.autoTransition = false;
      stopAutoTransition();
    }
  });
  
  // Assemble carousel
  carousel.append(slidesContainer, navigation, controls);
  
  // Clear original content and add new structure
  block.textContent = '';
  block.append(carousel);
  
  // Process images with proper breakpoints after DOM is ready
  carousel.querySelectorAll('img').forEach((img) => {
    const optimizedPicture = createOptimizedPicture(
      img.src,
      img.alt,
      false,
      [{ media: '(min-width: 600px)', width: '2000' }, { width: '750' }]
    );
    img.closest('picture').replaceWith(optimizedPicture);
  });
  
  // Initialize first slide
  showSlide(0);
  
  // Start auto-transition if enabled
  if (config.autoTransition && slides.length > 1) {
    startAutoTransition();
  }
}