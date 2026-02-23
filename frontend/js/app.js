/**
 * FoodBridge - Main Application JavaScript
 * Handles API calls, authentication, and UI interactions
 */


const AUTH_STORAGE_KEYS = {
  token: 'foodbridge_token',
  user: 'foodbridge_user',
  legacyToken: 'token',
  legacyUser: 'user'
};


// API Service


const apiService = {
  resolveErrorMessage(data, statusCode) {
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const firstError = data.errors[0];
      return firstError?.msg || firstError?.message || data.message || `Request failed with status ${statusCode}`;
    }

    return data?.message || `Request failed with status ${statusCode}`;
  },

  /**
   * Make API request with authentication
   */
  async request(endpoint, options = {}) {
    // Check if appConfig is available
    if (!window.appConfig || !window.appConfig.API_BASE_URL) {
      console.error('[API] ERROR: appConfig.API_BASE_URL is not defined!');
      throw new Error('API configuration not available. Please refresh the page.');
    }
    
    const url = `${window.appConfig.API_BASE_URL}${endpoint}`;
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    
    // Get token from auth service storage
    const token = typeof authService !== 'undefined' ? authService.getToken() : null;
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add auth token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      console.log('[API] Sending request with headers:', headers);
      const response = await fetch(url, {
        ...options,
        headers
      });

      console.log(`[API] Response status: ${response.status}`);
      
      let data = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
        console.log('[API] Response data:', data);
      }
      
      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          // Token expired or invalid
          console.log('[API] 401 Unauthorized - Token invalid or expired');
          if (typeof authService !== 'undefined') {
            authService.logout(null);
          }
          window.location.href = 'login.html?error=session_expired';
          throw new Error('Session expired. Please log in again.');
        }
        
        const requestError = new Error(this.resolveErrorMessage(data, response.status));
        requestError.status = response.status;
        requestError.code = data?.code || null;
        requestError.details = data?.data || null;
        requestError.raw = data || null;
        throw requestError;
      }
      
      return data;
    } catch (error) {
      console.error('[API] Request error:', error);
      throw error;
    }
  },
  
  // GET request
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  // POST request
  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  
  // PUT request
  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },
  
  // DELETE request
  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};


// Authentication Service


const authService = {
  clearSession() {
    const keys = [
      AUTH_STORAGE_KEYS.token,
      AUTH_STORAGE_KEYS.user,
      AUTH_STORAGE_KEYS.legacyToken,
      AUTH_STORAGE_KEYS.legacyUser
    ];

    keys.forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  },

  decodeTokenPayload(token) {
    try {
      const base64 = token.split('.')[1];
      if (!base64) return null;
      const normalized = base64.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch (error) {
      return null;
    }
  },

  isTokenExpired(token) {
    const payload = this.decodeTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }
    // Add 10 second buffer to prevent edge cases
    return Date.now() >= (payload.exp * 1000) - 10000;
  },

  getToken() {
    const token =
      sessionStorage.getItem(AUTH_STORAGE_KEYS.token) ||
      localStorage.getItem(AUTH_STORAGE_KEYS.token) ||
      sessionStorage.getItem(AUTH_STORAGE_KEYS.legacyToken) ||
      localStorage.getItem(AUTH_STORAGE_KEYS.legacyToken);

    if (!token) return null;

    sessionStorage.setItem(AUTH_STORAGE_KEYS.token, token);
    return token;
  },

  isLoggedIn() {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) {
      this.clearSession();
      return false;
    }
    return true;
  },

  getUser() {
    const user =
      sessionStorage.getItem(AUTH_STORAGE_KEYS.user) ||
      localStorage.getItem(AUTH_STORAGE_KEYS.user) ||
      sessionStorage.getItem(AUTH_STORAGE_KEYS.legacyUser) ||
      localStorage.getItem(AUTH_STORAGE_KEYS.legacyUser);

    try {
      if (!user) return null;
      return JSON.parse(user);
    } catch (error) {
      this.clearSession();
      return null;
    }
  },

  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  async register(userData) {
    const data = await apiService.post('/auth/register', userData);
    if (data.success) {
      this.setSession(data.data.token, data.data.user);
      // Small delay to ensure session is stored before redirect
      setTimeout(() => {
        this.redirectByRole();
      }, 100);
    }
    return data;
  },

  async login(email, password) {
    console.log('[Auth] Attempting login for:', email);
    try {
      const data = await apiService.post('/auth/login', { email, password });
      console.log('[Auth] Login response:', data);
      
      if (data.success) {
        console.log('[Auth] Login successful, setting session');
        this.setSession(data.data.token, data.data.user);
        return data;
      } else {
        console.error('[Auth] Login failed:', data.message);
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  },

  logout(redirectTo = 'index.html') {
    this.clearSession();
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  },

  setSession(token, user) {
    this.clearSession();
    sessionStorage.setItem(AUTH_STORAGE_KEYS.token, token);
    sessionStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
    console.log('Session set successfully for user:', user.email);
  },

  updateUser(userData) {
    sessionStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(userData));
  },

  // SINGLE DASHBOARD
  redirectByRole() {
    const user = this.getUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Everyone goes to the same dashboard
    window.location.href = 'dashboard.html';
  },

  redirectAfterLogin(defaultPath = 'dashboard.html') {
    // Check if there's a stored redirect URL
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectAfterLogin');
      window.location.href = redirectUrl;
    } else {
      window.location.href = defaultPath;
    }
  },

  async getDashboard() {
    return await apiService.get('/auth/dashboard');
  },

  async updateProfile(profileData) {
    const data = await apiService.put('/auth/profile', profileData);
    if (data.success) {
      this.updateUser(data.data.user);
    }
    return data;
  },

  async changePassword(currentPassword, newPassword) {
    return await apiService.put('/auth/change-password', {
      currentPassword,
      newPassword
    });
  }
};


