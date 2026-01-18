import React from 'react';

export default function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Shipping & Delivery Policy</h1>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">Delivery Areas</h2>
          <p>We currently deliver to specific locations within Anantapur and Tadipatri. Please check your delivery availability by entering your location on the homepage.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Delivery Timings</h2>
          <p>Standard delivery time is 30-45 minutes. Late Night Loot orders may vary based on rider availability.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">Delivery Charges</h2>
          <p>Delivery fees are calculated based on the distance between the restaurant and your delivery location. The exact fee will be displayed at checkout.</p>
        </section>
      </div>
    </div>
  );
}