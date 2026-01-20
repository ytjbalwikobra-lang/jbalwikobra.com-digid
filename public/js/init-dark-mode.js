// Dark mode initialization script - ISO 27001 compliant (externalized for CSP)
// Prevents white flash on iOS/Safari during page load
(function() {
  try {
    document.documentElement.classList.add('dark');
    document.documentElement.style.backgroundColor = '#000';
    if (document.body) {
      document.body.style.backgroundColor = '#000';
    }
  } catch (e) {
    // Silently fail - not critical for functionality
  }
})();