// Donation Service


const donationService = {
  /**
   * Create new donation
   */
  async create(donationData) {
    return await apiService.post('/donations', donationData);
  },
  
  /**
   * Get all donations
   */
  async getAll(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/donations?${queryParams}` : '/donations';
    return await apiService.get(endpoint);
  },

  async getPublicMap(filters = {}) {
    const queryParams = new URLSearchParams(filters).toString();
    const endpoint = queryParams ? `/donations/public-map?${queryParams}` : '/donations/public-map';
    return await apiService.get(endpoint);
  },
  
  /**
   * Get donation by ID
   */
  async getById(id) {
    return await apiService.get(`/donations/${id}`);
  },
  
  /**
   * Update donation status
   */
  async updateStatus(id, status, notes = '') {
    return await apiService.put(`/donations/${id}/status`, { status, notes });
  },
  
  /**
   * Get donation statistics
   */
  async getStats() {
    return await apiService.get('/donations/stats/overview');
  },

  /**
   * Get weekly donation trend (last 7 days)
   */
  async getWeeklyStats() {
    return await apiService.get('/donations/stats/weekly');
  },

  // Backward-compatible alias
  async getStatsWeekly() {
    return await this.getWeeklyStats();
  },

  async getVolunteerAvailable() {
    return await apiService.get('/donations/volunteer/available');
  },

  async acceptVolunteerPickup(id, notes = '') {
    return await apiService.put(`/donations/${id}/status`, {
      status: 'accepted',
      notes
    });
  },

  async getNgoAvailable() {
    return await apiService.get('/donations/ngo/available');
  },

  async claimDonation(id) {
    return await apiService.put(`/donations/${id}/claim`, {});
  },

  async getAdminStats() {
    return await apiService.get('/donations/stats/admin');
  },

  async autoExpireDonations() {
    return await apiService.put('/donations/auto-expire', {});
  },

  async backfillDonationCoordinates(limit = 50) {
    return await apiService.put('/donations/geocode/backfill', { limit });
  }
};


// Contact Service


const contactService = {
  /**
   * Submit contact form
   */
  async submit(formData) {
    return await apiService.post('/contact', formData);
  },
  
  /**
   * Subscribe to newsletter
   */
  async subscribeNewsletter(email) {
    return await apiService.post('/contact/newsletter', { email });
  },
  
  /**
   * Submit volunteer application
   */
  async submitVolunteer(volunteerData) {
    const formData = {
      name: `${volunteerData.firstName} ${volunteerData.lastName}`,
      email: volunteerData.email,
      subject: `Volunteer Application - ${volunteerData.role}`,
      message: `New volunteer application:
        
Name: ${volunteerData.firstName} ${volunteerData.lastName}
Email: ${volunteerData.email}
Phone: ${volunteerData.phone}
Role: ${volunteerData.role}
City: ${volunteerData.city}
Availability: ${volunteerData.days.join(', ')}
      `,
      type: 'volunteer_inquiry'
    };
    return await apiService.post('/contact', formData);
  },
  
  /**
   * Get volunteer applications (Admin only)
   */
  async getVolunteerApplications(page = 1, limit = 10) {
    return await apiService.get(`/contact?type=volunteer_inquiry&page=${page}&limit=${limit}`);
  }
};


// UI Helpers


const ui = {
  /**
   * Show alert message
   */
  showAlert(message, type = 'info', container = null) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
      <i class="fas ${this.getAlertIcon(type)}"></i>
      <span>${message}</span>
    `;
    
    if (container) {
      container.innerHTML = '';
      container.appendChild(alertDiv);
    } else {
      // Create a toast notification
      const toast = document.createElement('div');
      toast.className = `fixed top-4 right-4 z-50 alert alert-${type} shadow-lg`;
      toast.innerHTML = alertDiv.innerHTML;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 5000);
    }
  },
  
  /**
   * Get alert icon based on type
   */
  getAlertIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  },
  
  /**
   * Show loading state on button
   */
  setButtonLoading(button, loading = true) {
    if (loading) {
      button.dataset.originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner spinner-sm"></span> Loading...';
      button.disabled = true;
    } else {
      button.innerHTML = button.dataset.originalText || button.innerHTML;
      button.disabled = false;
    }
  },
  
  /**
   * Format date
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },
  
  /**
   * Format time
   */
  formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  /**
   * Format number with commas
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  },
  
  /**
   * Animate counter
   */
  animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const updateCounter = () => {
      current += increment;
      if (current < target) {
        element.textContent = Math.floor(current).toLocaleString();
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target.toLocaleString();
      }
    };
    
    updateCounter();
  },
  
  /**
   * Toggle mobile menu
   */
  toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const menuBtn = document.getElementById('menuBtn');
    
    if (mobileMenu && menuBtn) {
      const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.classList.toggle('hidden');
      if (menuIcon) {
        menuIcon.classList.toggle('fa-bars');
        menuIcon.classList.toggle('fa-times');
      }
    }
  },
  
  /**
   * Close mobile menu
   */
  closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const menuBtn = document.getElementById('menuBtn');
    
    if (mobileMenu && menuBtn) {
      menuBtn.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.add('hidden');
      if (menuIcon) {
        menuIcon.classList.add('fa-bars');
        menuIcon.classList.remove('fa-times');
      }
    }
  }
};


