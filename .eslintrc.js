module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true,
        "node": true,
        "jest": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12
    },
    "globals": {
        "authService": "readonly",
        "apiService": "readonly",
        "donationService": "readonly",
        "contactService": "readonly",
        "ui": "readonly",
        "navigation": "readonly",
        "AuthGuard": "readonly",
        "L": "readonly",
        "io": "readonly",
        "formValidation": "readonly",
        "Chart": "readonly"
    },
    "rules": {
        "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
    }
};
