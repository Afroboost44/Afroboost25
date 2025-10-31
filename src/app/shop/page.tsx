<<<<<<< HEAD
"use client";

import React from "react";
import { motion } from "framer-motion";

export default function ShopPage() {
  const items = [
    { id: 1, name: "T-shirt Afroboost", price: "30 CHF" },
    { id: 2, name: "Chaussettes Afroboost", price: "10 CHF" },
    { id: 3, name: "Carte Réduc’ Afroboost (1 an)", price: "100 CHF" },
    { id: 4, name: "Pack Pulse10 (10 séances)", price: "80 CHF" },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-bold mb-8 text-center text-fuchsia-400"
      >
        Boutique Afroboost
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {items.map((item) => (
          <motion.div
            key={item.id}
            whileHover={{ scale: 1.05 }}
            className="border border-gray-700 rounded-2xl p-6 text-center bg-neutral-900 hover:bg-neutral-800 transition-all"
          >
            <h2 className="text-2xl font-semibold mb-2">{item.name}</h2>
            <p className="text-lg mb-4">{item.price}</p>
            <button className="bg-fuchsia-600 hover:bg-fuchsia-700 px-4 py-2 rounded-xl text-white font-medium">
              Acheter
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
=======
'use client';

import Shop from '@/components/Shop';

export default function ShopPage() {
  return <Shop />;
>>>>>>> ddd273af2a7b494359b5df1cd43dbc83468035f0
}
