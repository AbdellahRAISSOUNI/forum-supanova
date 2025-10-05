'use client';

import Link from "next/link";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

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
      
      <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-center mb-8"
        >
          <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] bg-clip-text text-transparent mb-4">
            Forum des Entreprises ENSA Tétouan
          </h3>
          <p className="text-lg text-gray-600 mb-2">15-16 Octobre 2025</p>
          <p className="text-sm text-gray-500">Cérémonie d'ouverture à 09h30</p>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {timeUnits.map((unit, index) => (
            <motion.div
              key={unit.label}
              initial={{ opacity: 0, scale: 0.5, rotateY: -90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
              whileHover={{ scale: 1.05, rotateY: 5 }}
              className="relative group"
            >
              <div className="bg-gradient-to-br from-[#2880CA] to-[#1e5f8a] rounded-2xl p-4 md:p-6 text-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                <div className="text-2xl md:text-4xl font-bold text-white mb-2">
                  {unit.value.toString().padStart(2, '0')}
                </div>
                <div className="text-blue-100 text-xs md:text-sm font-medium">
                  {unit.label}
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Company Card
const CompanyCard = ({ name, sector, website, index }: { name: string; sector: string; website: string; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30, rotateX: -15 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ delay: index * 0.1, duration: 0.6 }}
    whileHover={{ y: -10, scale: 1.02, rotateX: 5 }}
    className="group relative"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-[#2880CA]/5 to-[#1e5f8a]/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
    <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 group-hover:border-[#2880CA]/30">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-[#2880CA] to-[#1e5f8a] rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">{name.charAt(0)}</span>
        </div>
        <div className="w-2 h-2 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] rounded-full group-hover:scale-150 transition-transform duration-300"></div>
      </div>
      <h4 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-[#2880CA] transition-colors">{name}</h4>
      <p className="text-gray-600 mb-4 text-sm">{sector}</p>
      <a 
        href={website} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center text-[#2880CA] hover:text-[#1e5f8a] font-medium text-sm transition-all duration-300 group-hover:translate-x-1"
      >
        Visiter le site
        <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  </motion.div>
);

// Enhanced Sponsor Card
const SponsorCard = ({ name, category, index }: { name: string; category: string; index: number }) => {
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
      <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 group-hover:border-white/40">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 bg-gradient-to-br ${style.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
            <span className="text-white font-bold text-lg">{name.charAt(0)}</span>
          </div>
          <div className={`px-3 py-1 bg-gradient-to-r ${style.gradient} text-white rounded-full text-xs font-bold shadow-lg`}>
            {category}
          </div>
        </div>
        <h4 className="text-lg font-bold text-gray-800 group-hover:text-[#2880CA] transition-colors">{name}</h4>
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
    { name: "Capgemini", sector: "Services IT & Consulting", website: "https://www.capgemini.com" },
    { name: "Hiberus", sector: "Développement Logiciel", website: "https://www.hiberus.com" },
    { name: "APT", sector: "Technologies Avancées", website: "https://www.apt.com" },
    { name: "MK4", sector: "Solutions Digitales", website: "https://www.mk4.com" },
    { name: "XAI", sector: "Intelligence Artificielle", website: "https://www.xai.com" },
    { name: "IRESEN", sector: "Énergies Renouvelables", website: "https://www.iresen.org" },
    { name: "VISEO", sector: "Transformation Digitale", website: "https://www.viseo.com" },
    { name: "Renault", sector: "Automobile", website: "https://www.renault.com" },
    { name: "Cloud Marketing Hub", sector: "Marketing Digital", website: "https://www.cloudmarketinghub.com" },
    { name: "AZ TMA", sector: "Maintenance Industrielle", website: "https://www.aztma.com" },
    { name: "Segula Technologies", sector: "Ingénierie", website: "https://www.segula.com" },
    { name: "APM Terminals", sector: "Logistique Portuaire", website: "https://www.apmterminals.com" },
    { name: "Stellantis", sector: "Automobile", website: "https://www.stellantis.com" },
    { name: "Babel Group", sector: "Conseil & Services", website: "https://www.babelgroup.com" },
    { name: "Expleo", sector: "Ingénierie & Innovation", website: "https://www.expleo.com" },
    { name: "Anapec", sector: "Emploi & Formation", website: "https://www.anapec.org" },
    { name: "Alten", sector: "Ingénierie & Conseil", website: "https://www.alten.com" },
    { name: "NTT Data", sector: "Services IT", website: "https://www.nttdata.com" }
  ];

  const sponsors = [
    { name: "CIH Bank", category: "Officiel" },
    { name: "Alten", category: "Gold" },
    { name: "Viseo", category: "Silver" },
    { name: "Iresen", category: "Silver" },
    { name: "NTT Data", category: "Silver" },
    { name: "ISIC", category: "Silver" },
    { name: "Linx", category: "Silver" }
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

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-50 bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-4"
            >
              <motion.div 
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
                className="w-12 h-12 bg-gradient-to-br from-[#2880CA] to-[#1e5f8a] rounded-xl flex items-center justify-center shadow-lg"
              >
                <span className="text-white font-bold text-xl">FE</span>
              </motion.div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Forum des Entreprises</h1>
                <p className="text-sm text-gray-600">ENSA Tétouan</p>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex space-x-4"
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
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-6xl md:text-8xl font-bold mb-6"
            >
              <span className="bg-gradient-to-r from-[#2880CA] via-[#1e5f8a] to-[#2880CA] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Forum des Entreprises
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed"
            >
              Connectez-vous avec les leaders de l'industrie et découvrez les opportunités qui façonnent votre avenir professionnel
            </motion.p>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link href="/register">
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] text-white rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300"
                >
                  Rejoindre le Forum
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white/90 text-[#2880CA] border-2 border-[#2880CA] rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl hover:bg-[#2880CA] hover:text-white transition-all duration-300"
                >
                  Se connecter
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Countdown Timer */}
          <div className="max-w-5xl mx-auto mb-20">
            <CountdownTimer />
          </div>
        </div>
      </section>

      {/* Companies Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
              <span className="bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] bg-clip-text text-transparent">
                Entreprises Participantes
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Découvrez les entreprises leaders qui participent au forum et explorez les opportunités qu'elles offrent
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {companies.map((company, index) => (
              <CompanyCard
                key={company.name}
                name={company.name}
                sector={company.sector}
                website={company.website}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-white/50 to-blue-50/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
              <span className="bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] bg-clip-text text-transparent">
                Nos Sponsors
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Remercions nos partenaires qui rendent possible cet événement exceptionnel
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {sponsors.map((sponsor, index) => (
              <SponsorCard
                key={sponsor.name}
                name={sponsor.name}
                category={sponsor.category}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ 
              x: [0, 100, 0],
              y: [0, -50, 0],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-br from-[#2880CA]/20 to-transparent rounded-full blur-3xl"
          ></motion.div>
          <motion.div
            animate={{ 
              x: [0, -100, 0],
              y: [0, 50, 0],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-[#1e5f8a]/20 to-transparent rounded-full blur-3xl"
          ></motion.div>
          </div>

        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                Programme du Forum
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Découvrez le programme détaillé de ces deux journées exceptionnelles
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Day 1 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#2880CA]/30 to-[#1e5f8a]/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-700/50 group-hover:border-[#2880CA]/50 transition-all duration-300">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">15</span>
                  </div>
                  Mercredi 15 Octobre 2025
                </h3>
                <div className="space-y-4">
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
                      className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-700/50 transition-all duration-300 group/item"
                    >
                      <div className="w-3 h-3 bg-gradient-to-r from-[#2880CA] to-[#1e5f8a] rounded-full group-hover/item:scale-125 transition-transform duration-300"></div>
                      <span className="text-[#2880CA] font-semibold min-w-[100px]">{item.time}</span>
                      <span className="text-gray-300 group-hover/item:text-white transition-colors">{item.event}</span>
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
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e5f8a]/30 to-[#2880CA]/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
              <div className="relative bg-gray-800/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-700/50 group-hover:border-[#1e5f8a]/50 transition-all duration-300">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-[#1e5f8a] to-[#2880CA] rounded-lg flex items-center justify-center mr-3">
                    <span className="text-white font-bold text-sm">16</span>
                  </div>
                  Jeudi 16 Octobre 2025
                </h3>
                <div className="space-y-4">
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
                      className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-700/50 transition-all duration-300 group/item"
                    >
                      <div className="w-3 h-3 bg-gradient-to-r from-[#1e5f8a] to-[#2880CA] rounded-full group-hover/item:scale-125 transition-transform duration-300"></div>
                      <span className="text-[#1e5f8a] font-semibold min-w-[100px]">{item.time}</span>
                      <span className="text-gray-300 group-hover/item:text-white transition-colors">{item.event}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-20 px-4 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#2880CA]/5 to-[#1e5f8a]/5"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center space-x-4 mb-6">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="w-12 h-12 bg-gradient-to-br from-[#2880CA] to-[#1e5f8a] rounded-xl flex items-center justify-center shadow-lg"
                >
                  <span className="text-white font-bold text-lg">FE</span>
                </motion.div>
                <div>
                  <h3 className="text-xl font-bold">Forum des Entreprises</h3>
                  <p className="text-gray-400">ENSA Tétouan</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Connecter les étudiants aux opportunités professionnelles d'exception.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h4 className="text-lg font-semibold mb-6">Contact</h4>
              <div className="space-y-3 text-gray-400">
                <p className="flex items-center">
                  <span className="mr-3">📧</span>
                  contact@ade-ensat.ma
                </p>
                <p className="flex items-center">
                  <span className="mr-3">📱</span>
                  +212 XXX XXX XXX
                </p>
                <p className="flex items-center">
                  <span className="mr-3">📍</span>
                  ENSA Tétouan, Maroc
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              viewport={{ once: true }}
            >
              <h4 className="text-lg font-semibold mb-6">Liens Utiles</h4>
              <div className="space-y-3">
                <Link href="/login" className="block text-gray-400 hover:text-white transition-colors">
                  Se connecter
                </Link>
                <Link href="/register" className="block text-gray-400 hover:text-white transition-colors">
                  S'inscrire
                </Link>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Mentions légales
                </a>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            viewport={{ once: true }}
            className="border-t border-gray-800 pt-8 text-center"
          >
            <p className="text-gray-400">
              © 2025 Forum des Entreprises ENSA Tétouan. Tous droits réservés.
            </p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}