// Navigation


const navigation = {
  initialized: false,
  mobileMenuBound: false,
  scrollBound: false,

  /**
   * Initialize navigation
   */
  init() {
    if (!this.initialized) {
      this.initialized = true;
    }
    this.setupMobileMenu();
    this.updateNavForAuth();
    this.setupScrollBehavior();
  },
  
  /**
   * Setup mobile menu toggle
   */
  setupMobileMenu() {
    if (this.mobileMenuBound) return;

    const menuBtn = document.getElementById('menuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');

    if (!menuBtn || !mobileMenu) return;
    this.mobileMenuBound = true;

    if (menuBtn) {
      menuBtn.addEventListener('click', ui.toggleMobileMenu);
    }
    
    // Close menu when clicking outside.
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        ui.closeMobileMenu();
      }
    });

    // Close menu when selecting a navigation link.
    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        ui.closeMobileMenu();
      });
    });

    // Keyboard accessibility for mobile nav.
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (mobileMenu.classList.contains('hidden')) return;
      ui.closeMobileMenu();
      menuBtn.focus();
    });

    // Ensure deterministic initial icon state.
    if (menuIcon && menuBtn.getAttribute('aria-expanded') !== 'true') {
      menuIcon.classList.add('fa-bars');
      menuIcon.classList.remove('fa-times');
    }
  },
  
  /**
   * Update navigation based on auth state
   */
  updateNavForAuth() {
    const navActions = document.getElementById('navActions');
    const mobileAuth = document.getElementById('mobileAuth');
    
    if (authService.isLoggedIn()) {
      const user = authService.getUser();
      const userName = user ? `${user.firstName} ${user.lastName}` : 'User';
      
      if (navActions) {
        navActions.innerHTML = `
          <a href="dashboard.html" class="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-orange-600 font-medium transition-colors">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-coral-500 flex items-center justify-center text-white text-sm font-bold">
              ${user?.initials || 'U'}
            </div>
            <span class="hidden xl:inline">${userName}</span>
          </a>
          <button onclick="authService.logout()" class="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        `;
      }
      
      if (mobileAuth) {
        mobileAuth.innerHTML = `
          <a href="dashboard.html" class="block w-full px-4 py-3 text-center bg-orange-50 text-orange-600 font-semibold rounded-xl">
            Dashboard
          </a>
          <button onclick="authService.logout()" class="block w-full px-4 py-3 text-center border-2 border-red-200 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors">
            Log Out
          </button>
        `;
      }
    }
  },
  
  /**
   * Setup scroll behavior for navbar
   */
  setupScrollBehavior() {
    if (this.scrollBound) return;

    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    this.scrollBound = true;
    
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      
      // Add shadow on scroll
      if (currentScroll > 10) {
        navbar.classList.add('shadow-md');
      } else {
        navbar.classList.remove('shadow-md');
      }
      
      lastScroll = currentScroll;
    });
  }
};


