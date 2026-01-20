/**
 * Input validation utilities for auth endpoints
 * ISO 27001 compliance: Input validation is critical for security
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate Indonesian phone number
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Indonesian phone patterns: 08xx, +628xx, 628xx
  const phoneRegex = /^(\+?62|0)8[0-9]{8,11}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (password.length > 128) {
    errors.push('Password is too long (max 128 characters)');
  }
  
  // Check for common weak passwords
  const weakPasswords = ['123456', 'password', 'qwerty', '123456789', '12345678'];
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too weak. Please choose a stronger password');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential XSS characters
}

/**
 * Validate name (no numbers, special characters except spaces and hyphens)
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  
  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(trimmed);
}

/**
 * Validate session token format
 */
export function isValidSessionToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  // Session tokens should be 64-character hex strings (32 bytes)
  const tokenRegex = /^[a-f0-9]{64}$/i;
  return tokenRegex.test(token);
}

/**
 * Validate verification code (6 digits)
 */
export function isValidVerificationCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  
  const codeRegex = /^[0-9]{6}$/;
  return codeRegex.test(code);
}
