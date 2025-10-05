'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  ChartBarIcon, 
  ClockIcon, 
  UserGroupIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ArrowPathIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import RoomStatusIndicator from '@/components/RoomStatusIndicator';
import AdvancedQueueManagement from '@/components/AdvancedQueueManagement';

interface QueueData {
  company: {
    _id: string;
    name: string;
    room: string;
    estimatedInterviewDuration: number;
    imageId?: string;
    imageUrl?: string;
  };
  currentInterview: {
    interviewId: string;
    studentName: string;
    studentStatus: string;
    role: string;
    opportunityType: string;
    startedAt: string;
  } | null;
  nextUp: {
    interviewId: string;
    studentName: string;
    studentStatus: string;
    role: string;
    position: number;
    opportunityType: string;
    joinedAt: string;
    priorityScore: number;
  } | null;
  waitingQueue: Array<{
    interviewId: string;
    studentName: string;
    studentStatus: string;
    role: string;
    position: number;
    opportunityType: string;
    joinedAt: string;
    priorityScore: number;
  }>;
  totalWaiting: number;
}

interface CommitteeStats {
  timeFilter: 'today' | 'all';
  company: {
    name: string;
    room: string;
    estimatedDuration: number;
  };
  main: {
    completed: number;
    averageDuration: number;
    currentInterview: {
      studentName: string;
      studentStatus: string;
      duration: number;
    } | null;
  };
  week: {
    completed: number;
    averageDuration: number;
  };
  queue: {
    waiting: number;
    inProgress: number;
  };
  distribution: {
    opportunities: Record<string, number>;
    studentStatus: Record<string, number>;
  };
}

interface InterviewHistory {
  id: string;
  studentName: string;
  studentEmail: string;
  studentStatus: string;
  opportunityType: string;
  status: string;
  joinedAt: string;
  startedAt: string;
  completedAt: string;
  passedAt: string;
  activityDate: string;
  duration: number | null;
  queuePosition: number;
  priorityScore: number;
}

