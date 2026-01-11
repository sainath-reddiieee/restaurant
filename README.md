# GO515

Digital Storefront & Logistics Platform for Local Restaurants

## Features

- **Role-Based Access**: Distinct UIs for Super Admins, Restaurant Owners, and Customers
- **Restaurant Management**: Onboard restaurants, manage menus, track orders
- **Voice Ordering**: Voice note support for customer orders
- **Loot Mode**: Flash sales on excess inventory
- **Mystery Boxes**: Surprise meals at discounted prices
- **Real-time Updates**: Live order tracking with Supabase realtime

## Tech Stack

- Next.js 13 with App Router
- Supabase (Auth, Database, Realtime)
- TypeScript
- Tailwind CSS + shadcn/ui
- Row Level Security for data protection

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment variables (see `.env`)
3. Run development server: `npm run dev`
4. Build for production: `npm run build`

## Roles

- **SUPER_ADMIN**: Platform-wide control, onboard restaurants, view all data
- **RESTAURANT**: Manage menu, view orders, update order status
- **CUSTOMER**: Browse restaurants, place orders, track deliveries
