'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import RoomIndicator from '@/components/RoomIndicator';
import { ArrowLeftIcon, ClockIcon, CheckCircleIcon, XCircleIcon, BuildingOfficeIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface InterviewHistory {
  _id: string;
  companyName: string;
  companySector: string;
  companyWebsite: string;
  room: string;
  opportunityType: string;
  status: string;
  joinedAt: string;
  startedAt?: string;
  completedAt?: string;
  passedAt?: string;
  finalPosition: number;
  priorityScore: number;
  duration?: number;
}

interface HistoryStats {
  total: number;
  completed: number;
  cancelled: number;
  passed: number;
}

export default function StudentHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled' | 'passed'>('all');

  // React Query for interview history
  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['student-history'],
    queryFn: async () => {
      const response = await fetch('/api/student/history');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!session && session.user.role === 'student',
  });

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
      router.push('/login?callbackUrl=/dashboard/student/history');
      return;
    }

    if (session.user.role !== 'student') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  const getOpportunityTypeLabel = (type: string) => {
    switch (type) {
      case 'pfa': return 'PFA (Projet de Fin d\'Année)';
      case 'pfe': return 'PFE (Projet de Fin d\'Études)';
      case 'employment': return 'Emploi';
      case 'observation': return 'Stage d\'observation';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      case 'passed': return 'Passé';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'passed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const filteredHistory = historyData?.history?.filter((interview: InterviewHistory) => {
    if (filter === 'all') return true;
    return interview.status === filter;
  }) || [];

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
                        Historique
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
        {/* Stats Cards */}
        {historyData && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6">
            <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 p-3 sm:p-4 md:p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium">Total</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-[#2880CA] mt-1">{historyData.total}</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl">
                  <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#2880CA]" />
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 p-3 sm:p-4 md:p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium">Terminés</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-600 mt-1">{historyData.completed}</p>
                </div>
                <div className="p-2 sm:p-3 bg-emerald-100 rounded-lg sm:rounded-xl">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 p-3 sm:p-4 md:p-6 hover:shadow-xl transition-all duration-300 col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium">Annulés</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600 mt-1">{historyData.cancelled}</p>
                </div>
                <div className="p-2 sm:p-3 bg-red-100 rounded-lg sm:rounded-xl">
                  <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-xl sm:rounded-2xl w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-md sm:shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="hidden sm:inline">Tous ({historyData?.total || 0})</span>
              <span className="sm:hidden">Tous</span>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                filter === 'completed'
                  ? 'bg-white text-slate-900 shadow-md sm:shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="hidden sm:inline">Terminés ({historyData?.completed || 0})</span>
              <span className="sm:hidden">Terminés</span>
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                filter === 'cancelled'
                  ? 'bg-white text-slate-900 shadow-md sm:shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="hidden sm:inline">Annulés ({historyData?.cancelled || 0})</span>
              <span className="sm:hidden">Annulés</span>
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                filter === 'passed'
                  ? 'bg-white text-slate-900 shadow-md sm:shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <span className="hidden sm:inline">Passés ({historyData?.passed || 0})</span>
              <span className="sm:hidden">Passés</span>
            </button>
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-[#2880CA] mx-auto"></div>
            <p className="mt-4 text-slate-600 font-medium">Chargement de l'historique...</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ClockIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun historique</h3>
            <p className="text-slate-600 mb-6">
              {filter === 'all' 
                ? "Vous n'avez pas encore d'entretiens dans votre historique."
                : `Aucun entretien ${filter === 'completed' ? 'terminé' : filter === 'cancelled' ? 'annulé' : 'passé'} trouvé.`
              }
            </p>
            <button
              onClick={() => router.push('/dashboard/student/companies')}
              className="bg-gradient-to-r from-[#2880CA] to-blue-600 hover:from-blue-600 hover:to-[#2880CA] text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Découvrir les entreprises
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((interview: InterviewHistory) => (
              <div key={interview._id} className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 p-3 sm:p-4 md:p-6 hover:shadow-xl transition-all duration-300 group">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 truncate">{interview.companyName}</h3>
                      <RoomIndicator room={interview.room} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                      <span className="flex items-center bg-slate-100 px-2 py-1 rounded-lg">
                        <BuildingOfficeIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">{interview.companySector}</span>
                        <span className="sm:hidden truncate max-w-20">{interview.companySector}</span>
                      </span>
                      <span className="flex items-center bg-slate-100 px-2 py-1 rounded-lg">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span className="hidden sm:inline">{getOpportunityTypeLabel(interview.opportunityType)}</span>
                        <span className="sm:hidden">{interview.opportunityType.toUpperCase()}</span>
                      </span>
                      {interview.companyWebsite && (
                        <a
                          href={interview.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-[#2880CA] hover:text-blue-600 transition-colors bg-slate-100 px-2 py-1 rounded-lg"
                        >
                          <GlobeAltIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Site web</span>
                          <span className="sm:hidden">Web</span>
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(interview.status)}`}>
                      {getStatusLabel(interview.status)}
                    </span>
                  </div>
                </div>

                {/* Interview Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-slate-200/50">
                      <p className="text-slate-600">
                        <strong className="text-slate-900">Rejoint le:</strong> 
                        <span className="block sm:inline sm:ml-1">
                          {new Date(interview.joinedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </p>
                    </div>
                    {interview.startedAt && (
                      <div className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-slate-200/50">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Commencé le:</strong> 
                          <span className="block sm:inline sm:ml-1">
                            {new Date(interview.startedAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      </div>
                    )}
                    {interview.completedAt && (
                      <div className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-slate-200/50">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Terminé le:</strong> 
                          <span className="block sm:inline sm:ml-1">
                            {new Date(interview.completedAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      </div>
                    )}
                    {interview.passedAt && (
                      <div className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-slate-200/50">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Passé le:</strong> 
                          <span className="block sm:inline sm:ml-1">
                            {new Date(interview.passedAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-slate-200/50">
                      <p className="text-slate-600">
                        <strong className="text-slate-900">Position finale:</strong> 
                        <span className="block sm:inline sm:ml-1">#{interview.finalPosition}</span>
                      </p>
                    </div>
                    {interview.duration && (
                      <div className="bg-gradient-to-r from-slate-50/90 to-slate-100/90 px-3 py-2 sm:px-4 sm:py-3 rounded-lg border border-slate-200/50">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Durée:</strong> 
                          <span className="block sm:inline sm:ml-1">{formatDuration(interview.duration)}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
