/**
 * FoodBridge - Auth Guard Module
 * Handles route protection and auth-based overlays for static pages.
 */

const AuthGuard = {
  protectedRoutes: [
    {
      path: '/dashboard.html',
      mode: 'redirect',
      redirect: 'login.html',
      message: 'Please log in to view your dashboard'
    },
    {
      path: '/volunteer-pickups.html',
      mode: 'redirect',
      redirect: 'login.html',
      message: 'Please log in to access volunteer pickups'
    },
    {
      path: '/ngo-claims.html',
      mode: 'redirect',
      redirect: 'login.html',
      message: 'Please log in to access NGO claims'
    },
    {
      path: '/admin-analytics.html',
      mode: 'redirect',
      redirect: 'login.html',
      message: 'Please log in to access admin analytics'
    },
    {
      path: '/my-donations.html',
      mode: 'redirect',
      redirect: 'login.html',
      message: 'Please log in to access donations'
    }
  ],

  /**
   * Initialize auth guard
   */
  init() {
    this.checkCurrentRoute();

    if (typeof navigation !== 'undefined' && typeof navigation.updateNavForAuth === 'function') {
      navigation.updateNavForAuth();
    }
  },

  /**
   * Get route configuration for the current path
   */
  getCurrentRoute() {
    const currentPath = (window.location.pathname || '').toLowerCase();
    return this.protectedRoutes.find((route) =>
      currentPath.includes(route.path.toLowerCase())
    );
  },

  /**
   * Mark auth checks as complete (used to prevent flash of protected content)
   */
  markAuthResolved() {
    document.body.classList.remove('auth-loading');
    document.body.classList.add('auth-resolved');
  },

  /**
   * Show overlay-based access blocker for protected pages
   */
  showAccessOverlay(route) {
    const protectedContent = route.contentId
      ? document.getElementById(route.contentId)
      : document.querySelector('[data-protected-content]');
    const overlay = route.overlayId ? document.getElementById(route.overlayId) : null;

    if (protectedContent) {
      protectedContent.classList.add('blurred');
      protectedContent.setAttribute('aria-hidden', 'true');
    }

    if (!overlay) {
      this.redirectToLogin(route.message || 'Please log in to continue');
      return;
    }

    const titleEl = overlay.querySelector('[data-auth-title]');
    const messageEl = overlay.querySelector('[data-auth-message]');
    const actionBtn = overlay.querySelector('[data-auth-action]');

    if (titleEl && route.title) {
      titleEl.textContent = route.title;
    }

    if (messageEl && route.message) {
      messageEl.textContent = route.message;
    }

    if (actionBtn && !actionBtn.dataset.authBound) {
      actionBtn.dataset.authBound = 'true';
      actionBtn.addEventListener('click', () => {
        window.location.href = 'login.html';
      });
    }

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  },

  /**
   * Hide route access overlay
   */
  hideAccessOverlay(route) {
    const protectedContent = route.contentId
      ? document.getElementById(route.contentId)
      : document.querySelector('[data-protected-content]');
    const overlay = route.overlayId ? document.getElementById(route.overlayId) : null;

    if (protectedContent) {
      protectedContent.classList.remove('blurred');
      protectedContent.removeAttribute('aria-hidden');
    }

    if (overlay) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }

    document.body.classList.remove('no-scroll');
  },

  /**
   * Redirect to login while storing intended destination
   */
  redirectToLogin(message = 'Please log in to continue') {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = `login.html?message=${encodeURIComponent(message)}`;
  },

  /**
   * Check if current route requires authentication
   */
  checkCurrentRoute() {
    if (typeof authService === 'undefined') {
      this.markAuthResolved();
      return true;
    }

    const route = this.getCurrentRoute();
    if (!route) {
      this.markAuthResolved();
      return true;
    }

    const isLoggedIn = authService.isLoggedIn();
    if (isLoggedIn) {
      const user = authService.getUser();
      const role = user?.role || '';
      if (Array.isArray(route.allowedRoles) && route.allowedRoles.length > 0) {
        const allowed = route.allowedRoles.includes(role);
        if (!allowed) {
          if (route.mode === 'redirect') {
            window.location.href = `dashboard.html?message=${encodeURIComponent('You are not authorized to access that page.')}`;
            return false;
          }

          this.showAccessOverlay({
            ...route,
            title: route.title || 'Access Restricted',
            message: 'Your account role does not have access to this page.'
          });
          this.markAuthResolved();
          return false;
        }
      }

      this.hideAccessOverlay(route);
      this.markAuthResolved();
      return true;
    }

    // Store intended destination for post-login redirect
    sessionStorage.setItem('redirectAfterLogin', window.location.href);

    if (route.mode === 'redirect') {
      window.location.href = `${route.redirect || 'login.html'}?message=${encodeURIComponent(route.message || 'Please log in to continue')}`;
      return false;
    }

    this.showAccessOverlay(route);
    this.markAuthResolved();
    return false;
  },


  /**
   * Require authentication for specific action
   */
  requireAuth(callback, message = 'Please log in to continue') {
    if (authService.isLoggedIn()) {
      callback();
      return;
    }

    this.redirectToLogin(message);
  },

  /**
   * Handle post-login redirect
   */
  handlePostLoginRedirect(defaultPath = 'dashboard.html') {
    authService.redirectAfterLogin(defaultPath);
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    AuthGuard.init();
  } catch (error) {
    console.error('AuthGuard initialization failed:', error);
    AuthGuard.markAuthResolved();
  }

  // Fail-safe: never keep protected content in loading state indefinitely.
  window.setTimeout(() => {
    if (document.body.classList.contains('auth-loading')) {
      AuthGuard.markAuthResolved();
    }
  }, 1500);
});

// Export for global access
window.AuthGuard = AuthGuard;
