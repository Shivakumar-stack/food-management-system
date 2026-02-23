// Newsletter Form Handler
document.getElementById('newsletterForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('newsletterEmail').value;
  const messageDiv = document.getElementById('newsletterMessage');

  try {
    const result = await contactService.subscribeNewsletter(email);
    ui.showAlert(result.message, 'success', messageDiv);
    this.reset();
  } catch (error) {
    ui.showAlert(error.message || 'Failed to subscribe. Please try again.', 'error', messageDiv);
  }
});

// Contact Form Handler
document.getElementById('contactForm')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  const formData = new FormData(this);
  const data = Object.fromEntries(formData);
  const messageDiv = document.getElementById('contactMessage');
  const submitBtn = this.querySelector('button[type="submit"]');

  ui.setButtonLoading(submitBtn, true);

  try {
    const result = await contactService.submit(data);
    ui.showAlert(result.message, 'success', messageDiv);
    this.reset();
  } catch (error) {
    ui.showAlert(error.message || 'Failed to send message. Please try again.', 'error', messageDiv);
  } finally {
    ui.setButtonLoading(submitBtn, false);
  }
});

// FAQ Accordion Handler
const faqItems = Array.from(document.querySelectorAll('.faq-accordion-item'));

if (faqItems.length) {
  const setItemState = (item, isOpen) => {
    const toggle = item.querySelector('.faq-toggle');
    item.classList.toggle('is-open', isOpen);
    if (toggle) {
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  };

  let hasOpenItem = false;

  faqItems.forEach((item) => {
    const toggle = item.querySelector('.faq-toggle');
    if (!toggle) return;

    const initiallyOpen = item.classList.contains('is-open');
    setItemState(item, initiallyOpen);
    hasOpenItem = hasOpenItem || initiallyOpen;

    toggle.addEventListener('click', () => {
      const shouldOpen = !item.classList.contains('is-open');
      faqItems.forEach((faqItem) => setItemState(faqItem, false));
      if (shouldOpen) {
        setItemState(item, true);
      }
    });
  });

  if (!hasOpenItem && faqItems[0]) {
    setItemState(faqItems[0], true);
  }
}

// Scroll reveal animation for premium sections
const revealItems = Array.from(document.querySelectorAll('.reveal-on-scroll'));

if (revealItems.length) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -30px 0px' });

    revealItems.forEach((item) => revealObserver.observe(item));
  }
}

// Testimonials carousel with autoplay, arrows, and pagination
const testimonialSection = document.querySelector('.home-social-proof');

if (testimonialSection) {
  const track = testimonialSection.querySelector('.testimonial-track');
  const cards = track ? Array.from(track.querySelectorAll('.testimonial-card')) : [];
  const prevButton = testimonialSection.querySelector('.testimonial-nav-prev');
  const nextButton = testimonialSection.querySelector('.testimonial-nav-next');
  const dotsContainer = testimonialSection.querySelector('.testimonial-pagination');
  const reduceMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');

  let currentSlide = 0;
  let autoplayTimer = null;
  let dotButtons = [];
  let currentDotCount = -1;

  if (track && cards.length > 1 && prevButton && nextButton && dotsContainer) {
    const getCardsPerView = () => {
      if (window.innerWidth <= 768) return 1;
      if (window.innerWidth <= 1024) return 2;
      return 3;
    };

    const getMaxSlide = () => Math.max(0, cards.length - getCardsPerView());

    const setVisibleCardState = () => {
      const cardsPerView = getCardsPerView();
      const visibleStart = currentSlide;
      const visibleEnd = currentSlide + cardsPerView - 1;

      cards.forEach((card, index) => {
        const isVisible = index >= visibleStart && index <= visibleEnd;
        card.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
      });
    };

    const syncDots = () => {
      dotButtons.forEach((dot, index) => {
        const isActive = index === currentSlide;
        dot.classList.toggle('is-active', isActive);
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
        dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
        dot.setAttribute('tabindex', isActive ? '0' : '-1');
      });
    };

    const renderDots = () => {
      const dotCount = getMaxSlide() + 1;
      if (dotCount === currentDotCount) return;

      dotsContainer.innerHTML = '';
      dotButtons = [];
      currentDotCount = dotCount;

      for (let index = 0; index < dotCount; index += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'testimonial-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Show testimonial slide ${index + 1}`);
        dot.addEventListener('click', () => {
          goToSlide(index, true);
        });
        dotsContainer.appendChild(dot);
        dotButtons.push(dot);
      }
    };

    const updatePosition = () => {
      const maxSlide = getMaxSlide();
      if (currentSlide > maxSlide) {
        currentSlide = maxSlide;
      }

      prevButton.disabled = maxSlide === 0;
      nextButton.disabled = maxSlide === 0;

      const offset = cards[currentSlide] ? cards[currentSlide].offsetLeft - cards[0].offsetLeft : 0;
      track.style.transform = `translateX(-${offset}px)`;
      setVisibleCardState();
      syncDots();
    };

    const stopAutoplay = () => {
      if (!autoplayTimer) return;
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    };

    const startAutoplay = () => {
      stopAutoplay();
      if (reduceMotionMedia.matches || getMaxSlide() === 0) return;

      autoplayTimer = window.setInterval(() => {
        goToSlide(currentSlide + 1, false);
      }, 5500);
    };

    function goToSlide(index, restartAutoplay) {
      const maxSlide = getMaxSlide();
      if (maxSlide === 0) {
        currentSlide = 0;
      } else if (index > maxSlide) {
        currentSlide = 0;
      } else if (index < 0) {
        currentSlide = maxSlide;
      } else {
        currentSlide = index;
      }

      renderDots();
      updatePosition();

      if (restartAutoplay) {
        startAutoplay();
      }
    }

    prevButton.addEventListener('click', () => goToSlide(currentSlide - 1, true));
    nextButton.addEventListener('click', () => goToSlide(currentSlide + 1, true));

    testimonialSection.addEventListener('mouseenter', stopAutoplay);
    testimonialSection.addEventListener('mouseleave', startAutoplay);
    testimonialSection.addEventListener('focusin', stopAutoplay);
    testimonialSection.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!testimonialSection.contains(document.activeElement)) {
          startAutoplay();
        }
      }, 0);
    });

    const handleResize = () => {
      goToSlide(currentSlide, false);
      startAutoplay();
    };

    let resizeFrame = null;
    window.addEventListener('resize', () => {
      if (resizeFrame !== null) {
        window.cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = window.requestAnimationFrame(() => {
        handleResize();
        resizeFrame = null;
      });
    });

    const handleMotionPreferenceChange = () => {
      if (reduceMotionMedia.matches) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    };

    if (typeof reduceMotionMedia.addEventListener === 'function') {
      reduceMotionMedia.addEventListener('change', handleMotionPreferenceChange);
    } else if (typeof reduceMotionMedia.addListener === 'function') {
      reduceMotionMedia.addListener(handleMotionPreferenceChange);
    }

    goToSlide(0, false);
    startAutoplay();
  }
}
