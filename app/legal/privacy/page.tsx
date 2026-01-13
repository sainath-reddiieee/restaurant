import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">Information We Collect</h2>
          <p>We collect information you provide directly to us, such as your name, phone number, and delivery address when you place an order.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">How We Use Information</h2>
          <p>We use your information to facilitate order delivery, communicate with you about your order, and improve our platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information.</p>
        </section>
      </div>
    </div>
  );
}