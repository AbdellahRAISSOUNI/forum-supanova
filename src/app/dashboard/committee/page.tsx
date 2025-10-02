'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface QueueData {
  company: {
    _id: string;
    name: string;
    room: string;
    estimatedInterviewDuration: number;
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

export default function CommitteeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [previousQueueSize, setPreviousQueueSize] = useState(0);
  const [previousWaitingQueue, setPreviousWaitingQueue] = useState<string[]>([]);

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
      toast.info(`Étudiant sorti de la file d'attente. Total: ${currentQueueSize}`);
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
  }, [queueData, previousQueueSize, previousWaitingQueue]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2880CA] text-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Files d'Attente</h1>
            <p className="text-lg opacity-90">
              {queueData?.company.name} - Salle {queueData?.company.room}
            </p>
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
        {message && (
          <div className={`p-4 rounded-md mb-6 ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {!queueData ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 text-lg">Aucune file d'attente disponible pour votre salle.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Current Interview Section */}
            {queueData.currentInterview && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-green-800 mb-6">Entretien en Cours</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {queueData.currentInterview.studentName}
                    </h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 font-medium">Type:</span>
                          {getOpportunityTypeBadge(queueData.currentInterview.opportunityType)}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 font-medium">Statut:</span>
                          {getPriorityBadge(queueData.currentInterview.role, queueData.currentInterview.studentStatus)}
                        </div>
                      </div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-green-600 mb-4">
                      {formatTime(elapsedTime)}
                    </div>
                    <button
                      onClick={() => endInterview(queueData.currentInterview!.interviewId)}
                      disabled={isActionLoading}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {isActionLoading ? 'Terminaison...' : 'Terminer l\'Entretien'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Next Up Section */}
            {queueData.nextUp && !queueData.currentInterview && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-blue-800 mb-6">Prochain en File</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {queueData.nextUp.studentName}
                    </h3>
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        <span className="font-medium">Position:</span> #{queueData.nextUp.position}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 font-medium">Type:</span>
                        {getOpportunityTypeBadge(queueData.nextUp.opportunityType)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 font-medium">Statut:</span>
                        {getPriorityBadge(queueData.nextUp.role, queueData.nextUp.studentStatus)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => startInterview(queueData.nextUp!.interviewId)}
                      disabled={isActionLoading}
                      className="w-full bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {isActionLoading ? 'Démarrage...' : 'Démarrer l\'Entretien'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting Queue Section */}
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">File d'Attente</h2>
                <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <span className="font-medium">Système intelligent :</span> 3 Comité → 2 Externes → 2 ENSA
                </div>
              </div>
              
              {queueData.waitingQueue.length === 0 ? (
                <p className="text-gray-600 text-center py-8">Aucun étudiant en attente</p>
              ) : (
                <div className="space-y-4">
                  {queueData.waitingQueue.map((student) => (
                    <div key={student.interviewId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#2880CA] text-white rounded-full flex items-center justify-center font-bold">
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
                      <div className="text-sm text-gray-500">
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
                  
                  <div className="border-t pt-4 text-center">
                    <p className="text-lg font-semibold text-gray-800">
                      Total en attente: {queueData.totalWaiting} étudiant{queueData.totalWaiting !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 px-4 sm:px-8 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Espace Comité.
          </p>
        </div>
      </footer>
    </div>
  );
}