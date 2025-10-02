'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface AdminStats {
  totalStudents: number;
  totalInterviewsToday: number;
  activeInterviewsNow: number;
  totalCompanies: number;
  totalCommitteeMembers: number;
  totalQueuesJoined: number;
  averageDuration: number;
  systemHealth: {
    totalInterviews: number;
    completedInterviews: number;
    completionRate: number;
  };
}

interface Activity {
  id: string;
  type: 'registration' | 'interview';
  timestamp: string;
  studentName: string;
  studentEmail: string;
  studentStatus: string;
  opportunityType: string;
  companyName: string | null;
  room: string | null;
  action: string;
  description: string;
  status?: string;
}

interface QueueOverview {
  companyId: string;
  companyName: string;
  room: string;
  estimatedDuration: number;
  currentInterview: {
    studentName: string;
    studentStatus: string;
    role: string;
    opportunityType: string;
    startedAt: string;
    interviewId: string;
  } | null;
  nextInQueue: Array<{
    studentName: string;
    studentStatus: string;
    role: string;
    opportunityType: string;
    position: number;
    joinedAt: string;
    priorityScore: number;
    interviewId: string;
  }>;
  fullQueue: Array<{
    studentName: string;
    studentStatus: string;
    role: string;
    opportunityType: string;
    position: number;
    joinedAt: string;
    priorityScore: number;
    interviewId: string;
  }>;
  totalWaiting: number;
  averageWaitTime: number;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedQueue, setSelectedQueue] = useState<QueueOverview | null>(null);
  const [showQueueModal, setShowQueueModal] = useState(false);

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('Failed to fetch admin stats');
      const data = await response.json();
      return data.stats;
    },
    enabled: !!session && session.user.role === 'admin',
  });

  // Fetch recent activity
  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async (): Promise<Activity[]> => {
      const response = await fetch('/api/admin/activity');
      if (!response.ok) throw new Error('Failed to fetch activity');
      const data = await response.json();
      return data.activities;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!session && session.user.role === 'admin',
  });

  // Fetch queues overview
  const { data: queues = [], isLoading: queuesLoading } = useQuery({
    queryKey: ['admin-queues'],
    queryFn: async (): Promise<QueueOverview[]> => {
      const response = await fetch('/api/admin/queues');
      if (!response.ok) throw new Error('Failed to fetch queues');
      const data = await response.json();
      return data.queues;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    enabled: !!session && session.user.role === 'admin',
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/admin');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  const handleViewFullQueue = (queue: QueueOverview) => {
    setSelectedQueue(queue);
    setShowQueueModal(true);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getOpportunityTypeBadge = (type: string) => {
    switch (type) {
      case 'pfa':
      case 'pfe':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">PFA/PFE</span>;
      case 'employment':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Emploi</span>;
      case 'observation':
        return <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">Observation</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{type}</span>;
    }
  };

  if (status === 'loading' || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2880CA] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2880CA] text-white py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tableau de Bord Administrateur</h1>
            <p className="text-lg opacity-90">ENSA Tétouan - Forum des Entreprises</p>
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
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Bienvenue, {session.user.firstName} {session.user.name} !
            </h2>
            <p className="text-gray-600">
              Vue d'ensemble du système en temps réel
            </p>
          </div>
        </div>

        {/* Top Statistics */}
        {stats && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-[#2880CA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Étudiants</h3>
                  <p className="text-2xl font-bold text-[#2880CA]">{stats.totalStudents}</p>
                  <p className="text-sm text-gray-600">Inscrits</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Entretiens Aujourd'hui</h3>
                  <p className="text-2xl font-bold text-green-600">{stats.totalInterviewsToday}</p>
                  <p className="text-sm text-gray-600">Terminés</p>
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
                  <h3 className="text-lg font-semibold text-gray-800">En Cours</h3>
                  <p className="text-2xl font-bold text-yellow-600">{stats.activeInterviewsNow}</p>
                  <p className="text-sm text-gray-600">Actifs</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Entreprises</h3>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalCompanies}</p>
                  <p className="text-sm text-gray-600">Actives</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Live Activity Feed */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Activité en Temps Réel</h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">En direct</span>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto space-y-3">
              {activityLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2880CA] mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement de l'activité...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Aucune activité récente</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'registration' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {activity.companyName && (
                          <span className="text-xs text-gray-500">Salle {activity.room}</span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Health */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Santé du Système</h2>
            
            {stats && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Taux de réussite</span>
                  <span className="text-sm font-bold text-green-600">{stats.systemHealth.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.systemHealth.completionRate}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#2880CA]">{stats.totalQueuesJoined}</p>
                    <p className="text-sm text-gray-600">Files d'attente</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#2880CA]">{stats.totalCommitteeMembers}</p>
                    <p className="text-sm text-gray-600">Membres du comité</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Durée moyenne d'entretien: <span className="font-semibold">{stats.averageDuration} min</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Admin Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Utilisateurs</h3>
                  <p className="text-gray-600">Gestion des comptes</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Entreprises</h3>
                  <p className="text-gray-600">Gestion des partenaires</p>
                </div>
              </div>
            </div>

                <Link href="/dashboard/admin/committee" className="bg-purple-50 p-6 rounded-lg hover:bg-purple-100 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Comité</h3>
                      <p className="text-gray-600">Gestion des membres du comité</p>
                    </div>
                  </div>
                </Link>

            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Système</h3>
                  <p className="text-gray-600">Configuration globale</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Actions Rapides</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/dashboard/admin/companies" className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-4 py-3 rounded-lg transition-colors text-center">
                    Gérer les Entreprises
                  </Link>
                  <Link href="/dashboard/admin/committee" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
                    Gérer le Comité
                  </Link>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors">
                    Gestion Utilisateurs
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors">
                    Statistiques
                  </button>
            </div>
          </div>

          {/* System Overview */}
          <div className="border-t pt-8 mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Vue d&apos;ensemble du système</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Étudiants actifs</h4>
                <p className="text-2xl font-bold text-[#2880CA]">0</p>
                <p className="text-sm text-gray-600">Dernière mise à jour: Jamais</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Offres disponibles</h4>
                <p className="text-2xl font-bold text-[#2880CA]">0</p>
                <p className="text-sm text-gray-600">Dernière mise à jour: Jamais</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Candidatures en cours</h4>
                <p className="text-2xl font-bold text-[#2880CA]">0</p>
                <p className="text-sm text-gray-600">Dernière mise à jour: Jamais</p>
              </div>
            </div>
          </div>
        {/* All Queues Overview */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Vue d'ensemble des Files d'Attente</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">Mise à jour automatique</span>
            </div>
          </div>
          
          {queuesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2880CA] mx-auto"></div>
              <p className="mt-2 text-gray-600">Chargement des files d'attente...</p>
            </div>
          ) : queues.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Aucune file d'attente active</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {queues.map((queue) => (
                <div key={queue.companyId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{queue.companyName}</h3>
                      <p className="text-sm text-gray-600">Salle {queue.room}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{queue.totalWaiting} en attente</p>
                      <p className="text-xs text-gray-500">{queue.averageWaitTime} min d'attente</p>
                    </div>
                  </div>

                  {/* Current Interview */}
                  {queue.currentInterview ? (
                    <div className="mb-3 p-2 bg-green-50 rounded border border-green-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-800">En cours</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">{queue.currentInterview.studentName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getOpportunityTypeBadge(queue.currentInterview.opportunityType)}
                        {getPriorityBadge(queue.currentInterview.role, queue.currentInterview.studentStatus)}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3 p-2 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Aucun entretien en cours</p>
                    </div>
                  )}

                  {/* Next in Queue */}
                  {queue.nextInQueue.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Prochains dans la file:</h4>
                      <div className="space-y-1">
                        {queue.nextInQueue.map((student, index) => (
                          <div key={student.interviewId} className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 bg-[#2880CA] text-white rounded-full flex items-center justify-center text-xs font-bold">
                                #{student.position}
                              </span>
                              <span className="text-gray-700">{student.studentName}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              {getOpportunityTypeBadge(student.opportunityType)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View Full Queue Button */}
                  <button
                    onClick={() => handleViewFullQueue(queue)}
                    className="w-full bg-[#2880CA] hover:bg-[#1e5f8a] text-white text-sm py-2 px-3 rounded transition-colors"
                  >
                    Voir la File Complète
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/dashboard/admin/companies" className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-4 py-3 rounded-lg transition-colors text-center">
            Gérer les Entreprises
          </Link>
          <Link href="/dashboard/admin/committee" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
            Gérer le Comité
          </Link>
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors">
            Gestion Utilisateurs
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors">
            Statistiques Avancées
          </button>
        </div>
      </main>

      {/* Full Queue Modal */}
      {showQueueModal && selectedQueue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                File d'Attente - {selectedQueue.companyName}
              </h2>
              <button
                onClick={() => setShowQueueModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Current Interview */}
              {selectedQueue.currentInterview && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Entretien en Cours</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-700">{selectedQueue.currentInterview.studentName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {getOpportunityTypeBadge(selectedQueue.currentInterview.opportunityType)}
                        {getPriorityBadge(selectedQueue.currentInterview.role, selectedQueue.currentInterview.studentStatus)}
                      </div>
                    </div>
                    <div className="text-sm text-green-600">
                      Commencé à {formatTime(selectedQueue.currentInterview.startedAt)}
                    </div>
                  </div>
                </div>
              )}

              {/* Full Queue */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  File d'Attente ({selectedQueue.totalWaiting} étudiants)
                </h3>
                
                {selectedQueue.fullQueue.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">Aucun étudiant en attente</p>
                ) : (
                  selectedQueue.fullQueue.map((student, index) => (
                    <div key={student.interviewId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-[#2880CA] text-white rounded-full flex items-center justify-center font-bold">
                          #{student.position}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{student.studentName}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {getOpportunityTypeBadge(student.opportunityType)}
                            {getPriorityBadge(student.role, student.studentStatus)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Arrivé: {formatDate(student.joinedAt)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Score: {student.priorityScore}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 px-4 sm:px-8 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Espace Administrateur.
          </p>
        </div>
      </footer>
    </div>
  );
}