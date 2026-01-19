// Phone Number Utility Functions
// Handles automatic formatting and normalization for Asian phone numbers

export interface PhoneNormalizationResult {
  normalized: string;
  isValid: boolean;
  originalFormat: 'local' | 'international' | 'country-code' | 'invalid';
  displayFormat: string;
  country: string;
  countryCode: string;
}

// Asian countries phone configuration
interface CountryPhoneConfig {
  name: string;
  code: string;
  countryCode: string;
  localPrefix: string;
  validPrefixes: string[];
  minLength: number;
  maxLength: number;
  displayFormat: (number: string) => string;
}

const ASIAN_COUNTRIES: CountryPhoneConfig[] = [
  // Southeast Asia
  {
    name: 'Indonesia',
    code: 'ID',
    countryCode: '62',
    localPrefix: '0',
    validPrefixes: ['81', '82', '83', '85', '87', '88', '89'],
    minLength: 9,
    maxLength: 13,
    displayFormat: (number) => `+62 ${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7)}`
  },
  {
    name: 'Malaysia',
    code: 'MY',
    countryCode: '60',
    localPrefix: '0',
    validPrefixes: ['10', '11', '12', '13', '14', '15', '16', '17', '18', '19'],
    minLength: 9,
    maxLength: 11,
    displayFormat: (number) => `+60 ${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`
  },
  {
    name: 'Singapore',
    code: 'SG',
    countryCode: '65',
    localPrefix: '',
    validPrefixes: ['8', '9'],
    minLength: 8,
    maxLength: 8,
    displayFormat: (number) => `+65 ${number.slice(0, 4)}-${number.slice(4)}`
  },
  {
    name: 'Thailand',
    code: 'TH',
    countryCode: '66',
    localPrefix: '0',
    validPrefixes: ['6', '8', '9'],
    minLength: 8,
    maxLength: 9,
    displayFormat: (number) => `+66 ${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`
  },
  {
    name: 'Philippines',
    code: 'PH',
    countryCode: '63',
    localPrefix: '0',
    validPrefixes: ['9'],
    minLength: 10,
    maxLength: 10,
    displayFormat: (number) => `+63 ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  },
  {
    name: 'Vietnam',
    code: 'VN',
    countryCode: '84',
    localPrefix: '0',
    validPrefixes: ['3', '5', '7', '8', '9'],
    minLength: 9,
    maxLength: 10,
    displayFormat: (number) => `+84 ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  },
  {
    name: 'Cambodia',
    code: 'KH',
    countryCode: '855',
    localPrefix: '0',
    validPrefixes: ['1', '6', '7', '8', '9'],
    minLength: 8,
    maxLength: 9,
    displayFormat: (number) => `+855 ${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`
  },
  {
    name: 'Laos',
    code: 'LA',
    countryCode: '856',
    localPrefix: '0',
    validPrefixes: ['20'],
    minLength: 8,
    maxLength: 10,
    displayFormat: (number) => `+856 ${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`
  },
  {
    name: 'Myanmar',
    code: 'MM',
    countryCode: '95',
    localPrefix: '0',
    validPrefixes: ['9'],
    minLength: 9,
    maxLength: 10,
    displayFormat: (number) => `+95 ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  },
  {
    name: 'Brunei',
    code: 'BN',
    countryCode: '673',
    localPrefix: '',
    validPrefixes: ['7', '8'],
    minLength: 7,
    maxLength: 7,
    displayFormat: (number) => `+673 ${number.slice(0, 3)}-${number.slice(3)}`
  },
  // East Asia
  {
    name: 'China',
    code: 'CN',
    countryCode: '86',
    localPrefix: '0',
    validPrefixes: ['13', '14', '15', '16', '17', '18', '19'],
    minLength: 11,
    maxLength: 11,
    displayFormat: (number) => `+86 ${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7)}`
  },
  {
    name: 'Japan',
    code: 'JP',
    countryCode: '81',
    localPrefix: '0',
    validPrefixes: ['70', '80', '90'],
    minLength: 10,
    maxLength: 11,
    displayFormat: (number) => `+81 ${number.slice(0, 2)}-${number.slice(2, 6)}-${number.slice(6)}`
  },
  {
    name: 'South Korea',
    code: 'KR',
    countryCode: '82',
    localPrefix: '0',
    validPrefixes: ['10', '11'],
    minLength: 9,
    maxLength: 10,
    displayFormat: (number) => `+82 ${number.slice(0, 2)}-${number.slice(2, 6)}-${number.slice(6)}`
  },
  {
    name: 'Taiwan',
    code: 'TW',
    countryCode: '886',
    localPrefix: '0',
    validPrefixes: ['9'],
    minLength: 9,
    maxLength: 9,
    displayFormat: (number) => `+886 ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  },
  {
    name: 'Hong Kong',
    code: 'HK',
    countryCode: '852',
    localPrefix: '',
    validPrefixes: ['5', '6', '9'],
    minLength: 8,
    maxLength: 8,
    displayFormat: (number) => `+852 ${number.slice(0, 4)}-${number.slice(4)}`
  },
  {
    name: 'Macau',
    code: 'MO',
    countryCode: '853',
    localPrefix: '',
    validPrefixes: ['6'],
    minLength: 8,
    maxLength: 8,
    displayFormat: (number) => `+853 ${number.slice(0, 4)}-${number.slice(4)}`
  },
  // South Asia
  {
    name: 'India',
    code: 'IN',
    countryCode: '91',
    localPrefix: '0',
    validPrefixes: ['6', '7', '8', '9'],
    minLength: 10,
    maxLength: 10,
    displayFormat: (number) => `+91 ${number.slice(0, 5)}-${number.slice(5)}`
  },
  {
    name: 'Pakistan',
    code: 'PK',
    countryCode: '92',
    localPrefix: '0',
    validPrefixes: ['3'],
    minLength: 10,
    maxLength: 10,
    displayFormat: (number) => `+92 ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  },
  {
    name: 'Bangladesh',
    code: 'BD',
    countryCode: '880',
    localPrefix: '0',
    validPrefixes: ['13', '14', '15', '16', '17', '18', '19'],
    minLength: 10,
    maxLength: 10,
    displayFormat: (number) => `+880 ${number.slice(0, 4)}-${number.slice(4, 7)}-${number.slice(7)}`
  },
  {
    name: 'Sri Lanka',
    code: 'LK',
    countryCode: '94',
    localPrefix: '0',
    validPrefixes: ['7'],
    minLength: 9,
    maxLength: 9,
    displayFormat: (number) => `+94 ${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`
  },
  {
    name: 'Nepal',
    code: 'NP',
    countryCode: '977',
    localPrefix: '0',
    validPrefixes: ['98'],
    minLength: 10,
    maxLength: 10,
    displayFormat: (number) => `+977 ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  },
  // Central/West Asia
  {
    name: 'Kazakhstan',
    code: 'KZ',
    countryCode: '7',
    localPrefix: '8',
    validPrefixes: ['70', '71', '72', '73', '74', '75', '76', '77', '78'],
    minLength: 10,
    maxLength: 10,
    displayFormat: (number) => `+7 ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`
  },
  {
    name: 'Uzbekistan',
    code: 'UZ',
    countryCode: '998',
    localPrefix: '0',
    validPrefixes: ['9'],
    minLength: 9,
    maxLength: 9,
    displayFormat: (number) => `+998 ${number.slice(0, 2)}-${number.slice(2, 5)}-${number.slice(5)}`
  }
];

