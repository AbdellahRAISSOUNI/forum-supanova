'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import MobileHeader from "@/components/MobileHeader";

// Countdown component
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const forumDate = new Date('2025-10-15T09:30:00').getTime();
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = forumDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeUnits = [
    { label: 'Jours', value: timeLeft.days },
    { label: 'Heures', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Secondes', value: timeLeft.seconds }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="relative"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2880CA]/10 via-transparent to-[#1e5f8a]/10 rounded-3xl"></div>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-[#2880CA]/20 to-transparent rounded-full blur-xl"></div>
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-[#1e5f8a]/20 to-transparent rounded-full blur-xl"></div>
      
      <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl md:rounded-3xl p-6 md:p-8 lg:p-12 shadow-2xl border border-white/20">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-center mb-6 md:mb-8"
        >
          <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] bg-clip-text text-transparent mb-3 md:mb-4 px-2">
            Forum des Entreprises ENSA Tétouan
          </h3>
          <p className="text-base md:text-lg text-gray-600 mb-2">15-16 Octobre 2025</p>
          <p className="text-sm text-gray-500">Cérémonie d'ouverture à 09h30</p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {timeUnits.map((unit, index) => (
            <motion.div
              key={unit.label}
              initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.05, rotateY: 5 }}
              className="relative group"
            >
              <div className="bg-gradient-to-br from-[#2880CA] to-[#1e5f8a] rounded-xl md:rounded-2xl p-3 md:p-4 lg:p-6 text-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <div className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-bold text-white mb-1 md:mb-2">
                  {unit.value.toString().padStart(2, '0')}
                </div>
                <div className="text-blue-100 text-xs md:text-sm font-medium">
                  {unit.label}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl md:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Company Card with Logo
