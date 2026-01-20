/**
 * Quick Navigation Test Component
 * Add this temporarily to FlashSalesPage to test navigation
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationTest: React.FC = () => {
  const navigate = useNavigate();

  const testNavigation = () => {
    navigate('/products/1'); // Test with a hardcoded product ID
  };

  return (
    <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
      <h3 className="text-yellow-300 font-bold mb-2">Navigation Test</h3>
      <button 
        onClick={testNavigation}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
      >
        Test Navigate to Product Detail
      </button>
      <p className="text-xs text-yellow-200 mt-2">
        This button should navigate to /products/1
      </p>
    </div>
  );
};

export default NavigationTest;
