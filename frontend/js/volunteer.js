/**
     * FoodBridge - Volunteer Page JavaScript
     * Handles volunteer form, animations, and interactions
     */

    // Navigation is initialized by js/app.js.

    
    // FORM VALIDATION
    

    function validateVolunteerForm(form) {
      let isValid = true;
      const errors = [];
      
      const inputs = form.querySelectorAll('input, select');
      const firstName = inputs[0];
      const lastName = inputs[1];
      const email = inputs[2];
      const phone = inputs[3];
      const role = inputs[4];
      const city = inputs[5];
      
      // Validate first name
      if (!firstName?.value.trim()) {
        errors.push('First name is required');
        highlightField(firstName, false);
        isValid = false;
      } else if (firstName.value.trim().length < 2) {
        errors.push('First name must be at least 2 characters');
        highlightField(firstName, false);
        isValid = false;
      } else {
        highlightField(firstName, true);
      }
      
      // Validate last name
      if (!lastName?.value.trim()) {
        errors.push('Last name is required');
        highlightField(lastName, false);
        isValid = false;
      } else if (lastName.value.trim().length < 2) {
        errors.push('Last name must be at least 2 characters');
        highlightField(lastName, false);
        isValid = false;
      } else {
        highlightField(lastName, true);
      }
      
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email?.value.trim()) {
        errors.push('Email address is required');
        highlightField(email, false);
        isValid = false;
      } else if (!emailRegex.test(email.value)) {
        errors.push('Please enter a valid email address');
        highlightField(email, false);
        isValid = false;
      } else {
        highlightField(email, true);
      }
      
      // Validate phone
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
      if (!phone?.value.trim()) {
        errors.push('Phone number is required');
        highlightField(phone, false);
        isValid = false;
      } else if (!phoneRegex.test(phone.value) || phone.value.replace(/\D/g, '').length < 10) {
        errors.push('Please enter a valid phone number (at least 10 digits)');
        highlightField(phone, false);
        isValid = false;
      } else {
        highlightField(phone, true);
      }
      
      // Validate role
      if (!role?.value) {
        errors.push('Please select a preferred role');
        highlightField(role, false);
        isValid = false;
      } else {
        highlightField(role, true);
      }
      
      // Validate city
      if (!city?.value) {
        errors.push('Please select your city');
        highlightField(city, false);
        isValid = false;
      } else {
        highlightField(city, true);
      }
      
      // Check if at least one day is selected
      const dayCheckboxes = form.querySelectorAll('input[name="days"]:checked');
      if (dayCheckboxes.length === 0) {
        errors.push('Please select at least one available day');
        isValid = false;
        
        // Visual feedback for checkboxes
        const grid = form.querySelector('.grid-cols-7');
        if(grid) {
          grid.classList.add('ring-2', 'ring-red-500', 'rounded-lg', 'p-1');
          setTimeout(() => grid.classList.remove('ring-2', 'ring-red-500', 'rounded-lg', 'p-1'), 3000);
        }
      }
      
      if (!isValid && errors.length > 0) {
        showToast(errors[0], 'error');
      }
      
      return isValid;
    }

    function highlightField(field, isValid) {
      if (!field) return;
      
      if (isValid) {
        field.style.borderColor = '#22c55e';
        field.style.background = '#f0fdf4';
      } else {
        field.style.borderColor = '#dc2626';
        field.style.background = '#fef2f2';
      }
      
      field.addEventListener('input', () => {
        field.style.borderColor = '';
        field.style.background = '';
      }, { once: true });
      
      field.addEventListener('change', () => {
        field.style.borderColor = '';
        field.style.background = '';
      }, { once: true });
    }

    
    // FORM SUBMISSION
    

    async function handleVolunteerSubmit(e) {
      e.preventDefault();
      const form = e.target;
      
      if (!validateVolunteerForm(form)) {
        return;
      }
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerHTML;
      
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      submitBtn.disabled = true;
      
      // Collect form data
      const formData = new FormData(form);
      const volunteerData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        role: formData.get('role'),
        city: formData.get('city'),
        days: []
      };
      
      // Get selected days
      form.querySelectorAll('input[name="days"]:checked').forEach(cb => {
        volunteerData.days.push(cb.value);
      });
      
      try {
        // Submit to backend using contactService
        if (typeof contactService !== 'undefined' && contactService.submitVolunteer) {
          const response = await contactService.submitVolunteer(volunteerData);
          
          if (response.success) {
            showToast('Application submitted successfully! We\'ll contact you soon.', 'success');
            form.reset();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            showToast(response.message || 'Failed to submit application. Please try again.', 'error');
          }
        } else {
          // Fallback if contactService is not available
          console.error('contactService not available');
          showToast('Service temporarily unavailable. Please try again later.', 'error');
        }
      } catch (error) {
        console.error('Volunteer submission error:', error);
        showToast(error.message || 'Failed to submit application. Please try again.', 'error');
      } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
      }
    }

    
    // SMOOTH SCROLL
    

    function initSmoothScroll() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          const targetId = this.getAttribute('href');
          const target = document.querySelector(targetId);
          
          if (target) {
            const offset = 100;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
            
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        });
      });
    }

    
    // COUNTER ANIMATION
    

    function initCounterAnimation() {
      const counters = document.querySelectorAll('.text-3xl.font-bold');
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const counter = entry.target;
            const text = counter.textContent;
            const numericValue = parseInt(text.replace(/[^0-9]/g, ''));
            const suffix = text.replace(/[0-9]/g, '');
            
            if (!isNaN(numericValue)) {
              animateCounter(counter, numericValue, suffix);
            }
            
            observer.unobserve(counter);
          }
        });
      }, { threshold: 0.5 });
      
      counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(element, target, suffix) {
      const duration = 2000;
      const increment = target / (duration / 16);
      let current = 0;
      
      const updateCount = () => {
        current += increment;
        if (current < target) {
          element.textContent = Math.ceil(current).toLocaleString() + suffix;
          requestAnimationFrame(updateCount);
        } else {
          element.textContent = target.toLocaleString() + suffix;
        }
      };
      
      updateCount();
    }

    
    // UTILITY FUNCTIONS
    

    function showToast(message, type = 'success') {
      const existing = document.querySelectorAll('.toast');
      existing.forEach(t => t.remove());
      
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      // Add Tailwind classes for toast
      toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 translate-y-0 ${type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`;
      
      toast.innerHTML = `
        <span class="text-xl">
          <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        </span>
        <span class="font-medium">${message}</span>
      `;
      
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    
    // SCROLL REVEAL
    

    function initScrollReveal() {
      const revealItems = Array.from(document.querySelectorAll('.reveal-on-scroll'));

      if (!revealItems.length) return;

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
        revealItems.forEach((item) => item.classList.add('is-visible'));
        return;
      }

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.18, rootMargin: '0px 0px -30px 0px' });

      revealItems.forEach((item) => observer.observe(item));
    }


    // TESTIMONIALS CAROUSEL
    

    function initTestimonialsCarousel() {
      const testimonialSection = document.querySelector('.home-social-proof');
      if (!testimonialSection) return;

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

      if (!track || cards.length <= 1 || !prevButton || !nextButton || !dotsContainer) {
        return;
      }

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

      let resizeFrame = null;
      window.addEventListener('resize', () => {
        if (resizeFrame !== null) {
          window.cancelAnimationFrame(resizeFrame);
        }
        resizeFrame = window.requestAnimationFrame(() => {
          goToSlide(currentSlide, false);
          startAutoplay();
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


    // INITIALIZATION
    

    document.addEventListener('DOMContentLoaded', () => {
      const volunteerForm = document.getElementById('volunteerForm');
      if (volunteerForm) {
        volunteerForm.addEventListener('submit', handleVolunteerSubmit);
      }
      
      initSmoothScroll();
      initCounterAnimation();
      initScrollReveal();
      initTestimonialsCarousel();
    });
