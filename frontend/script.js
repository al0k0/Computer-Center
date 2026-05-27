const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const submitButton = contactForm?.querySelector('button[type="submit"]');

function getApiBaseUrl() {
  const metaApiBase = document.querySelector('meta[name="api-base-url"]')?.content || '';
  const configuredApiBase = window.API_BASE_URL || metaApiBase || '';
  if (configuredApiBase) {
    return configuredApiBase.replace(/\/$/, '');
  }

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }

  return '';
}

function setFormStatus(message, type) {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.className = `form-status ${type || ''}`.trim();
}

navToggle?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle?.classList.remove('open');
  });
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    navLinks?.classList.remove('open');
    navToggle?.classList.remove('open');
  }
});

contactForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = Object.fromEntries(new FormData(contactForm).entries());
  const payload = {
    name: (formData.name || '').trim(),
    organisation: (formData.organisation || '').trim(),
    email: (formData.email || '').trim(),
    phone: (formData.phone || '').trim(),
    enquiryType: (formData.enquiryType || '').trim(),
    message: (formData.message || '').trim(),
  };

  if (!payload.name || !payload.email || !payload.message) {
    setFormStatus('Please fill your name, email, and message.', 'error');
    return;
  }

  try {
    setFormStatus('Sending message...', 'loading');
    if (submitButton) submitButton.disabled = true;

    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || 'Unable to submit form.');
    }

    setFormStatus('Thank you! Your message was sent successfully.', 'success');
    contactForm.reset();
  } catch (error) {
    setFormStatus(error.message || 'Unable to send message. Please try again later.', 'error');
    console.error(error);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});
