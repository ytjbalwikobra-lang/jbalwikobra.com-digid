/**
 * 🧪 Payment Testing Utilities
 * Shared utilities for testing payment flows to eliminate code duplication
 */

export class PaymentTestConfig {
  static readonly PAYMENT_METHODS = {
    QRIS: 'qris',
    BCA_VA: 'bca',
    BNI_VA: 'bni',
    MANDIRI_VA: 'mandiri',
    DANA: 'dana',
    GOPAY: 'gopay',
    SHOPEEPAY: 'shopeepay',
    LINKAJA: 'linkaja'
  } as const;

  static readonly TEST_AMOUNTS = {
    SMALL: 10000,
    MEDIUM: 50000,
    LARGE: 100000
  } as const;

  static readonly TEST_CUSTOMER = {
    given_names: 'Test User',
    email: 'test@example.com',
    mobile_number: '+628123456789'
  } as const;

  static readonly BASE_URLS = {
    PRODUCTION: 'https://www.jbalwikobra.com',
    LOCAL: 'http://localhost:3000'
  } as const;
}

export interface PaymentTestResult {
  success: boolean;
  payment_id?: string;
  error?: string;
  status_code?: number;
  response_data?: any;
  execution_time?: number;
}

export class PaymentTester {
  private baseUrl: string;
  private testResults: PaymentTestResult[] = [];

  constructor(baseUrl: string = PaymentTestConfig.BASE_URLS.PRODUCTION) {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a standardized payment payload
   */
  createPaymentPayload(
    paymentMethodId: string,
    amount: number = PaymentTestConfig.TEST_AMOUNTS.MEDIUM,
    orderType: 'purchase' | 'rental' = 'purchase',
    customData?: Partial<any>
  ) {
    const basePayload = {
      payment_method_id: paymentMethodId,
      amount,
      currency: 'IDR',
      customer: PaymentTestConfig.TEST_CUSTOMER,
      description: `Test ${orderType} payment - ${paymentMethodId.toUpperCase()}`,
      external_id: `test_${paymentMethodId}_${orderType}_${Date.now()}`,
      success_redirect_url: `${this.baseUrl}/payment-status?status=success`,
      failure_redirect_url: `${this.baseUrl}/payment-status?status=failed`,
      order: {
        customer_name: PaymentTestConfig.TEST_CUSTOMER.given_names,
        customer_email: PaymentTestConfig.TEST_CUSTOMER.email,
        customer_phone: PaymentTestConfig.TEST_CUSTOMER.mobile_number,
        product_name: `Test ${orderType} product`,
        amount,
        order_type: orderType,
        ...(orderType === 'rental' && { rental_duration: 7 })
      }
    };

    return { ...basePayload, ...customData };
  }

  /**
   * Test payment methods API
   */
  async testPaymentMethods(amount?: number): Promise<PaymentTestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/xendit/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount || PaymentTestConfig.TEST_AMOUNTS.MEDIUM })
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      const result: PaymentTestResult = {
        success: response.ok,
        status_code: response.status,
        response_data: data,
        execution_time: executionTime
      };

      if (!response.ok) {
        result.error = data.error || `HTTP ${response.status}`;
      }

      this.testResults.push(result);
      return result;
    } catch (error) {
      const result: PaymentTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - startTime
      };
      
      this.testResults.push(result);
      return result;
    }
  }

  /**
   * Test direct payment creation
   */
  async testCreatePayment(
    paymentMethodId: string,
    amount?: number,
    orderType: 'purchase' | 'rental' = 'purchase'
  ): Promise<PaymentTestResult> {
    const startTime = Date.now();
    
    try {
      const payload = this.createPaymentPayload(paymentMethodId, amount, orderType);
      
      const response = await fetch(`${this.baseUrl}/api/xendit/create-direct-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      const result: PaymentTestResult = {
        success: response.ok,
        status_code: response.status,
        response_data: data,
        execution_time: executionTime
      };

      if (response.ok && data.id) {
        result.payment_id = data.id;
      } else {
        result.error = data.error || `HTTP ${response.status}`;
      }

      this.testResults.push(result);
      return result;
    } catch (error) {
      const result: PaymentTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - startTime
      };
      
      this.testResults.push(result);
      return result;
    }
  }

  /**
   * Test multiple payment methods sequentially
   */
  async testMultiplePaymentMethods(
    methods: string[],
    amount?: number,
    orderType: 'purchase' | 'rental' = 'purchase'
  ): Promise<PaymentTestResult[]> {
    const results: PaymentTestResult[] = [];
    
    for (const method of methods) {
            const result = await this.testCreatePayment(method, amount, orderType);
      results.push(result);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTest(): Promise<{
    paymentMethods: PaymentTestResult;
    purchaseTests: PaymentTestResult[];
    rentalTests: PaymentTestResult[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
  }> {
    
    // Test payment methods API
    const paymentMethods = await this.testPaymentMethods();
    
    // Test purchase flows
    const purchaseTests = await this.testMultiplePaymentMethods([
      PaymentTestConfig.PAYMENT_METHODS.QRIS,
      PaymentTestConfig.PAYMENT_METHODS.BNI_VA,
      PaymentTestConfig.PAYMENT_METHODS.DANA
    ], PaymentTestConfig.TEST_AMOUNTS.MEDIUM, 'purchase');
    
    // Test rental flows
    const rentalTests = await this.testMultiplePaymentMethods([
      PaymentTestConfig.PAYMENT_METHODS.QRIS,
      PaymentTestConfig.PAYMENT_METHODS.MANDIRI_VA
    ], PaymentTestConfig.TEST_AMOUNTS.LARGE, 'rental');
    
    // Calculate summary
    const allTests = [paymentMethods, ...purchaseTests, ...rentalTests];
    const successful = allTests.filter(test => test.success).length;
    const total = allTests.length;
    
    const summary = {
      total,
      successful,
      failed: total - successful,
      successRate: (successful / total) * 100
    };
    
        
    return {
      paymentMethods,
      purchaseTests,
      rentalTests,
      summary
    };
  }

  /**
   * Get test results
   */
  getTestResults(): PaymentTestResult[] {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    const results = this.testResults;
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    let report = `📊 Payment Test Report\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Total Tests: ${results.length}\n`;
    report += `Successful: ${successful}\n`;
    report += `Failed: ${failed}\n`;
    report += `Success Rate: ${((successful / results.length) * 100).toFixed(1)}%\n\n`;
    
    if (failed > 0) {
      report += `❌ Failed Tests:\n`;
      results.filter(r => !r.success).forEach((result, index) => {
        report += `  ${index + 1}. ${result.error || 'Unknown error'}\n`;
      });
    }
    
    return report;
  }
}

/**
 * Terminal/PowerShell Testing Utilities
 */
export class TerminalPaymentTester {
  private baseUrl: string;

  constructor(baseUrl: string = PaymentTestConfig.BASE_URLS.PRODUCTION) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generate PowerShell command for testing payment methods
   */
  generatePaymentMethodsCommand(amount?: number): string {
    const payload = JSON.stringify({ amount: amount || PaymentTestConfig.TEST_AMOUNTS.MEDIUM });
    
    return `Invoke-WebRequest -Uri "${this.baseUrl}/api/xendit/payment-methods" ` +
           `-Method POST ` +
           `-Headers @{"Content-Type"="application/json"} ` +
           `-Body '${payload}' ` +
           `-UseBasicParsing`;
  }

  /**
   * Generate PowerShell command for testing payment creation
   */
  generateCreatePaymentCommand(
    paymentMethodId: string,
    amount?: number,
    orderType: 'purchase' | 'rental' = 'purchase'
  ): string {
    const tester = new PaymentTester(this.baseUrl);
    const payload = tester.createPaymentPayload(paymentMethodId, amount, orderType);
    const payloadJson = JSON.stringify(payload).replace(/'/g, "''"); // Escape single quotes for PowerShell
    
    return `$payload = '${payloadJson}'; ` +
           `Invoke-WebRequest -Uri "${this.baseUrl}/api/xendit/create-direct-payment" ` +
           `-Method POST ` +
           `-Headers @{"Content-Type"="application/json"} ` +
           `-Body $payload ` +
           `-UseBasicParsing`;
  }

  /**
   * Generate complete PowerShell test script
   */
  generateCompleteTestScript(): string {
    const script = `# 🧪 Automated Payment Testing Script
# Generated by PaymentTestingUtilities

Write-Host "🚀 Payment Testing Suite" -ForegroundColor Green
Write-Host "Testing: ${this.baseUrl}" -ForegroundColor Yellow
Write-Host "${'='.repeat(60)}"

# Test 1: Payment Methods API
Write-Host "\\n1️⃣ Testing Payment Methods API..." -ForegroundColor Cyan
try {
    ${this.generatePaymentMethodsCommand()}
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Payment Methods API: SUCCESS" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Payment Methods API: FAILED" -ForegroundColor Red
}

# Test 2: QRIS Purchase
Write-Host "\\n2️⃣ Testing QRIS Purchase..." -ForegroundColor Cyan
try {
    ${this.generateCreatePaymentCommand(PaymentTestConfig.PAYMENT_METHODS.QRIS, PaymentTestConfig.TEST_AMOUNTS.MEDIUM, 'purchase')}
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ QRIS Purchase: SUCCESS" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ QRIS Purchase: FAILED" -ForegroundColor Red
}

# Test 3: Virtual Account Rental
Write-Host "\\n3️⃣ Testing Virtual Account Rental..." -ForegroundColor Cyan
try {
    ${this.generateCreatePaymentCommand(PaymentTestConfig.PAYMENT_METHODS.BNI_VA, PaymentTestConfig.TEST_AMOUNTS.LARGE, 'rental')}
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Virtual Account Rental: SUCCESS" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Virtual Account Rental: FAILED" -ForegroundColor Red
}

Write-Host "\\n✅ Test suite completed!" -ForegroundColor Green`;

    return script;
  }
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).PaymentTester = PaymentTester;
  (window as any).PaymentTestConfig = PaymentTestConfig;
  (window as any).TerminalPaymentTester = TerminalPaymentTester;
}
