import './globals.css';
import '../../styles/tokens.css'; // your CSS vars file
import { ClerkProvider } from '@clerk/nextjs';

export const metadata = { title: 'DealForge', description: 'CI MVP' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
