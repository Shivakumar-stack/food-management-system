// frontend/js/config.js

(function (window) {
  // Centralized configuration for API and Socket endpoints.

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const API_BASE_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

  // Define the URL for the WebSocket server.
  // In production it points to the root of the application's domain.
  const SOCKET_SERVER_URL = isLocalhost ? 'http://localhost:5000' : '';

  // Expose the configuration to the global scope for easy access from other scripts.
  window.appConfig = {
    API_BASE_URL,
    SOCKET_SERVER_URL,
  };

})(window);