export default function CommitteeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [previousQueueSize, setPreviousQueueSize] = useState(0);
  const [previousWaitingQueue, setPreviousWaitingQueue] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'stats' | 'history' | 'management'>('queue');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState<{ status?: string; date?: string }>({});
  const [statsTimeFilter, setStatsTimeFilter] = useState<'today' | 'all'>('today');

  // React Query for real-time updates
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['committee-queue'],
    queryFn: async () => {
      const response = await fetch('/api/committee/queue');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de la file d\'attente');
      }
      const data = await response.json();
      return data.queueData;
    },
    refetchInterval: 3000, // Refetch every 3 seconds
    enabled: !!session && session.user.role === 'committee',
  });

  // React Query for committee statistics
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['committee-stats', statsTimeFilter],
    queryFn: async () => {
      const response = await fetch(`/api/committee/stats?time=${statsTimeFilter}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des statistiques');
      }
      const data = await response.json();
      return data.stats as CommitteeStats;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!session && session.user.role === 'committee' && activeTab === 'stats',
  });

  // React Query for interview history
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['committee-history', historyPage, historyFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: historyPage.toString(),
        limit: '10',
        ...(historyFilter.status && { status: historyFilter.status }),
        ...(historyFilter.date && { date: historyFilter.date }),
      });
      
      const response = await fetch(`/api/committee/history?${params}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement de l\'historique');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!session && session.user.role === 'committee' && activeTab === 'history',
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/committee');
      return;
    }

    if (session.user.role !== 'committee') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // Timer for current interview
  useEffect(() => {
    if (queueData?.currentInterview) {
      const startTime = new Date(queueData.currentInterview.startedAt).getTime();
      const updateTimer = () => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - startTime) / 1000));
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [queueData?.currentInterview]);

  // Track queue changes and show notifications
  useEffect(() => {
    if (!queueData) return;

    const currentQueueSize = queueData.totalWaiting;
    const currentWaitingQueue = queueData.waitingQueue.map((student: any) => student.interviewId);

    // Check for new students joining
    if (previousQueueSize > 0 && currentQueueSize > previousQueueSize) {
      toast.success(`Nouvel étudiant dans la file d'attente ! Total: ${currentQueueSize}`);
    }

    // Check for students leaving
    if (previousQueueSize > 0 && currentQueueSize < previousQueueSize) {
      toast(`Étudiant sorti de la file d'attente. Total: ${currentQueueSize}`, {
        icon: 'ℹ️',
      });
    }

    // Check for next student ready
    if (queueData.nextUp && !queueData.currentInterview) {
      const isNewNextUp = !previousWaitingQueue.includes(queueData.nextUp.interviewId);
      if (isNewNextUp && previousWaitingQueue.length > 0) {
        toast.success(`Nouvel étudiant prêt ! ${queueData.nextUp.studentName}`, {
          duration: 6000,
        });
        // Optional: Play sound notification
        // const audio = new Audio('/notification.mp3');
        // audio.play().catch(() => {}); // Ignore errors if audio fails
      }
    }

    setPreviousQueueSize(currentQueueSize);
    setPreviousWaitingQueue(currentWaitingQueue);
  }, [queueData]);

  const startInterview = async (interviewId: string) => {
    setIsActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/committee/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        refetch(); // Refresh queue data
      } else {
        toast.error(data.error || 'Erreur lors du démarrage de l\'entretien');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsActionLoading(false);
    }
  };

  const endInterview = async (interviewId: string) => {
    setIsActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/committee/interview/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        refetch(); // Refresh queue data
      } else {
        toast.error(data.error || 'Erreur lors de la fin de l\'entretien');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsActionLoading(false);
    }
  };

  const passInterview = async (interviewId: string) => {
    setIsActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/committee/interview/pass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        refetch(); // Refresh queue data
      } else {
        toast.error(data.error || 'Erreur lors du passage de l\'entretien');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsActionLoading(false);
    }
  };

  const moveToNextStudent = async (companyId: string) => {
    setIsActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/committee/interview/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        refetch(); // Refresh queue data
      } else {
        toast.error(data.error || 'Erreur lors du passage à l\'étudiant suivant');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const getOpportunityTypeText = (type: string) => {
    switch (type) {
      case 'pfa': return 'PFA';
      case 'pfe': return 'PFE';
      case 'employment': return 'Emploi';
      case 'observation': return 'Stage d\'observation';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Terminé</span>;
      case 'passed':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Passé</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Annulé</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }: {
    title: string;
    value: string | number;
    icon: any;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
    subtitle?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
    };

    return (
      <div className={`p-6 rounded-xl border-2 ${colorClasses[color]} transition-all hover:shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subtitle && <p className="text-sm opacity-70 mt-1">{subtitle}</p>}
          </div>
          <Icon className="h-8 w-8 opacity-60" />
        </div>
      </div>
    );
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2880CA] mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'committee') {
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
                onClick={() => router.push('/dashboard/committee')}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                  Gestion des Files d'Attente
                </h1>
                <div className="flex items-center space-x-2">
                  {queueData?.company.imageUrl && (
                    <img
                      src={queueData.company.imageUrl}
                      alt={`${queueData.company.name} logo`}
                      className="w-6 h-6 rounded border border-white/20"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <p className="text-blue-100 text-sm sm:text-base truncate">
                    {queueData?.company.name} - Salle {queueData?.company.room}
                  </p>
                </div>
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
              onClick={() => setActiveTab('queue')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'queue'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <UserGroupIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">File d'Attente</span>
                <span className="sm:hidden">File</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Statistiques</span>
                <span className="sm:hidden">Stats</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Historique</span>
                <span className="sm:hidden">Hist.</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('management')}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'management'
                  ? 'bg-[#2880CA] text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="hidden sm:inline">Gestion</span>
                <span className="sm:hidden">Gest.</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
        {message && (
          <div className={`p-4 rounded-md mb-6 ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Queue Management */}
            <QueueManagementContent 
              queueData={queueData} 
              isActionLoading={isActionLoading}
              elapsedTime={elapsedTime}
              startInterview={startInterview}
              endInterview={endInterview}
              passInterview={passInterview}
              moveToNextStudent={moveToNextStudent}
              getPriorityBadge={getPriorityBadge}
              getOpportunityTypeBadge={getOpportunityTypeBadge}
              formatTime={formatTime}
            />
            
            {/* Room Status - Compact Version */}
            <div className="max-w-4xl mx-auto">
              <RoomStatusIndicator 
                roomId={queueData?.company._id} 
                compact={true}
                showDetails={true}
                refreshInterval={15000}
              />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <StatsContent 
            statsData={statsData} 
            statsLoading={statsLoading}
            statsTimeFilter={statsTimeFilter}
            setStatsTimeFilter={setStatsTimeFilter}
            StatCard={StatCard}
            CheckCircleIcon={CheckCircleIcon}
            ClockIcon={ClockIcon}
            UserGroupIcon={UserGroupIcon}
            ChartBarIcon={ChartBarIcon}
          />
        )}

        {activeTab === 'history' && (
          <HistoryContent 
            historyData={historyData}
            historyLoading={historyLoading}
            historyPage={historyPage}
            setHistoryPage={setHistoryPage}
            historyFilter={historyFilter}
            setHistoryFilter={setHistoryFilter}
            getStatusBadge={getStatusBadge}
            getOpportunityTypeBadge={getOpportunityTypeBadge}
            getPriorityBadge={getPriorityBadge}
          />
        )}

        {activeTab === 'management' && (
          <AdvancedQueueManagement 
            onQueueUpdate={refetch}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800/90 backdrop-blur-sm text-white py-6 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Espace Comité.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Queue Management Component
function QueueManagementContent({ 
  queueData, 
  isActionLoading, 
  elapsedTime, 
  startInterview, 
  endInterview, 
  passInterview, 
  moveToNextStudent, 
  getPriorityBadge, 
  getOpportunityTypeBadge, 
  formatTime 
}: any) {
  if (!queueData) {
    return (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 text-lg">Aucune file d'attente disponible pour votre salle.</p>
          </div>
    );
  }

  return (
          <div className="space-y-8">
      {/* Current Interview Section - Modern Card */}
            {queueData.currentInterview && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200/50 rounded-2xl p-8 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-green-800">Entretien en Cours</h2>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-600 font-medium">Durée</div>
              <div className="text-3xl font-mono font-bold text-green-700">
                {formatTime(elapsedTime)}
              </div>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Student Info */}
            <div className="lg:col-span-1">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {queueData.currentInterview.studentName}
                    </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Type d'opportunité:</span>
                          {getOpportunityTypeBadge(queueData.currentInterview.opportunityType)}
                        </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Statut étudiant:</span>
                          {getPriorityBadge(queueData.currentInterview.role, queueData.currentInterview.studentStatus)}
                        </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Démarré: {new Date(queueData.currentInterview.startedAt).toLocaleTimeString('fr-FR')}
                      </div>
                  </div>
                </div>
              </div>
                    </div>
            
            {/* Action Buttons */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => endInterview(queueData.currentInterview!.interviewId)}
                        disabled={isActionLoading}
                  className="group bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{isActionLoading ? 'Terminaison...' : 'Terminer l\'Entretien'}</span>
                  </div>
                      </button>
                      
                        <button
                          onClick={() => passInterview(queueData.currentInterview!.interviewId)}
                          disabled={isActionLoading}
                  className="group bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span>{isActionLoading ? 'Passage...' : 'Passer'}</span>
                  </div>
                        </button>
                        
                        <button
                          onClick={() => moveToNextStudent(queueData.company._id)}
                          disabled={isActionLoading}
                  className="group bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <span>{isActionLoading ? 'Suivant...' : 'Étudiant Suivant'}</span>
                  </div>
                        </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

      {/* Next Up Section - Modern Card with Switched Layout */}
            {queueData.nextUp && !queueData.currentInterview && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/50 rounded-2xl p-8 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-blue-800">Prochain en File</h2>
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 font-medium">Position</div>
              <div className="text-3xl font-bold text-blue-700">#{queueData.nextUp.position}</div>
            </div>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Start Button - Moved to Left */}
            <div className="lg:col-span-1 flex items-center justify-center order-1 lg:order-1">
              <button
                onClick={() => startInterview(queueData.nextUp!.interviewId)}
                disabled={isActionLoading}
                className="w-full bg-gradient-to-r from-[#2880CA] to-blue-600 hover:from-blue-600 hover:to-[#2880CA] text-white px-8 py-6 rounded-xl text-lg font-semibold transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{isActionLoading ? 'Démarrage...' : 'Démarrer l\'Entretien'}</span>
                </div>
              </button>
            </div>
            
            {/* Student Info - Moved to Right */}
            <div className="lg:col-span-2 order-2 lg:order-2">
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {queueData.nextUp.studentName}
                    </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Type d'opportunité:</span>
                        {getOpportunityTypeBadge(queueData.nextUp.opportunityType)}
                      </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 font-medium">Statut étudiant:</span>
                        {getPriorityBadge(queueData.nextUp.role, queueData.nextUp.studentStatus)}
                      </div>
                    </div>
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <div className="text-sm text-gray-500">
                    Arrivé: {new Date(queueData.nextUp.joinedAt).toLocaleTimeString('fr-FR')}
                  </div>
                </div>
              </div>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting Queue Section */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">File d'Attente</h2>
          </div>
          <div className="text-sm text-gray-600 bg-blue-50/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-blue-200/50">
                  <span className="font-medium">Système intelligent :</span> 3 Comité → 2 Externes → 2 ENSA
                </div>
              </div>
              
              {queueData.waitingQueue.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Aucun étudiant en attente</p>
              ) : (
          <div className="space-y-3">
            {queueData.waitingQueue.map((student: any) => (
              <div key={student.interviewId} className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/50 hover:bg-white/70 transition-all duration-300">
                      <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#2880CA] to-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-lg">
                          #{student.position}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{student.studentName}</h4>
                          <div className="flex items-center space-x-2 mt-1">
                            {getOpportunityTypeBadge(student.opportunityType)}
                            {getPriorityBadge(student.role, student.studentStatus)}
                          </div>
                        </div>
                      </div>
                <div className="text-sm text-gray-500 bg-gray-50/70 px-3 py-1 rounded-lg">
                        Arrivé: {new Date(student.joinedAt).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {queueData.totalWaiting > 10 && (
                    <div className="text-center text-gray-600 py-4">
                      ... et {queueData.totalWaiting - 10} autres en attente
                    </div>
                  )}
                  
            <div className="border-t border-gray-200/50 pt-4 text-center">
              <div className="bg-gradient-to-r from-[#2880CA] to-blue-600 text-white px-6 py-3 rounded-xl inline-block">
                <p className="text-lg font-semibold">
                      Total en attente: {queueData.totalWaiting} étudiant{queueData.totalWaiting !== 1 ? 's' : ''}
                    </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Statistics Component
function StatsContent({ statsData, statsLoading, statsTimeFilter, setStatsTimeFilter, StatCard, CheckCircleIcon, ClockIcon, UserGroupIcon, ChartBarIcon }: any) {
  if (statsLoading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2880CA] mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
      </div>
    );
  }

  if (!statsData) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <p className="text-gray-600 text-lg">Aucune donnée statistique disponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Time Filter Controls */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Période d'Analyse</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setStatsTimeFilter('today')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statsTimeFilter === 'today'
                  ? 'bg-[#2880CA] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setStatsTimeFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statsTimeFilter === 'all'
                  ? 'bg-[#2880CA] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tous les temps
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {statsTimeFilter === 'today' 
            ? 'Statistiques pour la journée en cours' 
            : 'Statistiques depuis le début du forum'
          }
        </p>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Informations de la Salle</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800">Entreprise</h3>
            <p className="text-lg font-bold text-blue-600">{statsData.company.name}</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800">Salle</h3>
            <p className="text-lg font-bold text-green-600">{statsData.company.room}</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-purple-800">Durée Estimée</h3>
            <p className="text-lg font-bold text-purple-600">{statsData.company.estimatedDuration} min</p>
          </div>
        </div>
      </div>

      {/* Main Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={`Entretiens ${statsTimeFilter === 'today' ? 'Aujourd\'hui' : 'Terminés'}`}
          value={statsData.main.completed}
          icon={CheckCircleIcon}
          color="green"
          subtitle={`Moyenne: ${statsData.main.averageDuration} min`}
        />
        {statsTimeFilter === 'today' && (
          <StatCard
            title="Cette Semaine"
            value={statsData.week.completed}
            icon={ChartBarIcon}
            color="blue"
            subtitle={`Moyenne: ${statsData.week.averageDuration} min`}
          />
        )}
        <StatCard
          title="En Attente"
          value={statsData.queue.waiting}
          icon={UserGroupIcon}
          color="yellow"
        />
        <StatCard
          title="En Cours"
          value={statsData.queue.inProgress}
          icon={ClockIcon}
          color="red"
        />
      </div>

      {/* Current Interview Info */}
      {statsData.main.currentInterview && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h3 className="text-xl font-bold text-green-800 mb-4">Entretien Actuel</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-green-700 font-medium">Étudiant</p>
              <p className="text-lg font-bold text-green-800">{statsData.main.currentInterview.studentName}</p>
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Statut</p>
              <p className="text-lg font-bold text-green-800">{statsData.main.currentInterview.studentStatus}</p>
            </div>
            <div>
              <p className="text-sm text-green-700 font-medium">Durée</p>
              <p className="text-lg font-bold text-green-800">{statsData.main.currentInterview.duration} min</p>
            </div>
          </div>
        </div>
      )}

      {/* Distribution Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Opportunity Type Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Types d'Opportunités (Aujourd'hui)</h3>
          <div className="space-y-3">
            {Object.entries(statsData.distribution.opportunities).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-gray-600 capitalize">{type}</span>
                <span className="font-bold text-blue-600">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Student Status Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Statuts des Étudiants (Aujourd'hui)</h3>
          <div className="space-y-3">
            {Object.entries(statsData.distribution.studentStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-gray-600 capitalize">{status}</span>
                <span className="font-bold text-green-600">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// History Component
function HistoryContent({ 
  historyData, 
  historyLoading, 
  historyPage, 
  setHistoryPage, 
  historyFilter, 
  setHistoryFilter, 
  getStatusBadge, 
  getOpportunityTypeBadge, 
  getPriorityBadge 
}: any) {
  if (historyLoading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2880CA] mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de l'historique...</p>
      </div>
    );
  }

  if (!historyData) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <p className="text-gray-600 text-lg">Aucun historique disponible.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Filtres</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
            <select
              value={historyFilter.status || ''}
              onChange={(e) => setHistoryFilter({ ...historyFilter, status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="completed">Terminé</option>
              <option value="passed">Passé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={historyFilter.date || ''}
              onChange={(e) => setHistoryFilter({ ...historyFilter, date: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setHistoryFilter({})}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">Historique des Entretiens</h3>
        </div>
        
        {historyData.interviews.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            Aucun entretien trouvé avec ces filtres.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {historyData.interviews.map((interview: InterviewHistory) => (
              <div key={interview.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{interview.studentName}</h4>
                      {getStatusBadge(interview.status)}
                      {/* Show "NEW" badge for interviews from the last 24 hours */}
                      {interview.activityDate && new Date(interview.activityDate) > new Date(Date.now() - 24 * 60 * 60 * 1000) && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                          NOUVEAU
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        {getOpportunityTypeBadge(interview.opportunityType)}
                        {getPriorityBadge('student', interview.studentStatus)}
                      </div>
                      {interview.duration && (
                        <span>Durée: {interview.duration} min</span>
                      )}
                      <span>Position: #{interview.queuePosition}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    {interview.startedAt && (
                      <div>Démarré: {new Date(interview.startedAt).toLocaleString('fr-FR')}</div>
                    )}
                    {interview.completedAt && (
                      <div>Terminé: {new Date(interview.completedAt).toLocaleString('fr-FR')}</div>
                    )}
                    {interview.passedAt && (
                      <div>Passé: {new Date(interview.passedAt).toLocaleString('fr-FR')}</div>
                    )}
                    {interview.activityDate && (
                      <div className="font-medium text-gray-700">
                        Dernière activité: {new Date(interview.activityDate).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
                </div>
              )}

        {/* Pagination */}
        {historyData.pagination.pages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {historyData.pagination.page} sur {historyData.pagination.pages} 
                ({historyData.pagination.total} entretiens au total)
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setHistoryPage(historyPage - 1)}
                  disabled={historyPage === 1}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition-colors"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setHistoryPage(historyPage + 1)}
                  disabled={historyPage === historyData.pagination.pages}
                  className="px-3 py-2 text-sm bg-[#2880CA] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1e5f8a] transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
}