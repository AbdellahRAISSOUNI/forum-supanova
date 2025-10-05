'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon, 
  ClockIcon, 
  UserGroupIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CogIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import RoomStatusIndicator from '@/components/RoomStatusIndicator';
import AdvancedQueueManagement from '@/components/AdvancedQueueManagement';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'committee' | 'system'>('overview');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Modern Header - Mobile Responsive */}
      <header className="bg-[#2880CA] backdrop-blur-md border-b border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => router.push('/dashboard/admin')}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                  Tableau de Bord Administrateur
                </h1>
                <p className="text-blue-100 text-sm sm:text-base truncate">
                  ENSA Tétouan - Forum des Entreprises
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between w-full sm:w-auto space-x-2 sm:space-x-3">
              <div className="hidden md:block text-right">
                <p className="text-xs sm:text-sm text-blue-100">Connecté en tant que</p>
                <p className="text-white font-medium text-sm sm:text-base truncate">
                  {session?.user.firstName} {session?.user.name}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-xl transition-colors backdrop-blur-sm border border-red-400/50 text-sm sm:text-base flex-shrink-0"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-4 sm:pt-6">
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
          <div className="flex border-b border-gray-200/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <HomeIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Vue d'ensemble</span>
                <span className="sm:hidden">Vue</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('companies')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'companies'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <BuildingOfficeIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Entreprises</span>
                <span className="sm:hidden">Entr.</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('committee')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'committee'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <UsersIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Comité</span>
                <span className="sm:hidden">Com.</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'system'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <CogIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Système</span>
                <span className="sm:hidden">Sys.</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTabContent 
            session={session}
            stats={stats}
            statsLoading={statsLoading}
            activities={activities}
            activityLoading={activityLoading}
            queues={queues}
            queuesLoading={queuesLoading}
            handleViewFullQueue={handleViewFullQueue}
            getPriorityBadge={getPriorityBadge}
            getOpportunityTypeBadge={getOpportunityTypeBadge}
            formatTime={formatTime}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'companies' && (
          <CompaniesTabContent />
        )}

        {activeTab === 'committee' && (
          <CommitteeTabContent />
        )}

        {activeTab === 'system' && (
          <SystemTabContent 
            queues={queues}
            queuesLoading={queuesLoading}
          />
        )}
      </main>

      {/* Full Queue Modal */}
      {showQueueModal && selectedQueue && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQueueModal(false);
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-white/20 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center p-6 border-b border-gray-200/50 bg-gradient-to-r from-[#2880CA]/10 to-blue-50/50">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  File d'Attente - {selectedQueue.companyName}
                </h2>
                <p className="text-sm text-gray-600 mt-1">Salle {selectedQueue.room}</p>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] bg-gradient-to-b from-white/50 to-gray-50/30">
              {/* Current Interview */}
              {selectedQueue.currentInterview && (
                <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50 shadow-lg">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <h3 className="text-lg font-bold text-green-800">Entretien en Cours</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-semibold text-green-700 text-lg">{selectedQueue.currentInterview.studentName}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        {getOpportunityTypeBadge(selectedQueue.currentInterview.opportunityType)}
                        {getPriorityBadge(selectedQueue.currentInterview.role, selectedQueue.currentInterview.studentStatus)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-600 font-medium">Commencé à</p>
                      <p className="text-lg font-bold text-green-700">{formatTime(selectedQueue.currentInterview.startedAt)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Queue Statistics */}
              <div className="mb-6 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[#2880CA]">{selectedQueue.totalWaiting}</p>
                    <p className="text-sm text-gray-600">En attente</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{selectedQueue.averageWaitTime}</p>
                    <p className="text-sm text-gray-600">Min d'attente</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{selectedQueue.estimatedDuration}</p>
                    <p className="text-sm text-gray-600">Min par entretien</p>
                  </div>
                </div>
              </div>

              {/* Full Queue */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <UserGroupIcon className="w-5 h-5 mr-2 text-[#2880CA]" />
                  File d'Attente ({selectedQueue.totalWaiting} étudiants)
                </h3>
                
                {selectedQueue.fullQueue.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserGroupIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 text-lg">Aucun étudiant en attente</p>
                    <p className="text-gray-500 text-sm mt-1">La file d'attente est vide</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedQueue.fullQueue.map((student, index) => (
                      <div key={student.interviewId} className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 hover:bg-white/90 transition-all duration-200 shadow-sm hover:shadow-md">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#2880CA] to-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-lg">
                            #{student.position}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{student.studentName}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              {getOpportunityTypeBadge(student.opportunityType)}
                              {getPriorityBadge(student.role, student.studentStatus)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 font-medium">
                            Arrivé: {formatDate(student.joinedAt)}
                          </p>
                          <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full mt-1">
                            Score: {student.priorityScore}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-6 py-3 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800/90 backdrop-blur-sm text-white py-6 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Espace Administrateur.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Overview Tab Component
function OverviewTabContent({ 
  session, 
  stats, 
  statsLoading, 
  activities, 
  activityLoading, 
  queues, 
  queuesLoading, 
  handleViewFullQueue, 
  getPriorityBadge, 
  getOpportunityTypeBadge, 
  formatTime, 
  formatDate 
}: any) {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
            Bienvenue, {session.user.firstName} {session.user.name} !
          </h2>
          <p className="text-gray-600">
            Vue d'ensemble du système en temps réel
          </p>
        </div>
      </div>

      {/* Top Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#2880CA]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Étudiants</h3>
                <p className="text-xl sm:text-2xl font-bold text-[#2880CA]">{stats.totalStudents}</p>
                <p className="text-xs sm:text-sm text-gray-600">Inscrits</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Entretiens Aujourd'hui</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.totalInterviewsToday}</p>
                <p className="text-xs sm:text-sm text-gray-600">Terminés</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">En Cours</h3>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.activeInterviewsNow}</p>
                <p className="text-xs sm:text-sm text-gray-600">Actifs</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Entreprises</h3>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.totalCompanies}</p>
                <p className="text-xs sm:text-sm text-gray-600">Actives</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Activité en Temps Réel</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm text-gray-600">En direct</span>
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
              activities.map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50/70 rounded-lg">
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
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-6">Santé du Système</h2>
          
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
                  <p className="text-xl sm:text-2xl font-bold text-[#2880CA]">{stats.totalQueuesJoined}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Files d'attente</p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-[#2880CA]">{stats.totalCommitteeMembers}</p>
                  <p className="text-xs sm:text-sm text-gray-600">Membres du comité</p>
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

      {/* All Queues Overview */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Vue d'ensemble des Files d'Attente</h2>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm text-gray-600">Mise à jour automatique</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {queues.map((queue: any) => (
              <div key={queue.companyId} className="border border-gray-200/50 rounded-lg p-4 hover:shadow-md transition-shadow bg-white/50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{queue.companyName}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Salle {queue.room}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-medium text-gray-700">{queue.totalWaiting} en attente</p>
                    <p className="text-xs text-gray-500">{queue.averageWaitTime} min d'attente</p>
                  </div>
                </div>

                {/* Current Interview */}
                {queue.currentInterview ? (
                  <div className="mb-3 p-2 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs sm:text-sm font-medium text-green-800">En cours</span>
                    </div>
                    <p className="text-xs sm:text-sm text-green-700 mt-1">{queue.currentInterview.studentName}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getOpportunityTypeBadge(queue.currentInterview.opportunityType)}
                      {getPriorityBadge(queue.currentInterview.role, queue.currentInterview.studentStatus)}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-2 bg-gray-50 rounded">
                    <p className="text-xs sm:text-sm text-gray-600">Aucun entretien en cours</p>
                  </div>
                )}

                {/* View Full Queue Button */}
                <button
                  onClick={() => handleViewFullQueue(queue)}
                  className="w-full bg-[#2880CA] hover:bg-[#1e5f8a] text-white text-xs sm:text-sm py-2 px-3 rounded transition-colors"
                >
                  Voir la File Complète
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Companies Tab Component
function CompaniesTabContent() {
  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 sm:p-8">
        <div className="text-center">
          <BuildingOfficeIcon className="w-16 h-16 text-[#2880CA] mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">Gestion des Entreprises</h2>
          <p className="text-gray-600 mb-6">Gérez les entreprises participantes et leurs salles assignées</p>
          <Link 
            href="/dashboard/admin/companies"
            className="inline-flex items-center px-6 py-3 bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold rounded-lg transition-colors"
          >
            <BuildingOfficeIcon className="w-5 h-5 mr-2" />
            Accéder à la Gestion
          </Link>
        </div>
      </div>
    </div>
  );
}

// Committee Tab Component
function CommitteeTabContent() {
  return (
    <div className="space-y-6">
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 sm:p-8">
        <div className="text-center">
          <UsersIcon className="w-16 h-16 text-[#2880CA] mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">Gestion du Comité</h2>
          <p className="text-gray-600 mb-6">Gérez les membres du comité et leurs salles assignées</p>
          <Link 
            href="/dashboard/admin/committee"
            className="inline-flex items-center px-6 py-3 bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold rounded-lg transition-colors"
          >
            <UsersIcon className="w-5 h-5 mr-2" />
            Accéder à la Gestion
          </Link>
        </div>
      </div>
    </div>
  );
}

// System Tab Component
function SystemTabContent({ queues, queuesLoading }: any) {
  return (
    <div className="space-y-6">
      {/* Room Status Overview */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Statut des Salles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {queues.map((queue: any) => (
            <RoomStatusIndicator 
              key={queue.companyId}
              roomId={queue.companyId}
              compact={false}
              refreshInterval={10000}
            />
          ))}
        </div>
      </div>

      {/* System Actions */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Actions Système</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
            <CogIcon className="w-5 h-5 mx-auto mb-2" />
            Gestion Utilisateurs
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
            <ChartBarIcon className="w-5 h-5 mx-auto mb-2" />
            Statistiques Avancées
          </button>
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
            <ExclamationTriangleIcon className="w-5 h-5 mx-auto mb-2" />
            Maintenance
          </button>
        </div>
      </div>
    </div>
  );
}