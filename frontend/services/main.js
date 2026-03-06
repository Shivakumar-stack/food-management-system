/**
 * FoodBridge - Main Entry Point
 *
 * This script is responsible for initializing the application, checking for
 * backend connectivity, and setting up global handlers. It should be the
 * first custom script loaded on every page to ensure the site environment is
 * properly configured.
 */

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Unhandled global error:', event.error, event);
  const serverStatus = document.getElementById('server-status');
  if (serverStatus && serverStatus.textContent.includes('online')) {
    serverStatus.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span class="font-semibold">Application Error:</span>
      <span class="font-normal">An unexpected error occurred. Please refresh and try again.</span>
    `;
    serverStatus.className = 'server-status-error';
    serverStatus.style.display = 'flex';
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const serverStatus = document.getElementById('server-status');
  if (serverStatus && serverStatus.textContent.includes('online')) {
    serverStatus.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span class="font-semibold">Application Error:</span>
      <span class="font-normal">A background task failed. Please check your connection or try again later.</span>
    `;
    serverStatus.className = 'server-status-error';
    serverStatus.style.display = 'flex';
  }
});

// Main initialization function
async function main() {
  const serverStatus = document.getElementById('server-status');

  try {
    // Check if appConfig is loaded
    if (typeof window.appConfig === 'undefined' || !window.appConfig.API_BASE_URL) {
      throw new Error('Configuration not loaded');
    }

    // Perform health check
    const health = await apiService.healthCheck();

    if (health.success && serverStatus) {
      console.info('Backend health check successful:', health);
      serverStatus.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span class="font-semibold">System Status:</span>
        <span class="font-normal">All systems operational.</span>
      `;
      serverStatus.className = 'server-status-ok';

      // Hide the status after a few seconds on success
      setTimeout(() => {
        if (serverStatus.className === 'server-status-ok') {
          serverStatus.style.transform = 'translateY(-100%)';
          serverStatus.style.opacity = '0';
        }
      }, 4000);
    } else {
      throw new Error(health.message || 'Backend appears to be offline');
    }
  } catch (error) {
    console.error('Application initialization failed:', error);
    if (serverStatus) {
      serverStatus.innerHTML = `
        <i class="fas fa-power-off"></i>
        <span class="font-semibold">Connection Error:</span>
        <span class="font-normal">Unable to connect to the server. Some features may not be available.</span>
      `;
      serverStatus.className = 'server-status-error';
      serverStatus.style.display = 'flex';
    }
  }
}

// Defer initialization until the DOM is fully loaded
document.addEventListener('DOMContentLoaded', main);