// Shared Layout


const layout = {
  footerVersion: '20260220',
  getCurrentFileName() {
    const path = String(window.location.pathname || '');
    const fileName = path.split('/').filter(Boolean).pop();
    return (fileName || 'index.html').toLowerCase();
  },

  getFileNameFromHref(href) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return '';
    }

    try {
      const parsed = new URL(href, window.location.href);
      const fileName = parsed.pathname.split('/').filter(Boolean).pop();
      return String(fileName || '').toLowerCase();
    } catch (error) {
      return '';
    }
  },

  getFooterMarkup() {
    const year = new Date().getFullYear();
    return `
<footer class="bg-slate-900 text-white pt-20 pb-12">
  <div class="container mx-auto grid grid-cols-12 gap-y-12 gap-x-8 px-4">
      <!-- Logo and About -->
      <div class="lg:col-span-4 md:col-span-12 col-span-12">
        <a href="index.html" class="flex items-center gap-2 mb-6">
          <img src="images/logo.svg" alt="FoodBridge Logo" class="w-10 h-10">
          <span class="text-2xl font-bold text-white">FoodBridge</span>
        </a>
        <p class="text-slate-400 leading-relaxed">
          Connecting surplus food with communities in need. We use technology to reduce waste, fight hunger, and build sustainable local food systems.
        </p>
        <div class="flex gap-4 pt-6">
          <a href="#" class="w-8 h-8 bg-slate-800 hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors"><i class="fab fa-facebook-f"></i></a>
          <a href="#" class="w-8 h-8 bg-slate-800 hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors"><i class="fab fa-twitter"></i></a>
          <a href="#" class="w-8 h-8 bg-slate-800 hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors"><i class="fab fa-instagram"></i></a>
          <a href="#" class="w-8 h-8 bg-slate-800 hover:bg-emerald-500 rounded-full flex items-center justify-center transition-colors"><i class="fab fa-linkedin-in"></i></a>
        </div>
      </div>

      <!-- Links Columns -->
      <div class="lg:col-span-2 md:col-span-4 col-span-6">
        <h4 class="text-white font-semibold mb-6">Platform</h4>
        <ul class="space-y-4">
          <li><a href="donate.html" class="text-slate-400 hover:text-emerald-400 transition-colors">Donate Food</a></li>
          <li><a href="volunteer.html" class="text-slate-400 hover:text-emerald-400 transition-colors">Volunteer</a></li>
          <li><a href="live-map.html" class="text-slate-400 hover:text-emerald-400 transition-colors">Live Map</a></li>
          <li><a href="how-it-works.html" class="text-slate-400 hover:text-emerald-400 transition-colors">How It Works</a></li>
        </ul>
      </div>

      <div class="lg:col-span-2 md:col-span-4 col-span-6">
        <h4 class="text-white font-semibold mb-6">Company</h4>
        <ul class="space-y-4">
          <li><a href="about.html" class="text-slate-400 hover:text-emerald-400 transition-colors">About Us</a></li>
          <li><a href="#" class="text-slate-400 hover:text-emerald-400 transition-colors">Careers</a></li>
          <li><a href="#" class="text-slate-400 hover:text-emerald-400 transition-colors">Press</a></li>
          <li><a href="contact.html" class="text-slate-400 hover:text-emerald-400 transition-colors">Contact</a></li>
        </ul>
      </div>

      <div class="lg:col-span-2 md:col-span-4 col-span-12">
        <h4 class="text-white font-semibold mb-6">Resources</h4>
        <ul class="space-y-4">
          <li><a href="#" class="text-slate-400 hover:text-emerald-400 transition-colors">Blog</a></li>
          <li><a href="#" class="text-slate-400 hover:text-emerald-400 transition-colors">Help Center</a></li>
          <li><a href="privacy-policy.html" class="text-slate-400 hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
          <li><a href="terms.html" class="text-slate-400 hover:text-emerald-400 transition-colors">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    
    <!-- Newsletter Section -->
    <div class="pb-12 border-b border-slate-800">
      <div class="bg-slate-800/50 rounded-2xl p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div class="relative z-10 max-w-xl">
          <h3 class="text-2xl font-bold text-white mb-2">Stay Updated</h3>
          <p class="text-slate-400">Subscribe to our newsletter to get the latest news and updates.</p>
        </div>
        <form class="relative z-10 w-full max-w-md">
          <input type="email" placeholder="Enter your email" class="w-full h-14 bg-slate-900/80 border border-slate-700 rounded-xl px-6 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          <button class="absolute right-2 top-2 h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-colors">
            Subscribe
          </button>
        </form>
      </div>
    </div>

    <!-- Copyright -->
    <div class="pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
      <p class="text-slate-500 text-sm">&copy; ${year} FoodBridge. All rights reserved.</p>
      <a href="sitemap.html" class="text-slate-500 hover:text-emerald-400 text-sm transition-colors">Sitemap</a>
    </div>
  </div>
</footer>
    `;
  },

  mountGlobalFooter() {
    const existingFooter = document.querySelector('footer');
    if (existingFooter?.dataset?.footerVersion === this.footerVersion) {
      return;
    }

    const footerTemplate = document.createElement('template');
    footerTemplate.innerHTML = this.getFooterMarkup().trim();
    const nextFooter = footerTemplate.content.firstElementChild;
    if (!nextFooter) return;

    if (existingFooter) {
      existingFooter.replaceWith(nextFooter);
    } else {
      document.body.appendChild(nextFooter);
    }
  },

  syncActiveLinks() {
    const currentPage = this.getCurrentFileName();

    document.querySelectorAll('.nav-link[href], #mobileMenu a[href], .footer-link-list a[href], .footer-legal-links a[href]').forEach((link) => {
      const linkFile = this.getFileNameFromHref(link.getAttribute('href'));
      const isActive = Boolean(linkFile) && linkFile === currentPage;

      if (link.classList.contains('nav-link')) {
        link.classList.toggle('active', isActive);
      }

      if (link.closest('#mobileMenu')) {
        link.classList.toggle('bg-orange-50', isActive);
        link.classList.toggle('text-orange-600', isActive);
      }

      if (link.closest('.footer-link-list') || link.closest('.footer-legal-links')) {
        link.classList.toggle('footer-link-active', isActive);
      }
    });
  },

  init() {
    this.mountGlobalFooter();
    this.syncActiveLinks();
  }
};