/**
 * Normalizes Asian phone numbers to international format
 * Supports multiple input formats and auto-detects country
 */
export const normalizeAsianPhone = (input: string): PhoneNormalizationResult => {
  // Remove all non-digit characters except +
  const cleaned = input.replace(/[^\d+]/g, '');
  
  // Default result
  const result: PhoneNormalizationResult = {
    normalized: '',
    isValid: false,
    originalFormat: 'invalid',
    displayFormat: input,
    country: '',
    countryCode: ''
  };

  // Empty input
  if (!cleaned) {
    return result;
  }

  // Try to detect country and normalize
  for (const country of ASIAN_COUNTRIES) {
    const countryMatch = tryNormalizeForCountry(cleaned, country);
    if (countryMatch.isValid) {
      return countryMatch;
    }
  }

  return result;
};

/**
 * Try to normalize phone number for a specific country
 */
const tryNormalizeForCountry = (cleaned: string, country: CountryPhoneConfig): PhoneNormalizationResult => {
  const result: PhoneNormalizationResult = {
    normalized: '',
    isValid: false,
    originalFormat: 'invalid',
    displayFormat: cleaned,
    country: country.name,
    countryCode: country.countryCode
  };

  // International format: +countryCode
  if (cleaned.startsWith(`+${country.countryCode}`)) {
    const number = cleaned.slice(country.countryCode.length + 1);
    if (isValidMobileNumber(number, country)) {
      result.normalized = country.countryCode + number;
      result.isValid = true;
      result.originalFormat = 'international';
      result.displayFormat = country.displayFormat(number);
      return result;
    }
  }
  
  // Country code format: countryCode (without +)
  else if (cleaned.startsWith(country.countryCode)) {
    const number = cleaned.slice(country.countryCode.length);
    if (isValidMobileNumber(number, country)) {
      result.normalized = cleaned;
      result.isValid = true;
      result.originalFormat = 'country-code';
      result.displayFormat = country.displayFormat(number);
      return result;
    }
  }
  
  // Local format: with local prefix
  else if (country.localPrefix && cleaned.startsWith(country.localPrefix)) {
    const number = cleaned.slice(country.localPrefix.length);
    if (isValidMobileNumber(number, country)) {
      result.normalized = country.countryCode + number;
      result.isValid = true;
      result.originalFormat = 'local';
      result.displayFormat = country.displayFormat(number);
      return result;
    }
  }
  
  // Direct format (no prefix) - for countries like Singapore, Hong Kong
  else if (!country.localPrefix) {
    if (isValidMobileNumber(cleaned, country)) {
      result.normalized = country.countryCode + cleaned;
      result.isValid = true;
      result.originalFormat = 'local';
      result.displayFormat = country.displayFormat(cleaned);
      return result;
    }
  }

  return result;
};

