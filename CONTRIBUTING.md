# Contributing to ElectAssist

Thank you for your interest in improving ElectAssist! This document outlines the code standards, architecture, and workflow for contributing.

---

## Architecture Overview

```
index.html          → UI shell (semantic HTML, inlined critical CSS)
app.js              → Application controller (state, DOM binding, view router)
services/
  ├── gemini.js     → Google Gemini AI integration
  ├── mistral.js    → Mistral AI fallback + shared utilities
  ├── maps.js       → Google Maps + Places API integration
  └── calendar.js   → Google Calendar API + ICS fallback
data/
  ├── timeline.js   → 10-phase election lifecycle
  ├── faq.js        → 50+ curated FAQs
  └── elections.js  → Historical election statistics
tests.js            → Comprehensive test suite (150+ assertions)
```

## Code Style

- **ES Modules** — All files use `import`/`export`. No CommonJS.
- **JSDoc** — Every public function, class, and method must have JSDoc annotations with `@param`, `@returns`, and `@throws`.
- **Constants** — Magic strings and repeated values must be extracted into named constants.
- **Error Handling** — All async operations must use try/catch with user-facing error messages.
- **Security** — Never hardcode API keys. All secrets are user-provided via localStorage.
- **Accessibility** — All interactive elements must have ARIA labels, keyboard support, and focus management.

## Testing

Run the test suite by opening `tests.html` in a browser, or from the browser console:

```javascript
import('./tests.js');
```

All tests must pass before merging. Current coverage: 150+ assertions across data integrity, intent classification, security, accessibility, performance, and integration workflows.

## Deployment

```bash
# Deploy to Vercel
vercel --prod
```

Security headers and caching are configured in `vercel.json`.

## Zero-Dependency Policy

This project has **zero NPM dependencies** by design. All functionality is implemented with vanilla JavaScript and browser APIs. Do not introduce external libraries without prior discussion.
