"use client";

import { motion } from "framer-motion";

export default function ShopPage() {
  const products = [
    { id: 1, name: "T-shirt Afroboost", price: "49 CHF", image: "/images/tshirt.png" },
    { id: 2, name: "Afroboost Socks", price: "19 CHF", image: "/images/socks.png" },
    { id: 3, name: "Carte Réduc’ Afroboost", price: "100 CHF/an", image: "/images/card.png" },
  ];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-3xl font-bold mb-10 text-center"
      >
        Boutique Afroboost
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {products.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-900 rounded-2xl p-6 text-center hover:bg-gray-800 transition"
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-48 object-contain mb-4"
            />
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="mt-2 text-pink-400">{product.price}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
