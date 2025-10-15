/**
 * Load testing script to verify performance improvements
 * Tests concurrent user scenarios
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const CONCURRENT_USERS = 50;
const REQUESTS_PER_USER = 10;

interface TestResult {
  endpoint: string;
  success: number;
  failed: number;
  averageResponseTime: number;
  rateLimitHits: number;
  errors: string[];
}

class LoadTester {
  private results: TestResult[] = [];

  async testEndpoint(
    endpoint: string,
    method: string = 'GET',
    body?: any,
    headers?: Record<string, string>
  ): Promise<TestResult> {
    const result: TestResult = {
      endpoint,
      success: 0,
      failed: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      errors: []
    };

    const promises: Promise<void>[] = [];

    // Create concurrent requests
    for (let user = 0; user < CONCURRENT_USERS; user++) {
      for (let req = 0; req < REQUESTS_PER_USER; req++) {
        promises.push(this.makeRequest(endpoint, method, body, headers, result));
      }
    }

    await Promise.all(promises);

    // Calculate average response time
    if (result.success > 0) {
      result.averageResponseTime = result.averageResponseTime / result.success;
    }

    return result;
  }

  private async makeRequest(
    endpoint: string,
    method: string,
    body: any,
    headers: Record<string, string> = {},
    result: TestResult
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const responseTime = Date.now() - startTime;
      result.averageResponseTime += responseTime;

      if (response.ok) {
        result.success++;
      } else {
        result.failed++;
        
        if (response.status === 429) {
          result.rateLimitHits++;
        } else {
          result.errors.push(`HTTP ${response.status}`);
        }
      }
    } catch (error) {
      result.failed++;
      result.errors.push(error.message);
    }
  }

  async runTests(): Promise<void> {
    console.log('🚀 Starting Load Tests');
    console.log(`📊 Testing ${CONCURRENT_USERS} concurrent users, ${REQUESTS_PER_USER} requests each`);
    console.log('=' .repeat(60));

    // Test 1: Authentication endpoints
    console.log('\n🔐 Testing Authentication Endpoints...');
    
    // Test registration (should hit rate limits)
    const registrationResult = await this.testEndpoint('/api/auth/register', 'POST', {
      firstName: 'Test',
      name: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      confirmPassword: 'password123',
      studentStatus: 'ensa',
      opportunityType: 'pfe'
    });
    
    this.results.push(registrationResult);
    this.printResult('Registration', registrationResult);

    // Test 2: Queue operations (if we had auth)
    console.log('\n🎯 Testing Queue Operations...');
    
    const queueResult = await this.testEndpoint('/api/student/queues');
    this.results.push(queueResult);
    this.printResult('Student Queues', queueResult);

    // Test 3: Companies endpoint
    console.log('\n🏢 Testing Companies Endpoint...');
    
    const companiesResult = await this.testEndpoint('/api/companies');
    this.results.push(companiesResult);
    this.printResult('Companies List', companiesResult);

    // Test 4: System status
    console.log('\n📊 Testing System Status...');
    
    const statusResult = await this.testEndpoint('/api/admin/system/status');
    this.results.push(statusResult);
    this.printResult('System Status', statusResult);

    // Print summary
    this.printSummary();
  }

  private printResult(name: string, result: TestResult): void {
    const total = result.success + result.failed;
    const successRate = total > 0 ? (result.success / total * 100).toFixed(1) : '0';
    
    console.log(`  ${name}:`);
    console.log(`    ✅ Success: ${result.success}/${total} (${successRate}%)`);
    console.log(`    ❌ Failed: ${result.failed}`);
    console.log(`    ⏱️  Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`);
    
    if (result.rateLimitHits > 0) {
      console.log(`    🚫 Rate Limited: ${result.rateLimitHits}`);
    }
    
    if (result.errors.length > 0) {
      const errorCounts = result.errors.reduce((acc, error) => {
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`    🔍 Errors: ${JSON.stringify(errorCounts, null, 6)}`);
    }
  }

  private printSummary(): void {
    console.log('\n📈 Load Test Summary');
    console.log('=' .repeat(60));
    
    const totalRequests = this.results.reduce((sum, r) => sum + r.success + r.failed, 0);
    const totalSuccess = this.results.reduce((sum, r) => sum + r.success, 0);
    const totalRateLimited = this.results.reduce((sum, r) => sum + r.rateLimitHits, 0);
    const avgResponseTime = this.results.reduce((sum, r) => sum + r.averageResponseTime, 0) / this.results.length;

    console.log(`📊 Total Requests: ${totalRequests}`);
    console.log(`✅ Total Success: ${totalSuccess} (${(totalSuccess/totalRequests*100).toFixed(1)}%)`);
    console.log(`🚫 Rate Limited: ${totalRateLimited}`);
    console.log(`⏱️  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    
    console.log('\n🎯 Performance Assessment:');
    
    if (totalSuccess / totalRequests > 0.8) {
      console.log('  ✅ System handled high load well');
    } else if (totalSuccess / totalRequests > 0.5) {
      console.log('  ⚠️  System struggled under load but remained functional');
    } else {
      console.log('  ❌ System failed under high load');
    }
    
    if (avgResponseTime < 1000) {
      console.log('  ✅ Response times are excellent');
    } else if (avgResponseTime < 3000) {
      console.log('  ⚠️  Response times are acceptable');
    } else {
      console.log('  ❌ Response times are too slow');
    }
    
    if (totalRateLimited > 0) {
      console.log('  ✅ Rate limiting is working correctly');
    }
  }
}

// Run the load test
async function main() {
  const tester = new LoadTester();
  
  try {
    await tester.runTests();
  } catch (error) {
    console.error('❌ Load test failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}
