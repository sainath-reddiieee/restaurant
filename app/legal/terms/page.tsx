import React from 'react';

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
      <p className="text-sm text-gray-500 mb-4">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p>Welcome to GO515. By using our website and services, you agree to these terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Services</h2>
          <p>GO515 provides a platform for local food delivery in Tier-2 cities. We connect customers with local restaurants.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. User Accounts</h2>
          <p>You are responsible for maintaining the security of your account and password. GO515 cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Orders & Payments</h2>
          <p>All payments are processed securely. Prices are listed by the restaurant partners. We reserve the right to cancel orders if an item is unavailable.</p>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-2">5. Contact Us</h2>
          <p>If you have any questions, please contact us at psainath123@gmail.com</p>
        </section>
      </div>
    </div>
  );
}