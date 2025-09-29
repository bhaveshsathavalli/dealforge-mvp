// Deep debug script to test Clerk API methods
async function testClerkMethods() {
  try {
    const { clerkClient } = require('@clerk/nextjs/server');
    
    console.log('=== TESTING CLERK CLIENT INSTANTIATION ===');
    const client = await clerkClient();
    console.log('Client created successfully:', !!client);
    console.log('Organizations available:', !!client.organizations);
    
    if (client.organizations) {
      console.log('Organizations methods:', Object.keys(client.organizations));
      
      // Test if the specific methods exist
      console.log('updateOrganizationMembership exists:', typeof client.organizations.updateOrganizationMembership);
      console.log('deleteOrganizationMembership exists:', typeof client.organizations.deleteOrganizationMembership);
      
      // Check if they're functions
      if (typeof client.organizations.updateOrganizationMembership === 'function') {
        console.log('✅ updateOrganizationMembership is a function');
      } else {
        console.log('❌ updateOrganizationMembership is NOT a function');
      }
      
      if (typeof client.organizations.deleteOrganizationMembership === 'function') {
        console.log('✅ deleteOrganizationMembership is a function');
      } else {
        console.log('❌ deleteOrganizationMembership is NOT a function');
      }
    }
    
  } catch (error) {
    console.error('Error testing Clerk methods:', error.message);
    console.error('Stack:', error.stack);
  }
}

testClerkMethods().catch(console.error);
