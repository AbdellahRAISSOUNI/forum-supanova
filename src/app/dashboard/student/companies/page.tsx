'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import RoomIndicator from '@/components/RoomIndicator';
import RoomStatusIndicator from '@/components/RoomStatusIndicator';
import { ArrowLeftIcon, BuildingOfficeIcon, ClockIcon, GlobeAltIcon, QueueListIcon } from '@heroicons/react/24/outline';

interface Company {
  _id: string;
  name: string;
  sector: string;
  website: string;
  room: string;
  estimatedInterviewDuration: number;
  queueLength?: number;
  studentInQueue?: {
    position: number;
    status: string;
  } | null;
}

export default function StudentCompaniesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedOpportunityType, setSelectedOpportunityType] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/student/companies');
      return;
    }

    if (session.user.role !== 'student') {
      router.push('/');
      return;
    }

    fetchCompanies();
  }, [session, status, router]);

  const openJoinModal = (company: Company) => {
    setSelectedCompany(company);
    setSelectedOpportunityType(session?.user.opportunityType || 'pfa');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCompany(null);
    setSelectedOpportunityType('');
  };

  const handleJoinQueue = async () => {
    if (!selectedCompany) return;

    setIsJoining(true);
    setMessage(null);

    try {
      const response = await fetch('/api/student/queue/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: selectedCompany._id,
          opportunityType: selectedOpportunityType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `${data.message} Position: ${data.position}` 
        });
        closeModal();
        fetchCompanies(); // Refresh the companies list
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la connexion à la file' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsJoining(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.companies);
      } else {
        setMessage({ type: 'error', text: 'Erreur lors du chargement des entreprises' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
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
      {/* Modern Header */}
      <header className="bg-[#2880CA] backdrop-blur-md border-b border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/student')}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Entreprises Participantes</h1>
                <p className="text-blue-100">Découvrez les entreprises du forum</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors text-sm sm:text-base"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Découvrez les Entreprises</h2>
          <p className="text-slate-600 text-lg">
            Explorez les entreprises participantes au forum et préparez-vous pour vos entretiens.
          </p>
        </div>

        {/* Companies Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-[#2880CA] mx-auto"></div>
            <p className="mt-4 text-slate-600 font-medium">Chargement des entreprises...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BuildingOfficeIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune entreprise disponible</h3>
            <p className="text-slate-600">Les entreprises seront bientôt ajoutées par l'administration.</p>
          </div>
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:space-y-0">
            {companies.map((company) => (
              <div
                key={company._id}
                className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 md:p-6 hover:shadow-xl transition-all duration-300"
              >
                {/* Mobile-First Compact Layout */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-slate-900 truncate">{company.name}</h3>
                    <div className="flex items-center mt-1">
                      <BuildingOfficeIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-slate-500 flex-shrink-0" />
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {company.sector}
                      </span>
                    </div>
                  </div>
                  <RoomIndicator room={company.room} size="sm" />
                </div>

                {/* Compact Info Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center text-xs md:text-sm text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg">
                    <ClockIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{company.estimatedInterviewDuration}min</span>
                  </div>
                  <div className="flex items-center text-xs md:text-sm text-slate-600 bg-slate-50 px-2 py-1.5 rounded-lg">
                    <QueueListIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{company.queueLength || 0} en attente</span>
                  </div>
                </div>

                {/* Website Link - Mobile Optimized */}
                {company.website && (
                  <div className="mb-4">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-xs md:text-sm text-[#2880CA] hover:text-blue-600 transition-colors bg-blue-50 px-2 py-1.5 rounded-lg"
                    >
                      <GlobeAltIcon className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 flex-shrink-0" />
                      <span className="truncate">Site web</span>
                    </a>
                  </div>
                )}

                {/* Action Button - Mobile Optimized */}
                <div className="pt-3 border-t border-slate-200">
                  {company.studentInQueue ? (
                    <div className="text-center">
                      <div className="bg-emerald-100 text-emerald-800 px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl font-semibold text-sm md:text-base border border-emerald-200">
                        Dans la file - Position {company.studentInQueue.position}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Vous êtes déjà dans cette file d'attente
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => openJoinModal(company)}
                      className="w-full bg-gradient-to-r from-[#2880CA] to-blue-600 hover:from-blue-600 hover:to-[#2880CA] text-white font-semibold py-2.5 md:py-3 px-3 md:px-4 rounded-lg md:rounded-xl transition-all duration-300 text-sm md:text-base shadow-lg hover:shadow-xl"
                    >
                      Rejoindre la File
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Room Status Section */}
        {companies.length > 0 && (
          <div className="mt-8 md:mt-12">
            <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-4 md:mb-6">Statut des Salles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {companies.map((company) => (
                <RoomStatusIndicator 
                  key={company._id}
                  roomId={company._id}
                  compact={true}
                  refreshInterval={15000}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats Section - Mobile Optimized */}
        {companies.length > 0 && (
          <div className="mt-8 md:mt-12 bg-white/70 backdrop-blur-sm rounded-xl md:rounded-2xl shadow-xl border border-white/20 p-4 md:p-8">
            <h3 className="text-lg md:text-2xl font-bold text-slate-900 mb-4 md:mb-6">Statistiques</h3>
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-[#2880CA] mb-1 md:mb-2">{companies.length}</div>
                <div className="text-xs md:text-base text-slate-600 font-medium">Entreprises</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-[#2880CA] mb-1 md:mb-2">
                  {Math.round(companies.reduce((acc, company) => acc + company.estimatedInterviewDuration, 0) / companies.length)}
                </div>
                <div className="text-xs md:text-base text-slate-600 font-medium">Durée moy.</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-[#2880CA] mb-1 md:mb-2">
                  {new Set(companies.map(c => c.sector)).size}
                </div>
                <div className="text-xs md:text-base text-slate-600 font-medium">Secteurs</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Join Queue Modal */}
      {isModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full border border-white/20">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">
                  Rejoindre la file d'attente
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-slate-600 mb-2">
                  Entreprise: <strong className="text-slate-900">{selectedCompany.name}</strong>
                </p>
                <p className="text-slate-600 mb-4">
                  Salle: <strong className="text-slate-900">{selectedCompany.room}</strong>
                </p>
              </div>

              <div className="mb-8">
                <label htmlFor="opportunityType" className="block text-sm font-semibold text-slate-700 mb-3">
                  Type d'opportunité
                </label>
                <select
                  id="opportunityType"
                  value={selectedOpportunityType}
                  onChange={(e) => setSelectedOpportunityType(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2880CA] focus:border-transparent transition-all text-slate-900 bg-white"
                >
                  <option value="pfa" className="text-slate-900">PFA (Projet de Fin d'Année)</option>
                  <option value="pfe" className="text-slate-900">PFE (Projet de Fin d'Études)</option>
                  <option value="employment" className="text-slate-900">Emploi</option>
                  <option value="observation" className="text-slate-900">Stage d'observation</option>
                </select>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-3 text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleJoinQueue}
                  disabled={isJoining}
                  className="px-6 py-3 bg-gradient-to-r from-[#2880CA] to-blue-600 hover:from-blue-600 hover:to-[#2880CA] text-white rounded-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium shadow-lg"
                >
                  {isJoining ? 'Connexion...' : 'Rejoindre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
