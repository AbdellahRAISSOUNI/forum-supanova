'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [leavingQueueId, setLeavingQueueId] = useState<string | null>(null);

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

    fetchQueues();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchQueues, 10000);
    return () => clearInterval(interval);
  }, [session, status, router]);

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/student/queues');
      if (response.ok) {
        const data = await response.json();
        setQueues(data.queues);
      } else {
        setMessage({ type: 'error', text: 'Erreur lors du chargement des files d\'attente' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQueue = async (queueId: string) => {
    setLeavingQueueId(queueId);
    setMessage(null);

    try {
      const response = await fetch(`/api/student/queue/${queueId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchQueues(); // Refresh the queues list
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la sortie de la file' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
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
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (position: number, totalInQueue: number) => {
    if (totalInQueue === 0) return 100;
    return Math.max(0, Math.min(100, ((totalInQueue - position + 1) / totalInQueue) * 100));
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
                    <span className="text-lg font-bold text-[#2880CA]">#{queue.position}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-[#2880CA] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateProgress(queue.position, queue.position + 5)}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Rejoint le {new Date(queue.joinedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Action Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleLeaveQueue(queue._id)}
                    disabled={leavingQueueId === queue._id || queue.status !== 'waiting'}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {leavingQueueId === queue._id ? 'Sortie...' : 'Quitter la file'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Auto-refresh indicator */}
        {queues.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              🔄 Mise à jour automatique toutes les 10 secondes
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
