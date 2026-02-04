/**
 * Local ESLint Plugin for Cyber-Compact Design System
 * 
 * This plugin provides custom rules to enforce design token usage
 * and prevent hardcoded Tailwind colors that break design consistency.
 */
const noHardcodedColors = require('./no-hardcoded-colors');

module.exports = {
  rules: {
    'no-hardcoded-colors': noHardcodedColors,
  },
};
