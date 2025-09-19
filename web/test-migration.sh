#!/bin/bash
# Test script for Clerk + Supabase migration
# Run this after starting your dev server

echo "🧪 Testing Clerk + Supabase Migration"
echo "=================================="

# Test 1: Check if dev server is running
echo "1. Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Dev server is running"
else
    echo "❌ Dev server not running. Start with: npm run dev"
    exit 1
fi

# Test 2: Check whoami endpoint (should require auth)
echo "2. Testing /api/debug/whoami endpoint..."
response=$(curl -s http://localhost:3000/api/debug/whoami)
echo "Response: $response"

# Test 3: Check sign-in page
echo "3. Testing sign-in page..."
if curl -s http://localhost:3000/sign-in | grep -q "SignIn"; then
    echo "✅ Sign-in page loads correctly"
else
    echo "❌ Sign-in page not loading properly"
fi

# Test 4: Check sign-up page  
echo "4. Testing sign-up page..."
if curl -s http://localhost:3000/sign-up | grep -q "SignUp"; then
    echo "✅ Sign-up page loads correctly"
else
    echo "❌ Sign-up page not loading properly"
fi

echo ""
echo "🎉 Basic tests complete!"
echo "Next: Try signing up with Clerk and completing onboarding"