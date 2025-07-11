// Script para testar o frontend localmente
// Execute este script no browser console para debug

async function testFrontend() {
  console.log('Testing frontend components...');
  
  try {
    // Test localStorage
    console.log('\n1. Testing localStorage...');
    const token = localStorage.getItem('token');
    const teamId = localStorage.getItem('teamId');
    console.log('Token exists:', !!token);
    console.log('TeamId exists:', !!teamId);
    
    // Test API URL building
    console.log('\n2. Testing API URL building...');
    const isDev = window.location.hostname === 'localhost';
    const apiUrl = isDev 
      ? (import.meta?.env?.VITE_API_URL || 'http://localhost:3001/api')
      : 'https://camp-management-1.onrender.com/api';
    console.log('API URL:', apiUrl);
    console.log('Is Dev:', isDev);
    
    // Test fetch to backend
    console.log('\n3. Testing fetch to backend...');
    if (token) {
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('Auth/me response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Auth/me data:', data);
      }
    } else {
      console.log('No token found, skipping auth test');
    }
    
  } catch (error) {
    console.error('Error testing frontend:', error.message);
  }
}

// Auto-run the test
testFrontend(); 