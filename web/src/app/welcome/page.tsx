import { redirect } from 'next/navigation';

export default function WelcomePage() {
  // Always redirect to dashboard - onboarding removed
  redirect('/dashboard');
}