const CompanyCard = ({ name, sector, website, logoPath, index }: { name: string; sector: string; website: string; logoPath?: string; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, rotateX: -15 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ delay: index * 0.1, duration: 0.6 }}
    whileHover={{ y: -10, scale: 1.02, rotateX: 5 }}
    className="group relative"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#2880CA]/5 to-[#1e5f8a]/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 group-hover:border-[#2880CA]/30">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden">
          {logoPath ? (
            <img 
              src={logoPath} 
              alt={`${name} logo`}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                // Fallback to initial letter if image fails to load
                e.currentTarget.style.display = 'none';
                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div className={`w-full h-full bg-gradient-to-br from-[#2880CA] to-[#1e5f8a] rounded-xl flex items-center justify-center ${logoPath ? 'hidden' : ''}`}>
            <span className="text-white font-bold text-lg md:text-xl">{name.charAt(0)}</span>
          </div>
        </div>
        <div className="w-2 h-2 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] rounded-full group-hover:scale-150 transition-transform duration-300"></div>
      </div>
      <h4 className="text-base md:text-lg font-bold text-gray-800 mb-2 group-hover:text-[#2880CA] transition-colors line-clamp-2">{name}</h4>
      <p className="text-gray-600 mb-4 text-xs md:text-sm line-clamp-2">{sector}</p>
      <a 
        href={website} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center text-[#2880CA] hover:text-[#1e5f8a] font-medium text-xs md:text-sm transition-all duration-300 group-hover:translate-x-1"
      >
        Visiter le site
        <svg className="w-3 h-3 md:w-4 md:h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  </motion.div>
);

// Enhanced Sponsor Card with Logo
const SponsorCard = ({ name, category, logoPath, index }: { name: string; category: string; logoPath?: string; index: number }) => {
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case 'Officiel': return {
        gradient: 'from-yellow-400 via-yellow-500 to-yellow-600',
        shadow: 'shadow-yellow-500/25',
        text: 'text-yellow-800'
      };
      case 'Gold': return {
        gradient: 'from-yellow-300 via-yellow-400 to-yellow-500',
        shadow: 'shadow-yellow-400/25',
        text: 'text-yellow-700'
      };
      case 'Silver': return {
        gradient: 'from-gray-300 via-gray-400 to-gray-500',
        shadow: 'shadow-gray-400/25',
        text: 'text-gray-700'
      };
      case 'Bronze': return {
        gradient: 'from-amber-500 via-amber-600 to-amber-700',
        shadow: 'shadow-amber-500/25',
        text: 'text-amber-800'
      };
      default: return {
        gradient: 'from-gray-400 via-gray-500 to-gray-600',
        shadow: 'shadow-gray-400/25',
        text: 'text-gray-700'
      };
    }
  };

  const style = getCategoryStyle(category);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      className="group relative"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 group-hover:border-white/40">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl flex items-center justify-center shadow-md overflow-hidden">
            {logoPath ? (
              <img 
                src={logoPath} 
                alt={`${name} logo`}
                className="w-full h-full object-contain p-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) {
                    nextElement.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div className={`w-full h-full bg-gradient-to-br ${style.gradient} rounded-xl flex items-center justify-center shadow-lg ${logoPath ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-lg md:text-xl">{name.charAt(0)}</span>
            </div>
          </div>
          <div className={`px-2 md:px-3 py-1 bg-gradient-to-r ${style.gradient} text-white rounded-full text-xs font-bold shadow-lg`}>
            {category}
          </div>
        </div>
        <h4 className="text-base md:text-lg font-bold text-gray-800 group-hover:text-[#2880CA] transition-colors line-clamp-2">{name}</h4>
        <div className="mt-4 h-1 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
            className={`h-full bg-gradient-to-r ${style.gradient} rounded-full`}
          ></motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default function Home() {
  const companies = [
    { name: "Hiberus", sector: "Développement Logiciel", website: "https://www.hiberus.com", logoPath: "/logos/hiberus azul.jpg" },
    { name: "IRESEN", sector: "Énergies Renouvelables", website: "https://www.iresen.org", logoPath: "/logos/iresen.png" },
    { name: "VISEO MAROC", sector: "Transformation Digitale", website: "https://www.viseo.com", logoPath: "/logos/LOGO VISEO MAROC PNG.png" },
    { name: "Renault Group", sector: "Automobile", website: "https://www.renault.com", logoPath: "/logos/RG_RENAULT_GROUP-Logo.jpg" },
    { name: "Cloud Marketing Hub", sector: "Marketing Digital", website: "https://www.cloudmarketinghub.com", logoPath: "/logos/logo cloud marketing hub.png" },
    { name: "AZ TMA", sector: "Maintenance Industrielle", website: "https://www.aztma.com", logoPath: "/logos/Logo-AZ-TMA-HD-PNG-2048x735.png" },
    { name: "SEGULA Technologies", sector: "Ingénierie", website: "https://www.segula.com", logoPath: "/logos/SEGULA_Technologies_logo.png" },
    { name: "APM Terminals", sector: "Logistique Portuaire", website: "https://www.apmterminals.com", logoPath: "/logos/APM terminals.png" },
    { name: "Stellantis", sector: "Automobile", website: "https://www.stellantis.com", logoPath: "/logos/stellantis.png" },
    { name: "Babel Group", sector: "Conseil & Services", website: "https://www.babelgroup.com", logoPath: "/logos/babel.png" },
    { name: "Expleo Group", sector: "Ingénierie & Innovation", website: "https://www.expleo.com", logoPath: "/logos/png-transparent-expleo-group-hd-logo.png" },
    
    { name: "ALTEN", sector: "Ingénierie & Conseil", website: "https://www.alten.com", logoPath: "/logos/ALTEN_BLACK.png" },
    { name: "NTT Data", sector: "Services IT", website: "https://www.nttdata.com", logoPath: "/logos/GlobalLogo_NTTDATA_Color.png" },
    
    { name: "CYPE", sector: "Logiciels BTP", website: "https://www.cype.com", logoPath: "/logos/cype.png" },
    
    { name: "Serdilab", sector: "Laboratoire", website: "https://www.serdilab.com", logoPath: "/logos/serdilab.png" }
  ];

  const sponsors = [
    { name: "CIH Bank", category: "Officiel", logoPath: "/logos/LOGO CIH-black.png" },
    { name: "ALTEN", category: "Gold", logoPath: "/logos/ALTEN_BLACK.png" },
    { name: "VISEO MAROC", category: "Silver", logoPath: "/logos/LOGO VISEO MAROC PNG.png" },
    { name: "IRESEN", category: "Silver", logoPath: "/logos/iresen.png" },
    { name: "NTT Data", category: "Silver", logoPath: "/logos/GlobalLogo_NTTDATA_Color.png" },
    
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -100, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-[#2880CA]/10 to-transparent rounded-full blur-3xl"
        ></motion.div>
        <motion.div
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
            rotate: [360, 180, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-[#1e5f8a]/10 to-transparent rounded-full blur-3xl"
        ></motion.div>
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-[#2880CA]/5 to-[#1e5f8a]/5 rounded-full blur-2xl"
        ></motion.div>
      </div>

      {/* Mobile-Responsive Navigation */}
      <MobileHeader />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Enhanced Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ 
              x: [0, 50, 0],
              y: [0, -30, 0],
              rotate: [0, 90, 180, 270, 360]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-br from-[#2880CA]/15 to-transparent rounded-full blur-2xl"
          ></motion.div>
          <motion.div
            animate={{ 
              x: [0, -50, 0],
              y: [0, 30, 0],
              rotate: [360, 270, 180, 90, 0]
            }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-[#1e5f8a]/15 to-transparent rounded-full blur-2xl"
          ></motion.div>
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.4, 0.7, 0.4]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-[#2880CA]/8 to-[#1e5f8a]/8 rounded-full blur-3xl"
          ></motion.div>
        </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            className="text-center mb-16 md:mb-20"
          >
            {/* Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-[#2880CA]/10 to-[#1e5f8a]/10 rounded-full text-sm md:text-base font-medium text-[#2880CA] border border-[#2880CA]/20 backdrop-blur-sm">
                ENSA Tétouan 2025
              </span>
            </motion.div>

            {/* Main Title */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-6 md:mb-8 px-4"
            >
              <span className="bg-gradient-to-r from-[#2880CA] via-[#1e5f8a] to-[#2880CA] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient leading-tight">
                Forum des
                <br />
                Entreprises
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-600 mb-8 md:mb-12 max-w-5xl mx-auto leading-relaxed px-4 font-light"
            >
              Connectez-vous avec les <span className="font-semibold text-[#2880CA]">leaders de l'industrie</span> et découvrez les opportunités qui façonnent votre avenir professionnel
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center px-4 mb-12 md:mb-16"
            >
              <Link href="/register" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] text-white rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  Rejoindre le Forum
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#1e5f8a] to-[#2880CA] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </motion.button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-white/95 backdrop-blur-sm text-[#2880CA] border-2 border-[#2880CA] rounded-2xl md:rounded-3xl font-bold text-lg md:text-xl shadow-xl hover:shadow-2xl hover:bg-[#2880CA] hover:text-white transition-all duration-300 group"
                >
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  Se connecter
                  </span>
                </motion.button>
              </Link>
            </motion.div>

            {/* Stats or Additional Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="flex flex-wrap justify-center gap-6 md:gap-8 text-center"
            >
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl font-bold text-[#2880CA]">18+</div>
                <div className="text-sm md:text-base text-gray-600">Entreprises</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl font-bold text-[#1e5f8a]">2</div>
                <div className="text-sm md:text-base text-gray-600">Jours</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-2xl md:text-3xl font-bold text-[#2880CA]">500+</div>
                <div className="text-sm md:text-base text-gray-600">Étudiants</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Countdown Timer */}
          <div className="max-w-5xl mx-auto mb-12 md:mb-20 px-4">
            <CountdownTimer />
          </div>
        </div>
      </section>

      

      

      {/* Sponsors Section */}
      <section className="relative py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white/50 to-blue-50/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 md:mb-6 px-4">
              <span className="bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] bg-clip-text text-transparent">
                Nos Sponsors
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed px-4">
              Remercions nos partenaires qui rendent possible cet événement exceptionnel
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {sponsors.map((sponsor, index) => (
              <SponsorCard
                key={sponsor.name}
                name={sponsor.name}
                category={sponsor.category}
                logoPath={sponsor.logoPath}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="relative py-8 sm:py-12 md:py-16 lg:py-20 px-3 sm:px-4 md:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ 
              x: [0, 100, 0],
              y: [0, -50, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-20 w-48 sm:w-64 md:w-72 h-48 sm:h-64 md:h-72 bg-gradient-to-br from-[#2880CA]/20 to-transparent rounded-full blur-3xl"
          ></motion.div>
          <motion.div
            animate={{ 
              x: [0, -100, 0],
              y: [0, 50, 0],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-20 right-20 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-gradient-to-br from-[#1e5f8a]/20 to-transparent rounded-full blur-3xl"
          ></motion.div>
          </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12 md:mb-16"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-3 sm:mb-4 md:mb-6 px-2 sm:px-4">
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                Programme du Forum
              </span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-2 sm:px-4">
              Découvrez le programme détaillé de ces deux journées exceptionnelles
            </p>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
            {/* Day 1 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#2880CA]/30 to-[#1e5f8a]/30 rounded-xl sm:rounded-2xl md:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gray-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-gray-700/50 group-hover:border-[#2880CA]/50 transition-all duration-300">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 md:mb-6 flex items-center">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] rounded-md sm:rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <span className="text-white font-bold text-xs sm:text-sm">15</span>
                  </div>
                  <span className="text-sm sm:text-base md:text-lg lg:text-xl">Mercredi 15 Octobre 2025</span>
                </h3>
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {[
                    { time: "09h30", event: "Accueil des participants" },
                    { time: "09h30-11h00", event: "Cérémonie d'ouverture" },
                    { time: "11h30-13h00", event: "Inauguration et visite des stands" },
                    { time: "14h00-15h30", event: "Table ronde" },
                    { time: "15h30-18h00", event: "Passage des entretiens" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex items-start space-x-2 sm:space-x-3 md:space-x-4 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl hover:bg-gray-700/50 transition-all duration-300 group/item"
                    >
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] rounded-full group-hover/item:scale-125 transition-transform duration-300 mt-1.5 sm:mt-2 md:mt-1 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[#2880CA] font-semibold text-xs sm:text-sm md:text-base block mb-0.5 sm:mb-1">{item.time}</span>
                        <span className="text-gray-300 group-hover/item:text-white transition-colors text-xs sm:text-sm md:text-base leading-relaxed">{item.event}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Day 2 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e5f8a]/30 to-[#2880CA]/30 rounded-xl sm:rounded-2xl md:rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gray-800/90 backdrop-blur-xl rounded-xl sm:rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl border border-gray-700/50 group-hover:border-[#1e5f8a]/50 transition-all duration-300">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-3 sm:mb-4 md:mb-6 flex items-center">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-gradient-to-r from-[#1e5f8a] to-[#2880CA] rounded-md sm:rounded-lg flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                    <span className="text-white font-bold text-xs sm:text-sm">16</span>
                  </div>
                  <span className="text-sm sm:text-base md:text-lg lg:text-xl">Jeudi 16 Octobre 2025</span>
                </h3>
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {[
                    { time: "09h30", event: "Ouverture des stands" },
                    { time: "11h00-12h30", event: "Table ronde" },
                    { time: "13h30-17h00", event: "Passage des entretiens" },
                    { time: "17h00", event: "Cocktail de clôture" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex items-start space-x-2 sm:space-x-3 md:space-x-4 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl hover:bg-gray-700/50 transition-all duration-300 group/item"
                    >
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-gradient-to-r from-[#1e5f8a] to-[#2880CA] rounded-full group-hover/item:scale-125 transition-transform duration-300 mt-1.5 sm:mt-2 md:mt-1 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[#1e5f8a] font-semibold text-xs sm:text-sm md:text-base block mb-0.5 sm:mb-1">{item.time}</span>
                        <span className="text-gray-300 group-hover/item:text-white transition-colors text-xs sm:text-sm md:text-base leading-relaxed">{item.event}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Mobile-friendly additional info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="mt-8 sm:mt-12 md:mt-16 text-center"
          >
            <div className="inline-flex items-center px-3 sm:px-6 py-2 sm:py-3 bg-white/5 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/10">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 mr-2 sm:mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gray-300 text-xs sm:text-sm md:text-base">
                Programme susceptible de modifications
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Global footer is rendered by Root layout */}
    </div>
  );
}