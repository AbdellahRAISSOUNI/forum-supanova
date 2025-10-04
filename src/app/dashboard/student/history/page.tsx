'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import RoomIndicator from '@/components/RoomIndicator';
import { ArrowLeftIcon, ClockIcon, CheckCircleIcon, XCircleIcon, BuildingOfficeIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

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
      {/* Modern Header */}
      <header className="bg-[#2880CA] backdrop-blur-md border-b border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/student')}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Historique des Entretiens</h1>
                <p className="text-blue-100">Consultez vos entretiens passés</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {historyData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total</p>
                  <p className="text-3xl font-bold text-[#2880CA] mt-1">{historyData.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <ClockIcon className="w-6 h-6 text-[#2880CA]" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Terminés</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{historyData.completed}</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Annulés</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{historyData.cancelled}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <XCircleIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mb-8">
          <div className="flex space-x-2 bg-slate-100 p-2 rounded-2xl w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Tous ({historyData?.total || 0})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                filter === 'completed'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Terminés ({historyData?.completed || 0})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                filter === 'cancelled'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Annulés ({historyData?.cancelled || 0})
            </button>
            <button
              onClick={() => setFilter('passed')}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                filter === 'passed'
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Passés ({historyData?.passed || 0})
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
          <div className="space-y-6">
            {filteredHistory.map((interview: InterviewHistory) => (
              <div key={interview._id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.01]">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-2xl font-bold text-slate-900">{interview.companyName}</h3>
                      <RoomIndicator room={interview.room} size="sm" />
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-600">
                      <span className="flex items-center bg-slate-100 px-3 py-1 rounded-full">
                        <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                        {interview.companySector}
                      </span>
                      <span className="flex items-center bg-slate-100 px-3 py-1 rounded-full">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {getOpportunityTypeLabel(interview.opportunityType)}
                      </span>
                      {interview.companyWebsite && (
                        <a
                          href={interview.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-[#2880CA] hover:text-blue-600 transition-colors bg-slate-100 px-3 py-1 rounded-full"
                        >
                          <GlobeAltIcon className="w-4 h-4 mr-2" />
                          Site web
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(interview.status)}`}>
                      {getStatusLabel(interview.status)}
                    </span>
                  </div>
                </div>

                {/* Interview Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div className="bg-slate-50 px-4 py-3 rounded-xl">
                      <p className="text-slate-600">
                        <strong className="text-slate-900">Rejoint le:</strong> {formatDate(interview.joinedAt)}
                      </p>
                    </div>
                    {interview.startedAt && (
                      <div className="bg-slate-50 px-4 py-3 rounded-xl">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Commencé le:</strong> {formatDate(interview.startedAt)}
                        </p>
                      </div>
                    )}
                    {interview.completedAt && (
                      <div className="bg-slate-50 px-4 py-3 rounded-xl">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Terminé le:</strong> {formatDate(interview.completedAt)}
                        </p>
                      </div>
                    )}
                    {interview.passedAt && (
                      <div className="bg-slate-50 px-4 py-3 rounded-xl">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Passé le:</strong> {formatDate(interview.passedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="bg-slate-50 px-4 py-3 rounded-xl">
                      <p className="text-slate-600">
                        <strong className="text-slate-900">Position finale:</strong> #{interview.finalPosition}
                      </p>
                    </div>
                    {interview.duration && (
                      <div className="bg-slate-50 px-4 py-3 rounded-xl">
                        <p className="text-slate-600">
                          <strong className="text-slate-900">Durée:</strong> {formatDuration(interview.duration)}
                        </p>
                      </div>
                    )}
                    <div className="bg-slate-50 px-4 py-3 rounded-xl">
                      <p className="text-slate-600">
                        <strong className="text-slate-900">Score de priorité:</strong> {interview.priorityScore}
                      </p>
                    </div>
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
