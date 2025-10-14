'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import RoomIndicator from '@/components/RoomIndicator';
import RoomStatusIndicator from '@/components/RoomStatusIndicator';
import { ArrowLeftIcon, BuildingOfficeIcon, ClockIcon, GlobeAltIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface Company {
  _id: string;
  name: string;
  sector: string;
  website: string;
  room: string;
  estimatedInterviewDuration: number;
  imageId?: string;
  imageUrl?: string;
  queueLength?: number;
  studentInQueue?: {
    position: number;
    status: string;
  } | null;
}

export default function StudentCompaniesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedOpportunityType, setSelectedOpportunityType] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  // Smart scroll behavior for header
  useEffect(() => {
    const controlHeader = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px
        setIsHeaderVisible(false);
      } else {
        // Scrolling up
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', controlHeader);
    return () => window.removeEventListener('scroll', controlHeader);
  }, [lastScrollY]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/student/companies');
      return;
    }

    if (session.user.role !== 'student') {
      router.push('/');
      return;
    }

    fetchCompanies();
  }, [session, status, router]);

  const openJoinModal = (company: Company) => {
    setSelectedCompany(company);
    setSelectedOpportunityType(session?.user.opportunityType || 'pfa');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
    setSelectedOpportunityType('');
  };

  const handleJoinQueue = async () => {
    if (!selectedCompany) return;

    setIsJoining(true);
    setMessage(null);

    try {
      const response = await fetch('/api/student/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedCompany._id,
          opportunityType: selectedOpportunityType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `${data.message} Position: ${data.position}` 
        });
        closeModal();
        fetchCompanies(); // Refresh the companies list
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la connexion à la file' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsJoining(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
      } else {
        setMessage({ type: 'error', text: 'Erreur lors du chargement des entreprises' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-[#2880CA] mx-auto"></div>
          <p className="mt-4 text-slate-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'student') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Beautiful Modern Header with Smart Scroll */}
      <AnimatePresence>
        {isHeaderVisible && (
          <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <div className="bg-gradient-to-r from-gray-600/90 via-gray-700/90 to-gray-800/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-4">
                  {/* Left Section - Back Button & Title */}
                  <div className="flex items-center space-x-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push('/dashboard/student')}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20"
                    >
                      <ArrowLeftIcon className="w-5 h-5 text-white" />
                    </motion.button>
                    <div className="min-w-0">
                      <h1 className="text-xl lg:text-2xl font-bold text-white truncate">
                        Entreprises
                      </h1>
                      <p className="text-gray-200 text-sm truncate">
                        Bonjour, {session.user.firstName} {session.user.name}
                      </p>
                    </div>
                  </div>

                  {/* Right Section - Logout Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center space-x-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 backdrop-blur-sm border border-white/20 text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="hidden sm:inline">Se déconnecter</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Mobile App-style Header with Dark Glass */}
        <div className="mb-4 sm:mb-6 pt-6 sm:pt-8">
          <div className="bg-gradient-to-br from-gray-800/90 via-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl sm:rounded-2xl shadow-2xl border border-white/10 p-3 sm:p-4">
            <div className="text-center mb-3">
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#2880CA] to-blue-600 rounded-2xl mb-2 shadow-lg">
                <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1">
                Découvrez les Entreprises
              </h2>
              <p className="text-gray-300 text-xs sm:text-sm md:text-base">
                Explorez les entreprises participantes au forum
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => router.push('/dashboard/student/queues')}
                className="flex-1 bg-gradient-to-r from-[#2880CA]/90 to-blue-600/90 hover:from-blue-600 hover:to-[#2880CA] backdrop-blur-sm text-white px-3 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center text-xs sm:text-sm border border-white/20"
              >
                <QueueListIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Mes Files
              </button>
              <button
                onClick={() => router.push('/dashboard/student/history')}
                className="flex-1 bg-gradient-to-r from-slate-600/90 to-slate-700/90 hover:from-slate-700 hover:to-slate-800 backdrop-blur-sm text-white px-3 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center text-xs sm:text-sm border border-white/20"
              >
                <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                Historique
              </button>
            </div>
          </div>
        </div>

        {/* Mobile App-style Companies Grid */}
        {isLoading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-4 border-blue-200 border-t-[#2880CA] mx-auto"></div>
            <p className="mt-3 sm:mt-4 text-slate-600 font-medium text-sm sm:text-base">Chargement...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6 sm:p-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <BuildingOfficeIcon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Aucune entreprise disponible</h3>
            <p className="text-slate-600 text-sm sm:text-base">Les entreprises seront bientôt ajoutées par l'administration.</p>
          </div>
        ) : (
          <>
            {/* Companies in Queue Section */}
            {companies.filter(company => company.studentInQueue).length > 0 && (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Mes Files d'Attente</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-emerald-500/30 to-transparent"></div>
                </div>
                <div className="space-y-3 sm:space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 lg:gap-6 md:space-y-0">
                  {companies
                    .filter(company => company.studentInQueue)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((company) => (
                      <div
                        key={company._id}
                        className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-emerald-400/60 hover:border-emerald-400/80 bg-gradient-to-br from-emerald-50/30 to-white/95 p-3 sm:p-4 md:p-6 hover:shadow-xl transition-all duration-300 group"
                      >
                        {/* Enhanced Mobile App-style Layout */}
                        <div className="flex items-center space-x-3 mb-4">
                          {/* Enhanced Company Image with Queue Indicator */}
                          <div className="flex-shrink-0 relative">
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full shadow-lg z-10"></div>
                            {company.imageUrl ? (
                              <img
                                src={company.imageUrl}
                                alt={`${company.name} logo`}
                                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover border-2 border-emerald-300/80 group-hover:border-emerald-400/80 shadow-sm transition-all duration-300"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.nextElementSibling as HTMLElement;
                                  if (fallback) {
                                    fallback.style.display = 'flex';
                                  }
                                }}
                                loading="lazy"
                              />
                            ) : null}
                            <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-slate-200/80 shadow-sm ${company.imageUrl ? 'hidden' : ''}`}>
                              <BuildingOfficeIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-slate-500" />
                            </div>
                          </div>
                          
                          {/* Enhanced Company Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate group-hover:text-emerald-600 transition-colors duration-300">{company.name}</h3>
                            <div className="flex items-center mt-2 space-x-2">
                              <span className="bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm">
                                Position {company.studentInQueue?.position}
                              </span>
                              <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm">
                                {company.sector}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Info Row */}
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-600 bg-gradient-to-r from-emerald-50/90 to-slate-50/90 px-3 py-2.5 rounded-lg mb-3 border border-emerald-200/50">
                          <div className="flex items-center space-x-1.5">
                            <div className="p-1 bg-emerald-200/80 rounded-md">
                              <ClockIcon className="w-3 h-3 text-emerald-700" />
                            </div>
                            <span className="font-medium">{company.estimatedInterviewDuration}min</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <div className="p-1 bg-slate-200/80 rounded-md">
                              <QueueListIcon className="w-3 h-3 text-slate-600" />
                            </div>
                            <span className="font-medium">{company.queueLength || 0} en attente</span>
                          </div>
                        </div>

                        {/* Enhanced Website Link */}
                        {company.website && (
                          <div className="mb-4">
                            <a
                              href={company.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-xs sm:text-sm text-emerald-700 hover:text-emerald-800 transition-all duration-300 bg-gradient-to-r from-emerald-50/90 to-emerald-100/90 hover:from-emerald-100 hover:to-emerald-200 px-3 py-2 rounded-lg border border-emerald-200/50 hover:border-emerald-300/80 group"
                            >
                              <div className="p-1 bg-emerald-200/80 rounded-md mr-2 group-hover:bg-emerald-300/80 transition-colors duration-300">
                                <GlobeAltIcon className="w-3 h-3 text-emerald-700" />
                              </div>
                              <span className="truncate font-medium">Site web</span>
                            </a>
                          </div>
                        )}

                        {/* Mobile App-style Action Button */}
                        <div className="pt-2 border-t border-emerald-200/50">
                          <div className="text-center">
                            <div className="bg-emerald-100/80 text-emerald-800 px-3 py-2 rounded-lg font-semibold text-xs sm:text-sm border border-emerald-200/50">
                              Dans la file - Position {company.studentInQueue?.position}
                            </div>
                            <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                              Vous êtes déjà dans cette file d'attente
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* All Other Companies Section */}
            {companies.filter(company => !company.studentInQueue).length > 0 && (
              <div className={companies.filter(company => company.studentInQueue).length > 0 ? "mt-8" : ""}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center">
                    <BuildingOfficeIcon className="w-3 h-3 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Toutes les Entreprises</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-400/30 to-transparent"></div>
                </div>
                <div className="space-y-3 sm:space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 lg:gap-6 md:space-y-0">
                  {companies
                    .filter(company => !company.studentInQueue)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((company) => (
                      <div
                        key={company._id}
                        className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 hover:border-white/60 p-3 sm:p-4 md:p-6 hover:shadow-xl transition-all duration-300 group"
                      >
                {/* Enhanced Mobile App-style Layout */}
                <div className="flex items-center space-x-3 mb-4">
                  {/* Enhanced Company Image with Queue Indicator */}
                  <div className="flex-shrink-0 relative">
                    {company.studentInQueue && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg z-10">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                    {company.imageUrl ? (
                      <img
                        src={company.imageUrl}
                        alt={`${company.name} logo`}
                        className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl object-cover border-2 shadow-sm transition-all duration-300 ${
                          company.studentInQueue 
                            ? 'border-emerald-300/80 group-hover:border-emerald-400/80' 
                            : 'border-slate-200/80 group-hover:border-blue-300/80'
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                          }
                        }}
                        loading="lazy"
                      />
                    ) : null}
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center border-2 border-slate-200/80 shadow-sm ${company.imageUrl ? 'hidden' : ''}`}>
                      <BuildingOfficeIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-slate-500" />
                    </div>
                  </div>
                  
                  {/* Enhanced Company Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate group-hover:text-[#2880CA] transition-colors duration-300">{company.name}</h3>
                    <div className="flex items-center mt-2 space-x-2">
                      <span className="bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm">
                        {company.sector}
                      </span>
                      <RoomIndicator room={company.room} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Enhanced Info Row */}
                <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-600 bg-gradient-to-r from-slate-50/90 to-slate-100/90 px-3 py-2.5 rounded-lg mb-3 border border-slate-200/50">
                  <div className="flex items-center space-x-1.5">
                    <div className="p-1 bg-slate-200/80 rounded-md">
                      <ClockIcon className="w-3 h-3 text-slate-600" />
                    </div>
                    <span className="font-medium">{company.estimatedInterviewDuration}min</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="p-1 bg-slate-200/80 rounded-md">
                      <QueueListIcon className="w-3 h-3 text-slate-600" />
                    </div>
                    <span className="font-medium">{company.queueLength || 0} en attente</span>
                  </div>
                </div>

                {/* Enhanced Website Link */}
                {company.website && (
                  <div className="mb-4">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-xs sm:text-sm text-[#2880CA] hover:text-blue-600 transition-all duration-300 bg-gradient-to-r from-blue-50/90 to-blue-100/90 hover:from-blue-100 hover:to-blue-200 px-3 py-2 rounded-lg border border-blue-200/50 hover:border-blue-300/80 group"
                    >
                      <div className="p-1 bg-blue-200/80 rounded-md mr-2 group-hover:bg-blue-300/80 transition-colors duration-300">
                        <GlobeAltIcon className="w-3 h-3 text-blue-700" />
                      </div>
                      <span className="truncate font-medium">Site web</span>
                    </a>
                  </div>
                )}

                {/* Mobile App-style Action Button */}
                <div className="pt-2 border-t border-slate-200/50">
                  {company.studentInQueue ? (
                    <div className="text-center">
                      <div className="bg-emerald-100/80 text-emerald-800 px-3 py-2 rounded-lg font-semibold text-xs sm:text-sm border border-emerald-200/50">
                        Dans la file - Position {company.studentInQueue.position}
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                        Vous êtes déjà dans cette file d'attente
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => openJoinModal(company)}
                      className="w-full bg-gradient-to-r from-[#2880CA]/90 to-blue-600/90 hover:from-blue-600 hover:to-[#2880CA] backdrop-blur-sm text-white font-semibold py-2.5 px-3 rounded-lg transition-all duration-300 text-xs sm:text-sm shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      Rejoindre la File
                    </button>
                  )}
                </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Mobile App-style Room Status Section */}
        {companies.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-2xl shadow-xl border border-white/30 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Statut des Salles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {companies.map((company) => (
                  <RoomStatusIndicator 
                    key={company._id}
                    roomId={company._id}
                    compact={true}
                    refreshInterval={15000}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile App-style Stats Section */}
        {companies.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-2xl shadow-xl border border-white/30 p-4 sm:p-6 md:p-8">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">Statistiques</h3>
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-[#2880CA] mb-1 md:mb-2">{companies.length}</div>
                <div className="text-xs md:text-base text-slate-600 font-medium">Entreprises</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-[#2880CA] mb-1 md:mb-2">
                  {Math.round(companies.reduce((acc, company) => acc + company.estimatedInterviewDuration, 0) / companies.length)}
                </div>
                <div className="text-xs md:text-base text-slate-600 font-medium">Durée moy.</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-[#2880CA] mb-1 md:mb-2">
                  {new Set(companies.map(c => c.sector)).size}
                </div>
                <div className="text-xs md:text-base text-slate-600 font-medium">Secteurs</div>
              </div>
            </div>
            </div>
          </div>
        )}
      </main>

      {/* Join Queue Modal */}
      {isModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full border border-white/20">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Rejoindre la file d'attente
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-slate-600 mb-2">
                  Entreprise: <strong className="text-slate-900">{selectedCompany.name}</strong>
                </p>
                <p className="text-slate-600 mb-4">
                  Salle: <strong className="text-slate-900">{selectedCompany.room}</strong>
                </p>
              </div>

              <div className="mb-8">
                <label htmlFor="opportunityType" className="block text-sm font-semibold text-slate-700 mb-3">
                  Type d'opportunité
                </label>
                <select
                  id="opportunityType"
                  value={selectedOpportunityType}
                  onChange={(e) => setSelectedOpportunityType(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2880CA] focus:border-transparent transition-all text-slate-900 bg-white"
                >
                  <option value="pfa" className="text-slate-900">PFA (Projet de Fin d'Année)</option>
                  <option value="pfe" className="text-slate-900">PFE (Projet de Fin d'Études)</option>
                  <option value="employment" className="text-slate-900">Emploi</option>
                  <option value="observation" className="text-slate-900">Stage d'observation</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleJoinQueue}
                  disabled={isJoining}
                  className="px-6 py-3 bg-gradient-to-r from-[#2880CA] to-blue-600 hover:from-blue-600 hover:to-[#2880CA] text-white rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium shadow-lg"
                >
                  {isJoining ? 'Connexion...' : 'Rejoindre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
