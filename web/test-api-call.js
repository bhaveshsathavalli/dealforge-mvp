// Test the actual API call with real data
async function testAPICall() {
  try {
    console.log('=== TESTING API CALL ===');
    
    // Test the members list endpoint first
    const testMembersResponse = await fetch('http://localhost:3000/api/team/members', {
      method: 'GET',
      headers: {
        'Cookie': 'test=1' // Fake cookie to simulate auth
      }
    });
    
    const testMembersData = await testMembersResponse.json();
    console.log('Members API Response:', {
      status: testMembersResponse.status,
      ok: testMembersData.ok,
      error: testMembersData.error?.code || testMembersData.error?.message
    });
    
  } catch (error) {
    console.error('API Test Error:', error.message);
  }
}

testAPICall().catch(console.error);
