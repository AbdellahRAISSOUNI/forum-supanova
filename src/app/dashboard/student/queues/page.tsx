'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [leavingQueueId, setLeavingQueueId] = useState<string | null>(null);
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
    if (queues.length === 0) return;

    queues.forEach((queue: Queue) => {
      const previousPosition = previousPositions[queue._id];
      
      if (previousPosition && previousPosition !== queue.position) {
        if (queue.position < previousPosition) {
          toast.success(`Vous avez avancé ! Maintenant position #${queue.position}`);
        }
      }

      // Update position banner based on current position
      if (queue.position === 1 && queue.status === 'waiting') {
        setShowPositionBanner({ queueId: queue._id, position: queue.position, room: queue.room });
      } else if (queue.position <= 3 && queue.status === 'waiting') {
        setShowPositionBanner({ queueId: queue._id, position: queue.position, room: queue.room });
      } else {
        setShowPositionBanner(null);
      }
    });

    // Update previous positions
    const newPreviousPositions: Record<string, number> = {};
    queues.forEach((queue: Queue) => {
      newPreviousPositions[queue._id] = queue.position;
    });
    setPreviousPositions(newPreviousPositions);
  }, [queues, previousPositions]);

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
            <h1 className="text-3xl font-bold">Mes Files d'Attente</h1>
            <p className="text-lg opacity-90">Bienvenue, {session.user.firstName} {session.user.name}!</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-white text-[#2880CA] font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-8">
        {/* Position Banner */}
        {showPositionBanner && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            showPositionBanner.position === 1 
              ? 'bg-green-50 border-green-200 text-green-800 animate-pulse'
              : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  showPositionBanner.position === 1 ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                }`}>
                  #{showPositionBanner.position}
                </div>
                <div>
                  {showPositionBanner.position === 1 ? (
                    <p className="font-semibold text-lg">Vous êtes le prochain ! Direction Salle {showPositionBanner.room}</p>
                  ) : (
                    <p className="font-semibold text-lg">Votre tour arrive bientôt ! Position #{showPositionBanner.position}</p>
                  )}
                </div>
              </div>
              {showPositionBanner.position > 3 && (
                <button
                  onClick={() => setShowPositionBanner(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Vos Files d'Attente Actives</h2>
          <p className="text-gray-600">
            Consultez vos positions dans les files d'attente des entreprises.
          </p>
        </div>

        {/* Queues List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2880CA] mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des files d'attente...</p>
          </div>
        ) : queues.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune file d'attente</h3>
            <p className="text-gray-600 mb-4">Vous n'avez rejoint aucune file d'attente pour le moment.</p>
            <button
              onClick={() => router.push('/dashboard/student/companies')}
              className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Découvrir les entreprises
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {queues.map((queue) => (
              <div key={queue._id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{queue.companyName}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        </svg>
                        Salle {queue.room}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {queue.estimatedDuration} min
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        {getOpportunityTypeLabel(queue.opportunityType)}
                      </span>
                      {getPriorityBadge(session.user.role, session.user.studentStatus || 'external')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(queue.status)}`}>
                      {getStatusLabel(queue.status)}
                    </span>
                  </div>
                </div>

                {/* Position and Progress */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Votre position</span>
                    <div className="flex items-center space-x-2">
                      {queue.status === 'in_progress' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full animate-pulse">
                          EN COURS
                        </span>
                      )}
                      {queue.position === 1 && queue.status === 'waiting' && (
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full animate-pulse">
                          VOTRE TOUR !
                        </span>
                      )}
                      <span className={`px-3 py-1 text-sm font-bold rounded-full ${getPositionBadgeColor(queue.position)}`}>
                        #{queue.position}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        queue.status === 'in_progress' 
                          ? 'bg-green-500' 
                          : queue.position === 1 && queue.status === 'waiting'
                          ? 'bg-blue-500'
                          : 'bg-[#2880CA]'
                      }`}
                      style={{ width: `${calculateProgress(queue.position, queue.position + 5)}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500">
                      Rejoint le {new Date(queue.joinedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-gray-600 font-medium">
                      Temps d'attente estimé: {getEstimatedWaitTime(queue.position, queue.estimatedDuration)} min
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  {queue.status === 'in_progress' ? (
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-semibold">
                      Entretien en cours
                    </div>
                  ) : (
                    <button
                      onClick={() => handleLeaveQueue(queue._id)}
                      disabled={leavingQueueId === queue._id || queue.status !== 'waiting'}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {leavingQueueId === queue._id ? 'Sortie...' : 'Quitter la file'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Priority System Legend */}
        {queues.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Système de Priorité</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Catégories de Priorité</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">Comité</span>
                    <span className="text-gray-600">Priorité la plus élevée</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">ENSA</span>
                    <span className="text-gray-600">Étudiants ENSA</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">Externe</span>
                    <span className="text-gray-600">Étudiants externes</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-blue-700 mb-2">Types d'Opportunité</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">PFA/PFE</span>
                    <span className="text-green-600 font-medium">Priorité 1</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Emploi</span>
                    <span className="text-yellow-600 font-medium">Priorité 2</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Stage d'observation</span>
                    <span className="text-orange-600 font-medium">Priorité 3</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Pattern d'alternance :</strong> 3 Comité → 2 Externes → 2 ENSA → répéter
              </p>
            </div>
          </div>
        )}

        {/* Auto-refresh indicator */}
        {queues.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              🔄 Mise à jour automatique toutes les 5 secondes
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 px-4 sm:px-8 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
