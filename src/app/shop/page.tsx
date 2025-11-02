'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Shop() {
  const products = [
    { id: 1, name: 'T-shirt Afroboost', price: '35 CHF', image: '/images/tshirt.png' },
    { id: 2, name: 'Chaussettes Afroboost', price: '15 CHF', image: '/images/socks.png' },
    { id: 3, name: 'Carte Réduc’ Afroboost', price: '100 CHF/an', image: '/images/card.png' },
  ];

  return (<>  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-bold text-center mb-10 gradient-text"
      >
        Boutique Afroboost �
