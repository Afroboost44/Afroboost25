'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
  onClick?: () => void;
}

const Card = ({ children, className = '', hoverEffect = true, onClick }: CardProps) => {
  return (
    <motion.div
      className={`card ${hoverEffect ? 'hover-scale' : ''} ${className}`}
      whileHover={hoverEffect ? { y: -3 } : {}}
      transition={{ type: 'spring', stiffness: 200 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export default Card; 