const signupForm = document.getElementById('signupForm');
    const alertContainer = document.getElementById('alertContainer');
    const totalSteps = 3;
    let currentStep = 1;

    function updateStepIndicators() {
      document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
        const step = index + 1;
        indicator.classList.remove('active', 'completed');
        if (step < currentStep) {
          indicator.classList.add('completed');
          indicator.innerHTML = '<i class="fas fa-check"></i>';
        } else if (step === currentStep) {
          indicator.classList.add('active');
          indicator.textContent = step;
        } else {
          indicator.textContent = step;
        }
      });
    }

    function showStep(step) {
      document.querySelectorAll('.form-step').forEach((panel) => panel.classList.remove('active'));
      document.querySelector(`.form-step[data-step="${step}"]`)?.classList.add('active');
      currentStep = step;
      updateStepIndicators();
    }

    function clearStepAlerts() {
      alertContainer.innerHTML = '';
      formValidation.clearAllErrors(signupForm);
    }

    function syncRoleCardSelection() {
      const roleCards = document.querySelectorAll('.role-card');
      roleCards.forEach((card) => {
        const input = card.querySelector('input[type="radio"]');
        const checkIcon = card.querySelector('.check-icon');
        const isSelected = Boolean(input?.checked);

        card.classList.toggle('selected', isSelected);
        if (checkIcon) {
          checkIcon.classList.toggle('opacity-0', !isSelected);
        }
      });
    }

    function initRoleCardSelection() {
      const roleCards = document.querySelectorAll('.role-card');
      if (!roleCards.length) return;

      roleCards.forEach((card) => {
        const input = card.querySelector('input[type="radio"]');
        if (!input) return;

        card.addEventListener('click', (event) => {
          if (event.target && event.target.tagName === 'INPUT') return;
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        input.addEventListener('change', syncRoleCardSelection);
      });

      syncRoleCardSelection();
    }

    // Clear field errors on user input
    if (signupForm) {
      signupForm.querySelectorAll('input, textarea, select').forEach((el) => {
        el.addEventListener('input', () => formValidation.clearError(el));
        el.addEventListener('change', () => formValidation.clearError(el));
      });
    }

    function validateStep1() {
      const firstName = signupForm.querySelector('[name="firstName"]');
      const lastName = signupForm.querySelector('[name="lastName"]');
      const email = signupForm.querySelector('[name="email"]');
      const phone = signupForm.querySelector('[name="phone"]');
      const errors = [];

      if (!formValidation.isRequired(firstName.value)) {
        formValidation.showError(firstName, 'First name is required');
        errors.push('First name is required');
      }

      if (!formValidation.isRequired(lastName.value)) {
        formValidation.showError(lastName, 'Last name is required');
        errors.push('Last name is required');
      }

      if (!formValidation.isRequired(email.value)) {
        formValidation.showError(email, 'Email is required');
        errors.push('Email is required');
      } else if (!formValidation.isValidEmail(email.value.trim())) {
        formValidation.showError(email, 'Enter a valid email address');
        errors.push('Enter a valid email address');
      }

      const phoneValue = phone.value.trim();
      if (phoneValue && !formValidation.isValidPhone(phoneValue)) {
        formValidation.showError(phone, 'Enter a valid phone number format');
        errors.push('Enter a valid phone number format');
      }

      if (errors.length) {
        ui.showAlert(errors[0], 'error', alertContainer);
      }

      return errors.length === 0;
    }

    function validateStep2() {
      const role = signupForm.querySelector('input[name="role"]:checked');
      if (!role) {
        ui.showAlert('Please select a role to continue', 'error', alertContainer);
        return false;
      }
      return true;
    }

    function validateStep3() {
      const password = signupForm.querySelector('[name="password"]');
      const confirmPassword = signupForm.querySelector('[name="confirmPassword"]');
      const terms = signupForm.querySelector('[name="terms"]');
      const errors = [];

      if (!formValidation.isRequired(password.value)) {
        formValidation.showError(password, 'Password is required');
        errors.push('Password is required');
      } else if (!formValidation.minLength(password.value, 6)) {
        formValidation.showError(password, 'Password must be at least 6 characters');
        errors.push('Password must be at least 6 characters');
      }

      if (!formValidation.isRequired(confirmPassword.value)) {
        formValidation.showError(confirmPassword, 'Please confirm your password');
        errors.push('Please confirm your password');
      } else if (password.value !== confirmPassword.value) {
        formValidation.showError(confirmPassword, 'Passwords do not match');
        errors.push('Passwords do not match');
      }

      if (!terms.checked) {
        errors.push('You must accept the Terms of Service and Privacy Policy');
      }

      if (errors.length) {
        ui.showAlert(errors[0], 'error', alertContainer);
      }

      return errors.length === 0;
    }

    function validateCurrentStep() {
      clearStepAlerts();
      if (currentStep === 1) {
        return validateStep1();
      }
      if (currentStep === 2) {
        return validateStep2();
      }
      return validateStep3();
    }

    document.querySelectorAll('.next-step-btn').forEach((button) => {
      button.addEventListener('click', () => {
        if (currentStep < totalSteps && validateCurrentStep()) {
          showStep(currentStep + 1);
        }
      });
    });

    document.querySelectorAll('.prev-step-btn').forEach((button) => {
      button.addEventListener('click', () => {
        if (currentStep > 1) {
          clearStepAlerts();
          showStep(currentStep - 1);
        }
      });
    });

    // Toggle Password Visibility
    function setupPasswordToggle(toggleBtnId, passwordInputId) {
      const toggleButton = document.getElementById(toggleBtnId);
      const passwordInput = document.getElementById(passwordInputId);
      if (!toggleButton || !passwordInput) return;

      const icon = toggleButton.querySelector('i');

      toggleButton.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          icon?.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
          passwordInput.type = 'password';
          icon?.classList.replace('fa-eye-slash', 'fa-eye');
        }
      });
    }

    setupPasswordToggle('togglePassword', 'password');
    setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');
    initRoleCardSelection();

    // Password Strength Meter
    const passwordInput = document.getElementById('password');
    const strengthMeter = document.getElementById('password-strength-meter');
    const strengthLevels = [
      { color: 'bg-red-500', text: 'Very Weak' },
      { color: 'bg-yellow-500', text: 'Weak' },
      { color: 'bg-blue-500', text: 'Medium' },
      { color: 'bg-green-500', text: 'Strong' }
    ];

    if (passwordInput && strengthMeter) {
      passwordInput.addEventListener('input', function() {
        const password = this.value;
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        let strengthIndex = 0;
        if (password.length >= 6) {
            strengthIndex = Math.min(Math.floor(score / 1.25), strengthLevels.length -1);
        }

        const bars = strengthMeter.children;
        for (let i = 0; i < bars.length; i++) {
          if (i < strengthIndex + 1) {
            bars[i].className = `h-1.5 flex-1 rounded-full ${strengthLevels[strengthIndex].color}`;
          } else {
            bars[i].className = 'h-1.5 flex-1 rounded-full bg-gray-200';
          }
        }
      });
    }

    // Signup Form Handler
    signupForm?.addEventListener('submit', async function(e) {
      e.preventDefault();

      clearStepAlerts();
      if (!validateStep1()) {
        showStep(1);
        return;
      }
      if (!validateStep2()) {
        showStep(2);
        return;
      }
      if (!validateStep3()) {
        showStep(3);
        return;
      }

      const formData = new FormData(this);
      const data = Object.fromEntries(formData);
      const submitBtn = document.getElementById('submitBtn');

      ui.setButtonLoading(submitBtn, true);

      try {
        await authService.register({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim(),
          phone: data.phone,
          role: data.role,
          password: data.password
        });

        ui.showAlert('Account created successfully! Redirecting...', 'success', alertContainer);
        setTimeout(() => {
          authService.redirectAfterLogin('dashboard.html');
        }, 1200);
      } catch (error) {
        ui.showAlert(error.message || 'Failed to create account', 'error', alertContainer);
      } finally {
        ui.setButtonLoading(submitBtn, false);
      }
    });

    // Social signup simulation
    document.querySelectorAll('[data-provider]').forEach((button) => {
      button.addEventListener('click', async () => {
        const provider = button.dataset.provider;
        const originalHtml = button.innerHTML;
        const selectedRole = signupForm.querySelector('input[name="role"]:checked')?.value || 'donor';

        button.disabled = true;
        button.innerHTML = '<span class="spinner spinner-sm"></span> Connecting...';
        alertContainer.innerHTML = '';

        try {
          await authService.socialAuth(provider, { intent: 'signup', role: selectedRole });
          const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
          ui.showAlert(`${providerName} signup successful! Redirecting...`, 'success', alertContainer);
          setTimeout(() => {
            authService.redirectAfterLogin('dashboard.html');
          }, 900);
        } catch (error) {
          ui.showAlert(error.message || 'Social signup failed. Please try again.', 'error', alertContainer);
        } finally {
          button.disabled = false;
          button.innerHTML = originalHtml;
        }
      });
    });

    // Support signup.html?role=volunteer links
    const urlParams = new URLSearchParams(window.location.search);
    const requestedRole = urlParams.get('role');
    if (requestedRole && ['donor', 'volunteer', 'ngo'].includes(requestedRole)) {
      const roleInput = signupForm.querySelector(`input[name="role"][value="${requestedRole}"]`);
      if (roleInput) {
        roleInput.checked = true;
        roleInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Check if already logged in
    if (authService.isLoggedIn()) {
      authService.redirectAfterLogin('dashboard.html');
    }
