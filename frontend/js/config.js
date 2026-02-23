// frontend/js/config.js

(function (window) {
  // Centralized configuration for API and Socket endpoints.
  
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Define the base URL for the API.
  // In development, it points to the local backend server.
  // In production, it assumes the API is served from the same origin under the /api path.
  const API_BASE_URL = isDevelopment ? 'http://localhost:5000/api' : `${window.location.origin}/api`;

  // Define the URL for the WebSocket server.
  // In development, it points to the local backend server.
  // In production, it points to the root of the application's domain.
  const SOCKET_SERVER_URL = isDevelopment ? 'http://localhost:5000' : window.location.origin;

  // Expose the configuration to the global scope for easy access from other scripts.
  window.appConfig = {
    API_BASE_URL,
    SOCKET_SERVER_URL,
  };

})(window);