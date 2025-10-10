'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeftIcon, ChartBarIcon, ClockIcon, CheckCircleIcon, QueueListIcon } from '@heroicons/react/24/outline';

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
      {/* Modern Header - Mobile Responsive */}
      <header className="bg-[#2880CA] backdrop-blur-md border-b border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                  Tableau de Bord
                </h1>
                <p className="text-blue-100 text-sm sm:text-base truncate">
                  Bonjour, {session.user.firstName} {session.user.name}
                </p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-xl transition-colors backdrop-blur-sm border border-red-400/50 text-sm sm:text-base flex-shrink-0 self-end sm:self-auto"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Bienvenue sur votre espace étudiant
              </h2>
              <p className="text-slate-600 text-lg">
                Gérez vos candidatures et suivez vos files d'attente en temps réel
              </p>
            </div>
            
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/dashboard/student/companies"
                className="group bg-gradient-to-br from-[#2880CA] to-blue-600 hover:from-blue-600 hover:to-[#2880CA] text-white p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Entreprises</h3>
                    <p className="text-blue-100 text-sm">Découvrir les entreprises</p>
                  </div>
                </div>
              </Link>
              
              <Link
                href="/dashboard/student/queues"
                className="group bg-gradient-to-br from-emerald-500 to-green-600 hover:from-green-600 hover:to-emerald-500 text-white p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <QueueListIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Mes Files</h3>
                    <p className="text-green-100 text-sm">Suivre mes candidatures</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard/student/history"
                className="group bg-gradient-to-br from-purple-500 to-violet-600 hover:from-violet-600 hover:to-purple-500 text-white p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <ClockIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Historique</h3>
                    <p className="text-purple-100 text-sm">Voir mes entretiens</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Files Actives</p>
                  <p className="text-3xl font-bold text-[#2880CA] mt-1">{stats.totalQueues}</p>
                  <p className="text-slate-500 text-xs mt-1">En cours d'attente</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <QueueListIcon className="w-6 h-6 text-[#2880CA]" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">En Cours</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.activeInterviews}</p>
                  <p className="text-slate-500 text-xs mt-1">Entretiens actifs</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <ClockIcon className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">En Attente</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{stats.waitingQueues}</p>
                  <p className="text-slate-500 text-xs mt-1">Files d'attente</p>
                </div>
                <div className="p-3 bg-amber-100 rounded-xl">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Terminés</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{stats.totalCompleted}</p>
                  <p className="text-slate-500 text-xs mt-1">Total ({stats.completedToday} aujourd'hui)</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <CheckCircleIcon className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Activité Récente</h2>
            <Link
              href="/dashboard/student/queues"
              className="text-[#2880CA] hover:text-blue-600 font-medium transition-colors"
            >
              Voir tout →
            </Link>
          </div>

          {activityLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-[#2880CA] mx-auto"></div>
              <p className="mt-4 text-slate-600 font-medium">Chargement de l'activité...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <ChartBarIcon className="w-10 h-10 text-[#2880CA]" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune activité récente</h3>
              <p className="text-slate-600 mb-6">Vous n'avez pas encore rejoint de files d'attente.</p>
              <Link
                href="/dashboard/student/companies"
                className="inline-flex items-center px-6 py-3 bg-[#2880CA] hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Parcourir les entreprises
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-white/50 rounded-xl border border-white/30 hover:bg-white/70 transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#2880CA] to-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-lg">
                      #{activity.queuePosition || '?'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{activity.companyName}</h4>
                      <p className="text-sm text-slate-600">
                        Salle {activity.room} • {getOpportunityTypeLabel(activity.opportunityType)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                      {getStatusLabel(activity.status)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(activity.updatedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
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