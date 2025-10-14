'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import RoomIndicator from '@/components/RoomIndicator';
import { ArrowLeftIcon, QueueListIcon, ClockIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface Queue {
  _id: string;
  companyName: string;
  room: string;
  estimatedDuration: number;
  position: number;
  opportunityType: string;
  status: string;
  joinedAt: string;
  priorityScore: number;
}

export default function StudentQueuesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [leavingQueueId, setLeavingQueueId] = useState<string | null>(null);
  const [reschedulingQueueId, setReschedulingQueueId] = useState<string | null>(null);
  const [cancellingQueueId, setCancellingQueueId] = useState<string | null>(null);
  const [previousPositions, setPreviousPositions] = useState<Record<string, number>>({});
  const [showPositionBanner, setShowPositionBanner] = useState<{ queueId: string; position: number; room: string } | null>(null);

  // React Query for real-time updates
  const { data: queues = [], isLoading, refetch } = useQuery({
    queryKey: ['student-queues'],
    queryFn: async () => {
      const response = await fetch('/api/student/queues');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des files d\'attente');
      }
      const data = await response.json();
      return data.queues;
    },
    refetchInterval: 5000, // Refetch every 5 seconds
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
      router.push('/login?callbackUrl=/dashboard/student/queues');
      return;
    }

    if (session.user.role !== 'student') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // Track position changes and show notifications
  useEffect(() => {
    if (queues.length === 0) {
      setShowPositionBanner(null);
      return;
    }

    // Check for position improvements and show notifications
    queues.forEach((queue: Queue) => {
      const previousPosition = previousPositions[queue._id];
      
      if (previousPosition && previousPosition !== queue.position) {
        if (queue.position < previousPosition) {
          toast.success(`Vous avez avancé ! Maintenant position #${queue.position}`);
        }
      }
    });

    // Update previous positions
    const newPreviousPositions: Record<string, number> = {};
    queues.forEach((queue: Queue) => {
      newPreviousPositions[queue._id] = queue.position;
    });
    setPreviousPositions(newPreviousPositions);
  }, [queues]);

  // Separate effect for position banner updates
  useEffect(() => {
    if (queues.length === 0) {
      setShowPositionBanner(null);
      return;
    }

    // Find all eligible queues (position <= 3 and waiting)
    const eligibleQueues = queues.filter((queue: Queue) =>
      queue.status === 'waiting' && queue.position <= 3
    );

    if (eligibleQueues.length === 0) {
      setShowPositionBanner(null);
      return;
    }

    // Priority system for determining which queue to show banner for:
    // 1. Position 1 queues have highest priority (but constraint prevents multiple position 1)
    // 2. Among same position, prioritize by priorityScore (lower is better)
    // 3. If tie, prioritize by join time (earlier join = higher priority)

    const sortedQueues = eligibleQueues.sort((a: Queue, b: Queue) => {
      // Position 1 has absolute priority
      if (a.position === 1 && b.position !== 1) return -1;
      if (a.position !== 1 && b.position === 1) return 1;

      // For same positions, prioritize by priority score (lower is better)
      if (a.position === b.position) {
        if (a.priorityScore !== b.priorityScore) {
          return a.priorityScore - b.priorityScore;
        }
        // If priority scores are equal, prioritize by join time (earlier = better)
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      }

      // Lower position number = higher priority
      return a.position - b.position;
    });

    // Show banner for the highest priority queue
    const bestQueue = sortedQueues[0];
    const newBanner = {
      queueId: bestQueue._id,
      position: bestQueue.position,
      room: bestQueue.room
    };

    setShowPositionBanner(newBanner);
  }, [queues]);

  const handleLeaveQueue = async (queueId: string) => {
    setLeavingQueueId(queueId);
    setMessage(null);

    try {
      const response = await fetch(`/api/student/queue/${queueId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        refetch(); // Refresh the queues list
      } else {
        toast.error(data.error || 'Erreur lors de la sortie de la file');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLeavingQueueId(null);
    }
  };

  const handleRescheduleInterview = async (queueId: string) => {
    setReschedulingQueueId(queueId);
    setMessage(null);

    try {
      const response = await fetch('/api/student/queue/reschedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewId: queueId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        refetch(); // Refresh the queues list
      } else {
        toast.error(data.error || 'Erreur lors du report de l\'entretien');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setReschedulingQueueId(null);
    }
  };

  const handleCancelInterview = async (queueId: string) => {
    setCancellingQueueId(queueId);
    setMessage(null);

    try {
      const response = await fetch('/api/student/queue/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewId: queueId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        refetch(); // Refresh the queues list
      } else {
        toast.error(data.error || 'Erreur lors de l\'annulation de l\'entretien');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setCancellingQueueId(null);
    }
  };

  const getOpportunityTypeLabel = (type: string) => {
    switch (type) {
      case 'pfa': return 'PFA (Projet de Fin d\'Année)';
      case 'pfe': return 'PFE (Projet de Fin d\'Études)';
      case 'employment': return 'Emploi';
      case 'observation': return 'Stage d\'observation';
      default: return type;
    }
  };

  const getPriorityBadge = (role: string, studentStatus: string) => {
    if (role === 'committee') {
      return <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">Comité</span>;
    } else if (studentStatus === 'ensa') {
      return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">ENSA</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">Externe</span>;
    }
  };

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
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (position: number, totalInQueue: number) => {
    if (totalInQueue === 0) return 100;
    return Math.max(0, Math.min(100, ((totalInQueue - position + 1) / totalInQueue) * 100));
  };

  const getPositionBadgeColor = (position: number) => {
    if (position === 1) return 'bg-green-500 text-white animate-pulse';
    if (position <= 3) return 'bg-yellow-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getEstimatedWaitTime = (position: number, estimatedDuration: number) => {
    return Math.max(0, (position - 1) * estimatedDuration);
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
                        Mes Files
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
        {/* Position Banner */}
        {showPositionBanner && (
          <div className={`mb-6 p-6 rounded-2xl border-2 shadow-lg ${
            showPositionBanner.position === 1 
              ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 text-emerald-800 animate-pulse'
              : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg ${
                  showPositionBanner.position === 1 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  #{showPositionBanner.position}
                </div>
                <div>
                  {showPositionBanner.position === 1 ? (
                    <div>
                      <p className="font-bold text-xl">Vous êtes le prochain !</p>
                      <div className="flex items-center mt-1">
                        <span className="text-base">Direction </span>
                        <RoomIndicator room={showPositionBanner.room} size="sm" className="ml-2" />
                      </div>
                    </div>
                  ) : (
                    <p className="font-bold text-xl">Votre tour arrive bientôt ! Position #{showPositionBanner.position}</p>
                  )}
                </div>
              </div>
              {showPositionBanner.position > 3 && (
                <button
                  onClick={() => setShowPositionBanner(null)}
                  className="p-2 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

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

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-2">Vos Files d'Attente Actives</h2>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg">
            Consultez vos positions dans les files d'attente des entreprises.
          </p>
        </div>

        {/* Queues Summary */}
        {!isLoading && queues.length > 0 && (
          <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 p-3 sm:p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Mes Files d'Attente</h2>
                <p className="text-slate-600 mt-1 text-sm sm:text-base">
                  {queues.length} file{queues.length > 1 ? 's' : ''} d'attente active{queues.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm text-slate-600 hidden sm:inline">Mise à jour automatique</span>
              </div>
            </div>
          </div>
        )}

        {/* Queues List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-[#2880CA] mx-auto"></div>
            <p className="mt-4 text-slate-600 font-medium">Chargement des files d'attente...</p>
          </div>
        ) : queues.length === 0 ? (
          <div className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <QueueListIcon className="w-16 h-16 text-[#2880CA]" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Aucune file d'attente active</h3>
            <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
              Vous n'êtes actuellement dans aucune file d'attente. Rejoignez une file pour commencer vos entretiens !
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/dashboard/student/companies')}
                className="bg-gradient-to-r from-[#2880CA] to-blue-600 hover:from-blue-600 hover:to-[#2880CA] text-white px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center justify-center font-semibold shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Parcourir les entreprises
              </button>
              <button
                onClick={() => router.push('/dashboard/student/history')}
                className="bg-white/70 hover:bg-white text-[#2880CA] border-2 border-[#2880CA] px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 inline-flex items-center justify-center font-semibold backdrop-blur-sm"
              >
                <ClockIcon className="w-5 h-5 mr-2" />
                Voir l'historique
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {queues.map((queue: Queue) => (
              <div key={queue._id} className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 p-3 sm:p-4 md:p-6 hover:shadow-xl transition-all duration-300 group">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 truncate">{queue.companyName}</h3>
                      <RoomIndicator room={queue.room} size="sm" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                      <span className="flex items-center bg-slate-100 px-2 py-1 rounded-lg">
                        <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">{queue.estimatedDuration} min</span>
                        <span className="sm:hidden">{queue.estimatedDuration}m</span>
                      </span>
                      <span className="flex items-center bg-slate-100 px-2 py-1 rounded-lg">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span className="hidden sm:inline">{getOpportunityTypeLabel(queue.opportunityType)}</span>
                        <span className="sm:hidden">{queue.opportunityType.toUpperCase()}</span>
                      </span>
                      {getPriorityBadge(session.user.role, session.user.studentStatus || 'external')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(queue.status)}`}>
                      {getStatusLabel(queue.status)}
                    </span>
                  </div>
                </div>

                {/* Position and Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">Votre position</span>
                    <div className="flex items-center space-x-2">
                      {queue.status === 'in_progress' && (
                        <span className="px-2 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full animate-pulse">
                          EN COURS
                        </span>
                      )}
                      {queue.position === 1 && queue.status === 'waiting' && (
                        <span className="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full animate-pulse">
                          VOTRE TOUR !
                        </span>
                      )}
                      <span className={`px-3 py-1.5 text-sm sm:text-lg font-bold rounded-lg shadow-md ${getPositionBadgeColor(queue.position)}`}>
                        #{queue.position}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 sm:h-3 mb-3">
                    <div 
                      className={`h-2 sm:h-3 rounded-full transition-all duration-500 ${
                        queue.status === 'in_progress' 
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                          : queue.position === 1 && queue.status === 'waiting'
                          ? 'bg-gradient-to-r from-blue-500 to-[#2880CA]'
                          : 'bg-gradient-to-r from-[#2880CA] to-blue-600'
                      }`}
                      style={{ width: `${calculateProgress(queue.position, queue.position + 5)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-1 sm:space-y-0">
                    <p className="text-xs sm:text-sm text-slate-500">
                      Rejoint le {new Date(queue.joinedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium">
                      Temps d'attente: {getEstimatedWaitTime(queue.position, queue.estimatedDuration)} min
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-end gap-2">
                  {queue.status === 'in_progress' ? (
                    <div className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-lg font-semibold border border-emerald-200 text-sm">
                      Entretien en cours
                    </div>
                  ) : queue.status === 'waiting' ? (
                    <>
                      {/* Reschedule button - only show if not in position 1 */}
                      {queue.position > 1 && (
                        <button
                          onClick={() => handleRescheduleInterview(queue._id)}
                          disabled={reschedulingQueueId === queue._id}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
                          title="Reporter l'entretien à la fin de la file"
                        >
                          {reschedulingQueueId === queue._id ? 'Report...' : 'Reporter'}
                        </button>
                      )}
                      
                      {/* Cancel button */}
                      <button
                        onClick={() => handleCancelInterview(queue._id)}
                        disabled={cancellingQueueId === queue._id}
                        className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
                        title="Annuler l'entretien"
                      >
                        {cancellingQueueId === queue._id ? 'Annulation...' : 'Annuler'}
                      </button>
                      
                      {/* Leave queue button */}
                      <button
                        onClick={() => handleLeaveQueue(queue._id)}
                        disabled={leavingQueueId === queue._id}
                        className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium shadow-md hover:shadow-lg"
                        title="Quitter la file d'attente"
                      >
                        {leavingQueueId === queue._id ? 'Sortie...' : 'Quitter'}
                      </button>
                    </>
                  ) : (
                    <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold text-xs sm:text-sm border border-slate-200">
                      {getStatusLabel(queue.status)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}


        {/* Auto-refresh indicator */}
        {queues.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              🔄 Mise à jour automatique toutes les 5 secondes
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
