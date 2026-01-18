import Link from 'next/link';
import { Bike } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white pt-10 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">GO515</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Hyperlocal food delivery platform designed for Tier-2 cities.
            </p>
            {/* REMOVED REGISTERED BUSINESS LINE HERE */}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-orange-600">About Us</Link></li>
              <li><Link href="/partner" className="hover:text-orange-600">Partner with us</Link></li>
              <li><Link href="/join-rider" className="hover:text-orange-600">Ride with us</Link></li>
              <li><Link href="/contact" className="hover:text-orange-600">Contact</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/legal/terms" className="hover:text-orange-600">Terms & Conditions</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-orange-600">Privacy Policy</Link></li>
              <li><Link href="/legal/refund" className="hover:text-orange-600">Refund Policy</Link></li>
              <li><Link href="/legal/shipping" className="hover:text-orange-600">Shipping Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Contact Us</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>PNR Kitchenes Tadipatri, Andhra Pradesh</li>
              <li>Email: psainath123@gmail.com</li>
              <li>Phone: +91 9441414140</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-100 pt-6 text-center">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} GO515. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}