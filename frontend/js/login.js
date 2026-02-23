/**
 * FoodBridge Login JavaScript
 * Handles user authentication with proper error handling and debugging
 */

(function() {
  'use strict';
  
  document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const alertContainer = document.getElementById('alertContainer');
    const submitBtn = document.getElementById('submitBtn');
    
    if (!loginForm) {
      console.error('[Login] Login form not found!');
      return;
    }
    
    /**
     * Clear all alerts
     */
    function clearAlerts() {
      if (alertContainer) {
        alertContainer.innerHTML = '';
      }
    }
    
    /**
     * Validate form inputs
     */
    function validateForm() {
      const email = document.getElementById('email');
      const password = document.getElementById('password');
      
      if (!email || !email.value.trim()) {
        ui.showAlert('Please enter your email address', 'error', alertContainer);
        email?.focus();
        return false;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.value.trim())) {
        ui.showAlert('Please enter a valid email address', 'error', alertContainer);
        email?.focus();
        return false;
      }
      
      if (!password || !password.value) {
        ui.showAlert('Please enter your password', 'error', alertContainer);
        password?.focus();
        return false;
      }
      
      if (password.value.length < 6) {
        ui.showAlert('Password must be at least 6 characters', 'error', alertContainer);
        password?.focus();
        return false;
      }
      
      return true;
    }
    
    /**
     * Handle form submission
     */
    async function handleLogin(e) {
      e.preventDefault();
      clearAlerts();
      
      if (!validateForm()) {
        return;
      }
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      
      ui.setButtonLoading(submitBtn, true);
      
      try {
        if (typeof authService === 'undefined') {
          throw new Error('Authentication service not available. Please refresh the page.');
        }
        
        const result = await authService.login(email, password);
        
        if (result && result.success) {
          ui.showAlert('Login successful! Redirecting...', 'success', alertContainer);
          
          setTimeout(() => {
            authService.redirectAfterLogin('dashboard.html');
          }, 800);
        } else {
          throw new Error(result?.message || 'Login failed. Please check your credentials.');
        }
      } catch (error) {
        ui.showAlert(error.message || 'Invalid email or password. Please try again.', 'error', alertContainer);
      } finally {
        ui.setButtonLoading(submitBtn, false);
      }
    }
    
    // Attach form submit handler
    loginForm.addEventListener('submit', handleLogin);
    
    /**
     * Handle social login buttons
     */
    document.querySelectorAll('[data-provider]').forEach((button) => {
      button.addEventListener('click', async () => {
        const provider = button.dataset.provider;
        clearAlerts();
        ui.setButtonLoading(button, true);
        
        try {
          if (typeof authService === 'undefined') {
            throw new Error('Authentication service not available');
          }
          
          // This is a placeholder for a real social auth implementation
          const result = await authService.socialAuth(provider, { intent: 'login' });

          if (result && result.success) {
              const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
              ui.showAlert(`${providerName} login successful! Redirecting...`, 'success', alertContainer);
              
              setTimeout(() => {
                authService.redirectAfterLogin('dashboard.html');
              }, 900);
          } else {
              throw new Error(result?.message || 'Social login failed.');
          }

        } catch (error) {
          ui.showAlert(error.message || 'Social login failed. Please try again.', 'error', alertContainer);
          ui.setButtonLoading(button, false);
        }
      });
    });
    
    // Handle session expired messages from URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error === 'session_expired') {
      ui.showAlert('Your session has expired. Please log in again.', 'info', alertContainer);
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
})();
