/**
 * FoodBridge - Main JavaScript
 * Handles mobile menu, navigation, and common interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFAQ();
  initSmoothScroll();
  initNavbarScroll();
});

/**
 * Mobile Menu Toggle
 */
function initMobileMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuIcon = document.getElementById('menuIcon');

  if (!menuBtn || !mobileMenu) return;

  menuBtn.addEventListener('click', () => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    menuBtn.setAttribute('aria-expanded', !isExpanded);
    mobileMenu.classList.toggle('hidden');
    
    if (menuIcon) {
      menuIcon.classList.toggle('fa-bars');
      menuIcon.classList.toggle('fa-times');
    }
    
    // Animate mobile menu
    if (!mobileMenu.classList.contains('hidden')) {
      mobileMenu.style.animation = 'slideDown 0.3s ease-out';
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (menuIcon) {
        menuIcon.classList.add('fa-bars');
        menuIcon.classList.remove('fa-times');
      }
    }
  });
}

/**
 * FAQ Accordion
 */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    
    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const otherQuestion = otherItem.querySelector('.faq-question');
          if (otherQuestion) {
            otherQuestion.setAttribute('aria-expanded', 'false');
          }
        }
      });
      
      // Toggle current item
      item.classList.toggle('active', !isActive);
      question.setAttribute('aria-expanded', isActive ? 'false' : 'true');
    });
  });
}

/**
 * Smooth Scroll for anchor links
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 80;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/**
 * Navbar scroll effect
 */
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

/**
 * Toast notification helper
 */
function showToast(message, type = 'success') {
  // Remove existing toasts
  const existing = document.querySelectorAll('.toast');
  existing.forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-size: 1.25rem;">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    </span>
    <span>${message}</span>
  `;
  
  // Add toast styles if not already in page
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 9999;
        animation: slideInRight 0.3s ease-out;
        font-weight: 500;
      }
      .toast-success {
        border-left: 4px solid #22c55e;
      }
      .toast-success i {
        color: #22c55e;
      }
      .toast-error {
        border-left: 4px solid #dc2626;
      }
      .toast-error i {
        color: #dc2626;
      }
      .toast-info {
        border-left: 4px solid #3b82f6;
      }
      .toast-info i {
        color: #3b82f6;
      }
      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(100px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Export for use in other scripts
window.FoodBridge = {
  showToast
};