// Counter Animation


const counterAnimation = {
  init() {
    const counters = document.querySelectorAll('.counter');
    if (!counters.length) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = parseInt(counter.dataset.target);
          ui.animateCounter(counter, target);
          observer.unobserve(counter);
        }
      });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => observer.observe(counter));
  }
};


// Testimonial Slider


const testimonialSlider = {
  currentSlide: 0,
  slides: [],
  dots: [],
  autoplayInterval: null,
  
  init() {
    this.slides = document.querySelectorAll('.testimonial-slide');
    this.dots = document.querySelectorAll('#testimonialDots button');
    
    if (!this.slides.length) return;
    
    this.setupControls();
    this.startAutoplay();
    this.updateSlide();
  },
  
  setupControls() {
    const prevBtn = document.getElementById('prevTestimonial');
    const nextBtn = document.getElementById('nextTestimonial');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.prev();
        this.resetAutoplay();
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.next();
        this.resetAutoplay();
      });
    }
    
    this.dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.goTo(index);
        this.resetAutoplay();
      });
    });
  },
  
  updateSlide() {
    this.slides.forEach((slide, index) => {
      slide.classList.toggle('active', index === this.currentSlide);
    });
    
    this.dots.forEach((dot, index) => {
      dot.classList.toggle('bg-orange-500', index === this.currentSlide);
      dot.classList.toggle('bg-orange-200', index !== this.currentSlide);
    });
  },
  
  next() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.updateSlide();
  },
  
  prev() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.updateSlide();
  },
  
  goTo(index) {
    this.currentSlide = index;
    this.updateSlide();
  },
  
  startAutoplay() {
    this.autoplayInterval = setInterval(() => this.next(), 5000);
  },
  
  resetAutoplay() {
    clearInterval(this.autoplayInterval);
    this.startAutoplay();
  }
};