/**
 * Check if number is valid for specific country
 */
const isValidMobileNumber = (number: string, country: CountryPhoneConfig): boolean => {
  // Check length
  if (number.length < country.minLength || number.length > country.maxLength) {
    return false;
  }

  // Check if starts with valid prefix
  return country.validPrefixes.some(prefix => number.startsWith(prefix));
};

/**
 * Legacy Indonesian phone normalization for backward compatibility
 */
export const normalizeIndonesianPhone = (input: string): PhoneNormalizationResult => {
  const result = normalizeAsianPhone(input);
  
  // Only return Indonesian results or invalid
  if (result.country === 'Indonesia' || !result.isValid) {
    return result;
  }
  
  // Return invalid if not Indonesian
  return {
    normalized: '',
    isValid: false,
    originalFormat: 'invalid',
    displayFormat: input,
    country: '',
    countryCode: ''
  };
};

/**
 * Formats phone number for display
 */
export const formatDisplayPhone = (normalizedPhone: string): string => {
  // Find the country for this phone number
  for (const country of ASIAN_COUNTRIES) {
    if (normalizedPhone.startsWith(country.countryCode)) {
      const number = normalizedPhone.slice(country.countryCode.length);
      if (isValidMobileNumber(number, country)) {
        return country.displayFormat(number);
      }
    }
  }
  
  // Fallback for unknown format
  return normalizedPhone;
};

/**
 * Checks if a string looks like a phone number (vs email)
 */
