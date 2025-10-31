<<<<<<< HEAD
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

=======
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

>>>>>>> ddd273af2a7b494359b5df1cd43dbc83468035f0
export default Card; 