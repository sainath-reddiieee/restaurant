import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/providers/auth-provider';
import { CartProvider } from '@/components/providers/cart-provider';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from '@/components/footer'; // Import the new footer

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GO515 - Food Delivery Platform',
  description: 'Digital Storefront & Logistics Platform for Local Restaurants',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
              <div className="flex-grow">
                {children}
              </div>
              <Footer /> {/* Add Footer here */}
            </div>
            <Toaster />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}