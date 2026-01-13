import React from 'react';

export default function RefundPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Refund & Cancellation Policy</h1>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">Cancellations</h2>
          <p>As a general rule, you shall not be entitled to cancel your order once you have received confirmation of the same.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Refunds</h2>
          <p>You may be entitled to a refund if:</p>
          <ul className="list-disc ml-5 mt-2">
            <li>The order packaging has been tampered with or damaged at the time of delivery.</li>
            <li>The order is cancelled by the restaurant due to unavailability.</li>
            <li>You cancel the order due to a delay of more than 60 minutes.</li>
          </ul>
          <p className="mt-2">Refunds will be processed to the original payment method within 5-7 business days.</p>
        </section>
      </div>
    </div>
  );
}