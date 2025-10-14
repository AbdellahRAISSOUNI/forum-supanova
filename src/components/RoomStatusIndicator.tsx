'use client';

import { useState, useEffect } from 'react';
import { 
  ComputerDesktopIcon, 
  MicrophoneIcon, 
  CameraIcon, 
  LightBulbIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface RoomStatus {
  roomId: string;
  roomName: string;
  companyName: string;
  status: 'available' | 'in_use' | 'waiting' | 'maintenance';
  statusMessage: string;
  estimatedDuration: number;
  currentInterview: {
    studentName: string;
    startedAt: string;
  } | null;
  committeeMember: {
    name: string;
    email: string;
  } | null;
  queueStats: {
    totalWaiting: number;
    estimatedWaitTime: number;
  };
  equipmentStatus: {
    computer: 'operational' | 'warning' | 'error';
    microphone: 'operational' | 'warning' | 'error';
    camera: 'operational' | 'warning' | 'error';
    lighting: 'operational' | 'warning' | 'error';
  };
  lastUpdated: string;
}

interface RoomStatusIndicatorProps {
  roomId?: string;
  showDetails?: boolean;
  compact?: boolean;
  refreshInterval?: number;
}

export default function RoomStatusIndicator({ 
  roomId, 
  showDetails = true, 
  compact = false,
  refreshInterval = 10000 
}: RoomStatusIndicatorProps) {
  const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomStatus = async () => {
    try {
      const url = roomId ? `/api/rooms/status?room=${roomId}` : '/api/rooms/status';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du statut de la salle');
      }
      
      const data = await response.json();
      const status = roomId ? data.roomStatus : data.roomStatuses[0];
      setRoomStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomStatus();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchRoomStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [roomId, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'in_use':
        return 'bg-red-500';
      case 'waiting':
        return 'bg-yellow-500';
      case 'maintenance':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'in_use':
        return 'En cours';
      case 'waiting':
        return 'En attente';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Inconnu';
    }
  };

  const getEquipmentIcon = (equipment: string, status: string) => {
    const iconClass = `h-4 w-4 ${status === 'operational' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`;
    
    switch (equipment) {
      case 'computer':
        return <ComputerDesktopIcon className={iconClass} />;
      case 'microphone':
        return <MicrophoneIcon className={iconClass} />;
      case 'camera':
        return <CameraIcon className={iconClass} />;
      case 'lighting':
        return <LightBulbIcon className={iconClass} />;
      default:
        return <CheckCircleIcon className={iconClass} />;
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-4 ${compact ? 'p-3' : 'p-6'}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !roomStatus) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${compact ? 'p-3' : 'p-6'}`}>
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <p className="text-red-800 text-sm">{error || 'Impossible de charger le statut de la salle'}</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-white/95 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-lg border border-white/40 p-3 sm:p-4 hover:shadow-xl transition-all duration-300 group">
        {/* Header with Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(roomStatus.status)} shadow-sm`}></div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{roomStatus.roomName}</h3>
              <p className="text-xs sm:text-sm text-slate-600 truncate">{roomStatus.companyName}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs sm:text-sm font-semibold px-2 py-1 rounded-full ${
              roomStatus.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
              roomStatus.status === 'in_use' ? 'bg-red-100 text-red-800' :
              roomStatus.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {getStatusText(roomStatus.status)}
            </div>
          </div>
        </div>
        
        {/* Mobile App-style Info Cards */}
        <div className="space-y-2">
          {/* Committee Member */}
          {roomStatus.committeeMember && (
            <div className="bg-gradient-to-r from-emerald-50/90 to-emerald-100/90 border border-emerald-200/50 rounded-lg p-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">Membre du comité</p>
                  <p className="text-xs text-emerald-700 truncate">{roomStatus.committeeMember.name}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Queue Information */}
          {roomStatus.queueStats.totalWaiting > 0 && (
            <div className="bg-gradient-to-r from-yellow-50/90 to-yellow-100/90 border border-yellow-200/50 rounded-lg p-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-yellow-800">File d'attente</p>
                  <p className="text-xs text-yellow-700">
                    {roomStatus.queueStats.totalWaiting} étudiant{roomStatus.queueStats.totalWaiting > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Current Interview */}
          {roomStatus.currentInterview && (
            <div className="bg-gradient-to-r from-blue-50/90 to-blue-100/90 border border-blue-200/50 rounded-lg p-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-800">Entretien en cours</p>
                  <p className="text-xs text-blue-700 truncate">{roomStatus.currentInterview.studentName}</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Last Updated */}
        <div className="mt-3 pt-2 border-t border-slate-200/50">
          <p className="text-[10px] text-slate-500 text-center">
            Mis à jour: {new Date(roomStatus.lastUpdated).toLocaleTimeString('fr-FR')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{roomStatus.roomName}</h3>
          <p className="text-sm text-gray-600">{roomStatus.companyName}</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(roomStatus.status)} animate-pulse`}></div>
          <span className="text-sm font-medium text-gray-700">{getStatusText(roomStatus.status)}</span>
        </div>
      </div>

      {showDetails && (
        <>
          {/* Current Interview */}
          {roomStatus.currentInterview && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <UserIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Entretien en cours</span>
              </div>
              <p className="text-sm text-blue-700">{roomStatus.currentInterview.studentName}</p>
              <p className="text-xs text-blue-600">
                Démarré: {new Date(roomStatus.currentInterview.startedAt).toLocaleTimeString('fr-FR')}
              </p>
            </div>
          )}

          {/* Queue Information */}
          {roomStatus.queueStats.totalWaiting > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <ClockIcon className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">File d'attente</span>
              </div>
              <p className="text-sm text-yellow-700">
                {roomStatus.queueStats.totalWaiting} étudiant{roomStatus.queueStats.totalWaiting > 1 ? 's' : ''} en attente
              </p>
              {roomStatus.queueStats.estimatedWaitTime > 0 && (
                <p className="text-xs text-yellow-600">
                  Temps d'attente estimé: {roomStatus.queueStats.estimatedWaitTime} min
                </p>
              )}
            </div>
          )}

          {/* Committee Member */}
          {roomStatus.committeeMember && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2 mb-1">
                <UserIcon className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Membre du comité</span>
              </div>
              <p className="text-sm text-green-700">{roomStatus.committeeMember.name}</p>
            </div>
          )}

          {/* Equipment Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(roomStatus.equipmentStatus).map(([equipment, status]) => (
              <div key={equipment} className="text-center p-2 bg-gray-50 rounded-lg">
                {getEquipmentIcon(equipment, status)}
                <p className="text-xs font-medium text-gray-700 mt-1 capitalize">{equipment}</p>
                <p className={`text-xs ${
                  status === 'operational' ? 'text-green-600' : 
                  status === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {status === 'operational' ? 'OK' : status === 'warning' ? '⚠' : '✗'}
                </p>
              </div>
            ))}
          </div>

          {/* Last Updated */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            Mis à jour: {new Date(roomStatus.lastUpdated).toLocaleTimeString('fr-FR')}
          </div>
        </>
      )}
    </div>
  );
}
