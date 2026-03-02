// frontend/js/config.js

(function (window) {
  // Centralized configuration for API and Socket endpoints.
  
  const API_BASE_URL = '/api';

  // Define the URL for the WebSocket server.
  // In production it points to the root of the application's domain.
  const SOCKET_SERVER_URL = '';

  // Expose the configuration to the global scope for easy access from other scripts.
  window.appConfig = {
    API_BASE_URL,
    SOCKET_SERVER_URL,
  };

})(window);