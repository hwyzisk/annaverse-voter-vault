// Test complete user registration and approval workflow
const API_BASE = 'http://localhost:5000';

async function testRegistration() {
  console.log('🧪 Testing user registration workflow...\n');

  // Test data
  const testUser = {
    email: 'testuser@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '555-123-4567',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    dateOfBirth: '1990-01-01',
    password: 'TestPassword123!'
  };

  try {
    // Step 1: Register new user
    console.log('1️⃣ Registering new user...');
    const registerResponse = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    const registerResult = await registerResponse.json();
    console.log('Registration response:', registerResult);

    if (!registerResult.success) {
      console.log('❌ Registration failed:', registerResult.message);
      return;
    }

    console.log('✅ User registered successfully');
    console.log('📧 Emails should have been sent (but will show warnings without SENDGRID_API_KEY)');

    const userId = registerResult.userId;
    console.log('User ID:', userId);

    // Step 2: Try to login with pending user (should fail)
    console.log('\n2️⃣ Attempting to login with pending user (should fail)...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    const loginResult = await loginResponse.json();
    console.log('Login attempt result:', loginResult);

    if (loginResult.success) {
      console.log('❌ User should not be able to login before approval');
    } else {
      console.log('✅ Correctly blocked login for pending user');
    }

    console.log('\n🎯 Registration workflow test completed!');
    console.log('\nNext steps for admin:');
    console.log('- Login as admin');
    console.log('- View pending users');
    console.log(`- Approve user ${userId} using POST /api/admin/approve-user/${userId}`);
    console.log('- Test user login after approval');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRegistration();