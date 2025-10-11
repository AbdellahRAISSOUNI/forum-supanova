'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  ExclamationTriangleIcon,
  PauseIcon,
  PlayIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface QueueManagementData {
  company: {
    _id: string;
    name: string;
    room: string;
    estimatedDuration: number;
    isQueuePaused?: boolean;
    isEmergencyMode?: boolean;
  };
  currentInterview: {
    interviewId: string;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    studentStatus: string;
    opportunityType: string;
    startedAt: string;
  } | null;
  waitingQueue: Array<{
    interviewId: string;
    position: number;
    studentName: string;
    studentEmail: string;
    studentPhone: string;
    studentStatus: string;
    opportunityType: string;
    joinedAt: string;
    priorityScore: number;
    estimatedWaitTime: number;
  }>;
  statistics: {
    totalWaiting: number;
    averagePriorityScore: number;
    oldestWaitTime: string | null;
    todayCompleted: number;
    averageDuration: number;
    estimatedNextCall: number;
  };
}

interface AdvancedQueueManagementProps {
  onQueueUpdate?: () => void;
  compact?: boolean;
}

export default function AdvancedQueueManagement({ onQueueUpdate, compact = false }: AdvancedQueueManagementProps) {
  const [queueData, setQueueData] = useState<QueueManagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const fetchQueueData = async () => {
    try {
      const response = await fetch('/api/committee/queue/management');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données de la file');
      }
      const data = await response.json();
      console.log('Queue data fetched:', data.queueManagement.company); // Debug log
      setQueueData(data.queueManagement);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      toast.error('Erreur lors du chargement de la file d\'attente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleQueueAction = async (action: string, interviewId?: string, newPosition?: number) => {
    setActionLoading(action);
    try {
      const response = await fetch('/api/committee/queue/management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          interviewId,
          newPosition,
          notes: action === 'add_notes' ? notes : undefined
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        // Force immediate refresh of queue data to get updated status
        await fetchQueueData();
        onQueueUpdate?.();
        if (action === 'add_notes') {
          setShowNotes(null);
          setNotes('');
        }
      } else {
        toast.error(data.error || 'Erreur lors de l\'action');
      }
    } catch (error) {
      console.error('Error performing queue action:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setActionLoading(null);
    }
  };

  const moveStudent = (interviewId: string, direction: 'up' | 'down') => {
    if (!queueData) return;
    
    const currentIndex = queueData.waitingQueue.findIndex(s => s.interviewId === interviewId);
    if (currentIndex === -1) return;
    
    const newPosition = direction === 'up' 
      ? Math.max(1, currentIndex) 
      : Math.min(queueData.waitingQueue.length, currentIndex + 2);
    
    handleQueueAction('reorder', interviewId, newPosition);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!queueData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600 text-center">Aucune donnée de file d'attente disponible.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800">Gestion de File</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">Active</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-blue-50 p-2 rounded">
            <div className="flex items-center space-x-1">
              <UserGroupIcon className="h-3 w-3 text-blue-600" />
              <span className="text-blue-800">En attente</span>
            </div>
            <p className="text-lg font-bold text-blue-600">{queueData.statistics.totalWaiting}</p>
          </div>
          
          <div className="bg-green-50 p-2 rounded">
            <div className="flex items-center space-x-1">
              <ClockIcon className="h-3 w-3 text-green-600" />
              <span className="text-green-800">Prochain</span>
            </div>
            <p className="text-lg font-bold text-green-600">{queueData.statistics.estimatedNextCall}min</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Queue Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Statistiques de la File</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <UserGroupIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">En Attente</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{queueData.statistics.totalWaiting}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Prochain Appel</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{queueData.statistics.estimatedNextCall} min</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ChartBarIcon className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Aujourd'hui</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{queueData.statistics.todayCompleted}</p>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ClockIcon className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Durée Moy.</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{queueData.statistics.averageDuration} min</p>
          </div>
        </div>
      </div>

      {/* Queue Controls */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Contrôles de File</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Queue Status Toggle Button */}
          <button
            onClick={() => handleQueueAction(queueData.company.isQueuePaused ? 'resume_queue' : 'pause_queue')}
            disabled={actionLoading === 'pause_queue' || actionLoading === 'resume_queue'}
            className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${
              queueData.company.isQueuePaused
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg transform hover:scale-105'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg transform hover:scale-105'
            }`}
          >
            {queueData.company.isQueuePaused ? (
              <>
                <PlayIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Reprendre File</span>
              </>
            ) : (
              <>
                <PauseIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Pause File</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => handleQueueAction('emergency_mode')}
            disabled={actionLoading === 'emergency_mode'}
            className="flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm">Mode Urgence</span>
          </button>
          
          <button
            onClick={() => handleQueueAction('clear_queue')}
            disabled={actionLoading === 'clear_queue'}
            className="flex items-center justify-center space-x-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <span className="text-sm">Vider File</span>
          </button>
        </div>
        
        {/* Queue Status Indicator */}
        <div className="mt-4 p-3 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                queueData.company.isQueuePaused 
                  ? 'bg-yellow-500 animate-pulse' 
                  : 'bg-green-500 animate-pulse'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                Statut de la File:
              </span>
              <span className={`text-sm font-bold ${
                queueData.company.isQueuePaused 
                  ? 'text-yellow-600' 
                  : 'text-green-600'
              }`}>
                {queueData.company.isQueuePaused ? 'En Pause' : 'Active'}
              </span>
            </div>
            {queueData.company.isEmergencyMode && (
              <div className="flex items-center space-x-1 bg-red-100 text-red-800 px-2 py-1 rounded-full">
                <ExclamationTriangleIcon className="h-3 w-3" />
                <span className="text-xs font-medium">Mode Urgence</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Interview Details */}
      {queueData.currentInterview && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-green-800 mb-4">Entretien en Cours</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">{queueData.currentInterview.studentName}</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p>📧 {queueData.currentInterview.studentEmail}</p>
                <p>📞 {queueData.currentInterview.studentPhone}</p>
                <p>🎯 {queueData.currentInterview.opportunityType}</p>
                <p>👤 {queueData.currentInterview.studentStatus}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">
                Démarré: {new Date(queueData.currentInterview.startedAt).toLocaleTimeString('fr-FR')}
              </p>
              <button
                onClick={() => setShowNotes(queueData.currentInterview!.interviewId)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting Queue with Management */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">File d'Attente - Gestion Avancée</h3>
        </div>
        
        {queueData.waitingQueue.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            Aucun étudiant en attente
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {queueData.waitingQueue.map((student, index) => (
              <div key={student.interviewId} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-[#2880CA] text-white rounded-full flex items-center justify-center font-bold">
                      #{student.position}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{student.studentName}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {student.opportunityType}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                          {student.studentStatus}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>📧 {student.studentEmail}</span>
                        <span>📞 {student.studentPhone}</span>
                        <span>⏱️ {student.estimatedWaitTime} min</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => moveStudent(student.interviewId, 'up')}
                      disabled={actionLoading === 'reorder' || student.position === 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => moveStudent(student.interviewId, 'down')}
                      disabled={actionLoading === 'reorder' || student.position === queueData.waitingQueue.length}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleQueueAction('priority_override', student.interviewId)}
                      disabled={actionLoading === 'priority_override'}
                      className="p-2 text-yellow-500 hover:text-yellow-600 disabled:opacity-50"
                      title="Priorité élevée"
                    >
                      <ExclamationTriangleIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => setShowNotes(student.interviewId)}
                      className="p-2 text-blue-500 hover:text-blue-600"
                      title="Ajouter des notes"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {showNotes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Ajouter des Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes sur l'étudiant (ex: besoins spéciaux, préférences, etc.)"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent"
            />
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => handleQueueAction('add_notes', showNotes)}
                disabled={actionLoading === 'add_notes'}
                className="flex-1 bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'add_notes' ? 'Ajout...' : 'Ajouter'}
              </button>
              <button
                onClick={() => {
                  setShowNotes(null);
                  setNotes('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
