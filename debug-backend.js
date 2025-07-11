const fetch = require('node-fetch');

async function testBackend() {
  const baseUrl = 'http://localhost:3001/api';
  
  console.log('Testing backend endpoints...');
  
  try {
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    console.log('Health status:', healthResponse.status);
    
    // Test auth/me endpoint (this will fail without auth, but we can see the response)
    console.log('\n2. Testing auth/me endpoint...');
    const authResponse = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('Auth/me status:', authResponse.status);
    
    // Test teams/current endpoint
    console.log('\n3. Testing teams/current endpoint...');
    const teamsResponse = await fetch(`${baseUrl}/teams/current`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log('Teams/current status:', teamsResponse.status);
    
    // Test staff endpoint
    console.log('\n4. Testing staff endpoint...');
    const staffResponse = await fetch(`${baseUrl}/staff`, {
      headers: {
        'Authorization': 'Bearer test-token',
        'x-team-id': 'test-team-id'
      }
    });
    console.log('Staff status:', staffResponse.status);
    
  } catch (error) {
    console.error('Error testing backend:', error.message);
  }
}

testBackend(); 