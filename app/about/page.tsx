import React from 'react';
import { Bike, ChefHat, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-[#171a29] text-white py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            Delivering <span className="text-orange-500">Happiness</span>, <br />
            One Order at a Time.
          </h1>
          <p className="text-gray-400 text-lg md:text-xl mb-8 leading-relaxed">
            GO515 is Tadipatri's first hyperlocal delivery platform. We are on a mission to connect 
            local restaurants with food lovers using world-class technology.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 -mt-10 relative z-10 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Bike className="w-8 h-8 text-orange-500" />, title: "30 Mins", desc: "Average Delivery Time" },
            { icon: <ChefHat className="w-8 h-8 text-orange-500" />, title: "50+", desc: "Restaurant Partners" },
            { icon: <Users className="w-8 h-8 text-orange-500" />, title: "1000+", desc: "Happy Customers" },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
              <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {stat.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.title}</h3>
              <p className="text-gray-500">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Story Section */}
      <div className="container mx-auto px-4 max-w-3xl mb-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
        <div className="prose prose-lg text-gray-600">
          <p className="mb-4">
            It started with a simple craving. Living in a tier-2 city, we realized that getting 
            great food delivered from our favorite local spots was harder than it should be.
          </p>
          <p className="mb-4">
            Existing apps focused only on metros, ignoring the vibrant culinary culture of 
            towns like Anantapur and Tadipatri. We decided to change that.
          </p>
          <p>
            GO515 wasn't just built to deliver food; it was built to empower local businesses. 
            By providing restaurants with the same tech tools that big chains use, we help them 
            grow while giving you the convenience you deserve.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-orange-600 py-16 px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-6">Ready to order?</h2>
        <Link href="/">
          <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 font-bold px-8 h-12 rounded-full">
            Explore Menu
          </Button>
        </Link>
      </div>
    </div>
  );
}