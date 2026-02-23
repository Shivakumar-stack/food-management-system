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
    document.getElementById('togglePassword')?.addEventListener('click', function() {
      const passwordInput = document.getElementById('password');
      const icon = this.querySelector('i');

      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        passwordInput.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });

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
      }
    }

    // Check if already logged in
    if (authService.isLoggedIn()) {
      authService.redirectAfterLogin('dashboard.html');
    }