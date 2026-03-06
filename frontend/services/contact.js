document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('contactSubmitBtn');
  const alertMount = document.getElementById('contactAlert');

  if (!form || !submitBtn) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      subject: String(formData.get('subject') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      type: String(formData.get('type') || 'general').trim() || 'general'
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      if (typeof ui !== 'undefined') {
        ui.showAlert('Please complete all required fields.', 'warning', alertMount);
      }
      return;
    }

    if (typeof contactService === 'undefined') {
      if (typeof ui !== 'undefined') {
        ui.showAlert('Contact service is unavailable. Please refresh and try again.', 'error', alertMount);
      }
      return;
    }

    if (typeof ui !== 'undefined') {
      ui.setButtonLoading(submitBtn, true);
    } else {
      submitBtn.disabled = true;
    }

    try {
      await contactService.submit(payload);
      form.reset();
      if (typeof ui !== 'undefined') {
        ui.showAlert('Message sent. Our team will get back to you shortly.', 'success', alertMount);
      }
    } catch (error) {
      const message = error?.message || 'Unable to send your message right now.';
      if (typeof ui !== 'undefined') {
        ui.showAlert(message, 'error', alertMount);
      }
    } finally {
      if (typeof ui !== 'undefined') {
        ui.setButtonLoading(submitBtn, false);
      } else {
        submitBtn.disabled = false;
      }
    }
  });
});