// Form Validation


const formValidation = {
  /**
   * Validate email
   */
  isValidEmail(email) {
    return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
  },
  
  /**
   * Validate phone
   */
  isValidPhone(phone) {
    return /^\+?[\d\s-()]+$/.test(phone);
  },
  
  /**
   * Validate required field
   */
  isRequired(value) {
    return value.trim().length > 0;
  },
  
  /**
   * Validate min length
   */
  minLength(value, min) {
    return value.length >= min;
  },
  
  /**
   * Show field error
   */
  showError(field, message) {
    if (!field) return;
    field.classList.add('form-input-error');
    field.setAttribute('aria-invalid', 'true');

    let errorEl = field.parentElement.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'form-error text-xs text-red-600 mt-2';
      errorEl.setAttribute('role', 'alert');
      errorEl.setAttribute('aria-live', 'assertive');
      field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
    try { field.focus(); } catch (e) {}
  },
  
  /**
   * Clear field error
   */
  clearError(field) {
    if (!field) return;
    field.classList.remove('form-input-error');
    field.removeAttribute('aria-invalid');
    const errorEl = field.parentElement.querySelector('.form-error');
    if (errorEl) {
      errorEl.remove();
    }
  },
  
  /**
   * Clear all errors in form
   */
  clearAllErrors(form) {
    form.querySelectorAll('.form-input-error').forEach(field => {
      this.clearError(field);
    });
    // Remove any alert boxes inside form
    form.querySelectorAll('.form-error').forEach(el => el.remove());
  }
};


// Initialize on DOM Ready


// Initialize navigation after partials (header/footer) are loaded
document.addEventListener('partialsLoaded', () => {
  navigation.init();
  layout.init();
});

document.addEventListener('DOMContentLoaded', () => {
  // Most pages use static nav markup and never dispatch "partialsLoaded".
  navigation.init();
  layout.init();

  // Initialize non-header/footer dependent components
  counterAnimation.init();
  testimonialSlider.init();
  
  // Check for URL errors
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get('error');
  if (error === 'session_expired') {
    ui.showAlert('Your session has expired. Please log in again.', 'warning');
  }
  
  // Check for success messages
  const success = urlParams.get('success');
  if (success) {
    ui.showAlert(decodeURIComponent(success), 'success');
  }
});


// Expose to global scope


window.apiService = apiService;
window.authService = authService;
window.donationService = donationService;
window.contactService = contactService;
window.ui = ui;
window.navigation = navigation;
window.layout = layout;
window.formValidation = formValidation;
