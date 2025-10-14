'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeftIcon, ChartBarIcon, ClockIcon, CheckCircleIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentStats {
  totalQueues: number;
  activeInterviews: number;
  completedToday: number;
  totalCompleted: number;
  waitingQueues: number;
  totalCompanies: number;
  averageDuration: number;
}

interface Activity {
  id: string;
  companyName: string;
  room: string;
  status: string;
  opportunityType: string;
  queuePosition: number;
  joinedAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Fetch student statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['student-stats'],
    queryFn: async (): Promise<StudentStats> => {
      const response = await fetch('/api/student/stats');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }
      const data = await response.json();
      return data.stats;
    },
    enabled: !!session && session.user.role === 'student',
  });

  // Fetch recent activity
  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ['student-activity'],
    queryFn: async (): Promise<Activity[]> => {
      const response = await fetch('/api/student/activity');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'activité');
      }
      const data = await response.json();
      return data.activities;
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
      router.push('/login?callbackUrl=/dashboard/student');
      return;
    }

    if (session.user.role !== 'student') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'waiting': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'in_progress': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getOpportunityTypeLabel = (type: string) => {
    switch (type) {
      case 'pfa': return 'PFA';
      case 'pfe': return 'PFE';
      case 'employment': return 'Emploi';
      case 'observation': return 'Observation';
      default: return type;
    }
  };

  if (status === 'loading' || statsLoading) {
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
                      onClick={() => router.push('/')}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20"
                    >
                      <ArrowLeftIcon className="w-5 h-5 text-white" />
                    </motion.button>
                    <div className="min-w-0">
                      <h1 className="text-xl lg:text-2xl font-bold text-white truncate">
                        Tableau de Bord
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
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-20 pb-8">
        {/* Mobile App-like Welcome Section */}
        <div className="mb-4 sm:mb-8">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl sm:rounded-2xl shadow-2xl border border-white/30 p-4 sm:p-6 md:p-8">
            {/* Welcome Header */}
            <div className="text-center mb-4 sm:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-[#2880CA] to-[#1e5f8a] rounded-2xl sm:rounded-3xl mb-3 sm:mb-4 shadow-lg">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                Bienvenue sur votre espace
              </h2>
              <p className="text-slate-600 text-sm sm:text-base md:text-lg">
                Gérez vos candidatures et suivez vos files d'attente en temps réel
              </p>
            </div>
            
            {/* Mobile App-style Action Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-6">
              <Link
                href="/dashboard/student/companies"
                className="group bg-gradient-to-br from-[#2880CA]/90 to-blue-600/90 hover:from-blue-600 hover:to-[#2880CA] backdrop-blur-sm text-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border border-white/20"
              >
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-xs sm:text-sm md:text-lg leading-tight">Entreprises</h3>
                    <p className="text-blue-100 text-[10px] sm:text-xs hidden sm:block">Découvrir</p>
                  </div>
                </div>
              </Link>
              
              <Link
                href="/dashboard/student/queues"
                className="group bg-gradient-to-br from-emerald-500/90 to-green-600/90 hover:from-green-600 hover:to-emerald-500 backdrop-blur-sm text-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border border-white/20"
              >
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl">
                    <QueueListIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-xs sm:text-sm md:text-lg leading-tight">Mes Files</h3>
                    <p className="text-green-100 text-[10px] sm:text-xs hidden sm:block">Suivre</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard/student/history"
                className="group bg-gradient-to-br from-purple-500/90 to-violet-600/90 hover:from-violet-600 hover:to-purple-500 backdrop-blur-sm text-white p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl border border-white/20"
              >
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  <div className="p-2 sm:p-3 bg-white/20 rounded-lg sm:rounded-xl">
                    <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-xs sm:text-sm md:text-lg leading-tight">Historique</h3>
                    <p className="text-purple-100 text-[10px] sm:text-xs hidden sm:block">Voir</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile App-style Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
            <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/30 p-3 sm:p-4 md:p-5 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-[#2880CA]/10 to-blue-600/10 rounded-lg">
                  <QueueListIcon className="w-4 h-4 sm:w-5 sm:h-5 text-[#2880CA]" />
                </div>
                <div>
                  <p className="text-slate-600 text-[10px] sm:text-xs font-medium">Files Actives</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-[#2880CA] leading-none">{stats.totalQueues}</p>
                  <p className="text-slate-500 text-[8px] sm:text-[10px] mt-0.5 hidden sm:block">En attente</p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/30 p-3 sm:p-4 md:p-5 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-emerald-500/10 to-green-600/10 rounded-lg">
                  <ClockIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-slate-600 text-[10px] sm:text-xs font-medium">En Cours</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-emerald-600 leading-none">{stats.activeInterviews}</p>
                  <p className="text-slate-500 text-[8px] sm:text-[10px] mt-0.5 hidden sm:block">Entretiens</p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/30 p-3 sm:p-4 md:p-5 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-lg">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-slate-600 text-[10px] sm:text-xs font-medium">En Attente</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 leading-none">{stats.waitingQueues}</p>
                  <p className="text-slate-500 text-[8px] sm:text-[10px] mt-0.5 hidden sm:block">Files</p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/30 p-3 sm:p-4 md:p-5 hover:shadow-xl transition-all duration-300">
              <div className="flex flex-col items-center text-center space-y-1.5 sm:space-y-2">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-purple-500/10 to-violet-600/10 rounded-lg">
                  <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-slate-600 text-[10px] sm:text-xs font-medium">Terminés</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 leading-none">{stats.totalCompleted}</p>
                  <p className="text-slate-500 text-[8px] sm:text-[10px] mt-0.5 hidden sm:block">Total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile App-style Recent Activity */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-2xl shadow-xl border border-white/30 p-4 sm:p-6 md:p-8">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Activité Récente</h2>
            <Link
              href="/dashboard/student/queues"
              className="text-[#2880CA] hover:text-blue-600 font-medium text-sm sm:text-base transition-colors"
            >
              Voir tout →
            </Link>
          </div>

          {activityLoading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-4 border-blue-200 border-t-[#2880CA] mx-auto"></div>
              <p className="mt-3 sm:mt-4 text-slate-600 font-medium text-sm sm:text-base">Chargement...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-6 sm:py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <ChartBarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-[#2880CA]" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900 mb-2">Aucune activité récente</h3>
              <p className="text-slate-600 text-sm sm:text-base mb-4 sm:mb-6 px-4">Vous n'avez pas encore rejoint de files d'attente.</p>
              <Link
                href="/dashboard/student/companies"
                className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2880CA] hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Parcourir les entreprises
              </Link>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="bg-white/60 backdrop-blur-sm rounded-xl sm:rounded-xl border border-white/40 hover:bg-white/80 transition-all duration-300 p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    {/* Left Section - Company Info */}
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#2880CA] to-blue-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center font-bold shadow-lg text-xs sm:text-sm flex-shrink-0">
                        #{activity.queuePosition || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm sm:text-base truncate">{activity.companyName}</h4>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">
                          Salle {activity.room} • {getOpportunityTypeLabel(activity.opportunityType)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Right Section - Status & Time */}
                    <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-2">
                      <span className={`px-2 py-1 text-[10px] sm:text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                        {getStatusLabel(activity.status)}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-500 text-right">
                        {new Date(activity.updatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </main>
    </div>
  );
}