export const isPhoneNumber = (input: string): boolean => {
  const cleaned = input.replace(/[^\d+]/g, '');
  
  // Check against all Asian country patterns
  for (const country of ASIAN_COUNTRIES) {
    const patterns = [
      new RegExp(`^\\+?${country.countryCode}\\d{${country.minLength},${country.maxLength}}$`),
      ...(country.localPrefix ? [new RegExp(`^\\${country.localPrefix}\\d{${country.minLength},${country.maxLength}}$`)] : [])
    ];
    
    if (patterns.some(pattern => pattern.test(cleaned))) {
      return true;
    }
  }
  
  return false;
};

/**
 * Normalizes any identifier (phone or email) for login
 */
export const normalizeLoginIdentifier = (identifier: string): string => {
  // Check if it's a phone number
  if (isPhoneNumber(identifier)) {
    const result = normalizeAsianPhone(identifier);
    return result.isValid ? result.normalized : identifier;
  }
  
  // Return as-is for email addresses
  return identifier.trim().toLowerCase();
};

/**
 * Validates Asian phone number
 */
export const validateAsianPhone = (phone: string): { isValid: boolean; error?: string; country?: string } => {
  const result = normalizeAsianPhone(phone);
  
  if (!result.isValid) {
    if (!phone.trim()) {
      return { isValid: false, error: 'Phone number is required' };
    }
    return { isValid: false, error: 'Invalid phone number format. Please use local or international format.' };
  }
  
  return { isValid: true, country: result.country };
};

/**
 * Legacy Indonesian phone validation for backward compatibility
 */
export const validateIndonesianPhone = (phone: string): { isValid: boolean; error?: string } => {
  const result = normalizeIndonesianPhone(phone);
  
  if (!result.isValid) {
    if (!phone.trim()) {
      return { isValid: false, error: 'Nomor telepon wajib diisi' };
    }
    return { isValid: false, error: 'Format nomor telepon tidak valid. Gunakan format 08xxx atau +62xxx' };
  }
  
  return { isValid: true };
};

/**
 * Get list of supported countries
 */
export const getSupportedCountries = (): Array<{code: string, name: string, countryCode: string, flag: string}> => {
  const countryFlags: Record<string, string> = {
    'ID': '🇮🇩', 'MY': '🇲🇾', 'SG': '🇸🇬', 'TH': '🇹🇭', 'PH': '🇵🇭', 'VN': '🇻🇳',
    'KH': '🇰🇭', 'LA': '🇱🇦', 'MM': '🇲🇲', 'BN': '🇧🇳', 'CN': '🇨🇳', 'JP': '🇯🇵',
    'KR': '🇰🇷', 'TW': '🇹🇼', 'HK': '🇭🇰', 'MO': '🇲🇴', 'IN': '🇮🇳', 'PK': '🇵🇰',
    'BD': '🇧🇩', 'LK': '🇱🇰', 'NP': '🇳🇵', 'KZ': '🇰🇿', 'UZ': '🇺🇿'
  };

  return ASIAN_COUNTRIES.map(country => ({
    code: country.code,
    name: country.name,
    countryCode: country.countryCode,
    flag: countryFlags[country.code] || '🏳️'
  }));
};

/**
 * Standard phone number placeholder for Indonesian numbers
 */
export const PHONE_PLACEHOLDER = '+62 812-3456-7890';

/**
 * Standard help text for phone number inputs
 */
export const PHONE_HELP_TEXT = 'Format: +62 XXX-XXXX-XXXX';

/**
 * Format phone number for consistent display
 * Uses formatDisplayPhone internally but provides simpler API
 */
export const formatPhoneNumber = (phone: string | undefined | null): string => {
  if (!phone) return '';
  return formatDisplayPhone(phone);
};

// Export for use in components
export default {
  normalizeIndonesianPhone,
  formatDisplayPhone,
  formatPhoneNumber,
  isPhoneNumber,
  normalizeLoginIdentifier,
  validateIndonesianPhone,
  PHONE_PLACEHOLDER,
  PHONE_HELP_TEXT
};
