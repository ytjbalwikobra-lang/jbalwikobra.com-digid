/**
 * ESLint Rule: no-hardcoded-colors
 * Enforces using CSS custom properties (design tokens) instead of hardcoded Tailwind colors
 * 
 * Prohibited patterns (with suggested replacements):
 * - gray-XXX → Use var(--cyber-muted), var(--cyber-border), var(--cyber-surface)
 * - white/opacity → Use var(--cyber-text-primary), var(--cyber-text-secondary)
 * - pink-XXX → Use var(--cyber-primary), var(--cyber-primary-hover)
 * - bg-black → Use var(--cyber-bg) or var(--cyber-surface)
 * - rounded-lg/xl/2xl → Use var(--cyber-radius-sm/md/lg)
 * 
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded Tailwind colors. Use Cyber-Compact CSS custom properties instead.',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      noHardcodedGray: 'Avoid hardcoded "{{value}}". Use design tokens: text-[var(--cyber-muted)] or border-[var(--cyber-border)] instead.',
      noHardcodedWhite: 'Avoid hardcoded "{{value}}". Use design tokens: text-[var(--cyber-text-primary)] or text-[var(--cyber-text-secondary)] instead.',
      noHardcodedPink: 'Avoid hardcoded "{{value}}". Use design tokens: text-[var(--cyber-primary)] or bg-[var(--cyber-primary)] instead.',
      noHardcodedBgBlack: 'Avoid hardcoded "{{value}}". Use design tokens: bg-[var(--cyber-bg)] or bg-[var(--cyber-surface)] instead.',
      noHardcodedRadius: 'Avoid hardcoded "{{value}}". Use design tokens: rounded-[var(--cyber-radius-sm/md/lg)] instead.',
    },
    schema: [],
  },

  create(context) {
    // Patterns to detect hardcoded values
    const patterns = {
      gray: /\b(?:text|bg|border)-gray-[0-9]+\b/g,
      white: /\b(?:text|bg|border)-white(?:\/[0-9]+)?\b/g,
      pink: /\b(?:text|bg|border)-pink-[0-9]+\b/g,
      bgBlack: /\bbg-black(?:\/[0-9]+)?\b/g,
      // Note: We allow rounded-full as it has no token equivalent
      radius: /\brounded-(?:lg|xl|2xl|3xl)\b/g,
    };

    // Skip certain patterns that are acceptable
    const allowedPatterns = [
      'rounded-full', // No token equivalent
      'bg-black/0', // Transparent is fine
    ];

    function checkString(node, value) {
      if (typeof value !== 'string') return;

      // Check for gray colors
      const grayMatches = value.match(patterns.gray);
      if (grayMatches) {
        grayMatches.forEach((match) => {
          context.report({
            node,
            messageId: 'noHardcodedGray',
            data: { value: match },
          });
        });
      }

      // Check for white colors
      const whiteMatches = value.match(patterns.white);
      if (whiteMatches) {
        whiteMatches.forEach((match) => {
          context.report({
            node,
            messageId: 'noHardcodedWhite',
            data: { value: match },
          });
        });
      }

      // Check for pink colors
      const pinkMatches = value.match(patterns.pink);
      if (pinkMatches) {
        pinkMatches.forEach((match) => {
          context.report({
            node,
            messageId: 'noHardcodedPink',
            data: { value: match },
          });
        });
      }

      // Check for bg-black (but allow bg-black/0)
      const bgBlackMatches = value.match(patterns.bgBlack);
      if (bgBlackMatches) {
        bgBlackMatches.forEach((match) => {
          if (!allowedPatterns.includes(match)) {
            context.report({
              node,
              messageId: 'noHardcodedBgBlack',
              data: { value: match },
            });
          }
        });
      }

      // Check for hardcoded border-radius
      const radiusMatches = value.match(patterns.radius);
      if (radiusMatches) {
        radiusMatches.forEach((match) => {
          context.report({
            node,
            messageId: 'noHardcodedRadius',
            data: { value: match },
          });
        });
      }
    }

    return {
      // Check string literals (className="...")
      Literal(node) {
        if (typeof node.value === 'string') {
          checkString(node, node.value);
        }
      },
      // Check template literals (className={`...`})
      TemplateElement(node) {
        checkString(node, node.value.raw);
      },
    };
  },
};
