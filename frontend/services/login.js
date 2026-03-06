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
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');

    if (!loginForm) {
      console.error('[Login] Login form not found!');
      return;
    }
    if (!emailField || !passwordField) {
      console.error('[Login] Required login fields are missing.');
      return;
    }
    
    function clearAlerts() {
      if (alertContainer) alertContainer.innerHTML = '';
      emailField.classList.remove('form-input-error');
      passwordField.classList.remove('form-input-error');
    }
    
    function validateForm() {
      clearAlerts();
      let isValid = true;

      if (!emailField.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value.trim())) {
        ui.showAlert('Please enter a valid email address', 'error', alertContainer);
        emailField.classList.add('form-input-error');
        emailField.focus();
        isValid = false;
      }
      
      if (!passwordField.value) {
        if(isValid) { // only show this if email was okay
          ui.showAlert('Please enter your password', 'error', alertContainer);
          passwordField.focus();
        }
        passwordField.classList.add('form-input-error');
        isValid = false;
      }
      
      return isValid;
    }
    
    async function handleLogin(e) {
      e.preventDefault();
      
      if (!validateForm()) {
        return;
      }
      
      const email = emailField.value.trim();
      const password = passwordField.value;
      
      ui.setButtonLoading(submitBtn, true);
      
      try {
        if (typeof authService === 'undefined') {
          throw new Error('Authentication service not available. Please refresh the page.');
        }
        
        const result = await authService.login(email, password);
        
        if (result && result.success) {
          ui.showAlert('Login successful! Redirecting...', 'success', alertContainer);
          setTimeout(() => authService.redirectAfterLogin('dashboard.html'), 800);
        } else {
          // This else block might be redundant if authService always throws on failure.
          throw new Error(result?.message || 'Login failed. Please check your credentials.');
        }
      } catch (error) {
        ui.showAlert(error.message || 'Invalid email or password. Please try again.', 'error', alertContainer);
        emailField.classList.add('form-input-error');
        passwordField.classList.add('form-input-error');
      } finally {
        ui.setButtonLoading(submitBtn, false);
      }
    }
    
    loginForm.addEventListener('submit', handleLogin);
    
    // Password toggle
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
      togglePassword.addEventListener('click', function() {
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
      });
    }
    
    // Social Login, session expired messages, etc. (rest of the script)
    // ... (no changes needed for the rest of the file)
    
    document.querySelectorAll('[data-provider]').forEach((button) => {
      button.addEventListener('click', async () => {
        const provider = button.dataset.provider;
        clearAlerts();
        ui.setButtonLoading(button, true);
        
        try {
          if (typeof authService === 'undefined') {
            throw new Error('Authentication service not available');
          }
          
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
        } finally {
          ui.setButtonLoading(button, false);
        }
      });
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const message = urlParams.get('message');

    if (error === 'session_expired') {
      ui.showAlert('Your session has expired. Please log in again.', 'error', alertContainer);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (message) {
      ui.showAlert(message, 'info', alertContainer);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  });
})();
