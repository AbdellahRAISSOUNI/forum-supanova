'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2880CA] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'student') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2880CA] text-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tableau de Bord Étudiant</h1>
            <p className="text-lg opacity-90">Bienvenue, {session.user.firstName} {session.user.name} !</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-white text-[#2880CA] px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-8">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Bienvenue sur votre tableau de bord !
          </h2>
          <p className="text-gray-600 mb-6">
            Gérez vos candidatures et suivez vos files d'attente en temps réel.
          </p>
          
          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/student/companies"
              className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-6 py-4 rounded-lg transition-colors text-center font-semibold"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span>Parcourir les Entreprises</span>
              </div>
            </Link>
            
            <Link
              href="/dashboard/student/queues"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg transition-colors text-center font-semibold"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Mes Files d'Attente</span>
              </div>
            </Link>

            <Link
              href="/dashboard/student/history"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg transition-colors text-center font-semibold"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Historique</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-[#2880CA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Files Actives</h3>
                  <p className="text-2xl font-bold text-[#2880CA]">{stats.totalQueues}</p>
                  <p className="text-sm text-gray-600">En cours d'attente</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">En Cours</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.activeInterviews}</p>
                  <p className="text-sm text-gray-600">Entretiens actifs</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">En Attente</h3>
                  <p className="text-2xl font-bold text-yellow-600">{stats.waitingQueues}</p>
                  <p className="text-sm text-gray-600">Files d'attente</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Terminés</h3>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalCompleted}</p>
                  <p className="text-sm text-gray-600">Total ({stats.completedToday} aujourd'hui)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Activité Récente</h2>
            <Link
              href="/dashboard/student/queues"
              className="text-[#2880CA] hover:text-[#1e5f8a] font-medium"
            >
              Voir tout
            </Link>
          </div>

          {activityLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2880CA] mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement de l'activité...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité</h3>
              <p className="text-gray-600 mb-4">Vous n'avez pas encore rejoint de files d'attente.</p>
              <Link
                href="/dashboard/student/companies"
                className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Parcourir les entreprises
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-[#2880CA] text-white rounded-full flex items-center justify-center font-bold">
                      #{activity.queuePosition || '?'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{activity.companyName}</h4>
                      <p className="text-sm text-gray-600">
                        Salle {activity.room} • {getOpportunityTypeLabel(activity.opportunityType)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}>
                      {getStatusLabel(activity.status)}
                    </span>
                    <span className="text-xs text-gray-500">
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

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 px-4 sm:px-8 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Espace Étudiant.
          </p>
        </div>
      </footer>
    </div>
  );
}