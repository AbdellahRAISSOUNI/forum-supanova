'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="z-50 bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Brand */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center space-x-4"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg bg-neutral-900 ring-1 ring-black/10">
              <img src="/logo_forum.png" alt="Forum des Entreprises" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Forum des Entreprises</h1>
              <p className="text-sm text-gray-600">ENSA Tétouan</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden md:flex space-x-4"
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Se connecter
              </motion.button>
            </Link>
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-white/90 text-[#2880CA] border-2 border-[#2880CA] rounded-xl font-medium hover:bg-[#2880CA] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                S'inscrire
              </motion.button>
            </Link>
          </motion.div>

          {/* Mobile Burger Menu Button */}
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={toggleMenu}
            className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label="Toggle menu"
          >
            <div className={`absolute w-5 h-0.5 bg-white rounded-full transition-all duration-200 ${isMenuOpen ? 'rotate-45 translate-y-0' : 'rotate-0 -translate-y-1'}`} />
            <div className={`absolute w-5 h-0.5 bg-white rounded-full transition-all duration-150 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
            <div className={`absolute w-5 h-0.5 bg-white rounded-full transition-all duration-200 ${isMenuOpen ? '-rotate-45 translate-y-0' : 'rotate-0 translate-y-1'}`} />
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-white/20 animate-slide-down">
          <div className="px-4 py-6 space-y-4">
            {/* Login Button */}
            <Link href="/login" onClick={closeMenu}>
              <button className="w-full px-6 py-3 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Se connecter</span>
              </button>
            </Link>

            {/* Register Button */}
            <Link href="/register" onClick={closeMenu}>
              <button className="w-full px-6 py-3 bg-white text-[#2880CA] border-2 border-[#2880CA] rounded-xl font-medium hover:bg-[#2880CA] hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 mt-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>S'inscrire</span>
              </button>
            </Link>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
