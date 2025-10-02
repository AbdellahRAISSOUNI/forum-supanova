'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
            <h1 className="text-3xl font-bold">Entreprises Participantes</h1>
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
          <h2 className="text-2xl font-semibold text-gray-800 mb-2">Découvrez les Entreprises</h2>
          <p className="text-gray-600">
            Explorez les entreprises participantes au forum et préparez-vous pour vos entretiens.
          </p>
        </div>

        {/* Companies Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2880CA] mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des entreprises...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entreprise disponible</h3>
            <p className="text-gray-600">Les entreprises seront bientôt ajoutées par l'administration.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div
                key={company._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-200"
              >
                {/* Company Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{company.name}</h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      {company.sector}
                    </span>
                  </div>
                </div>

                {/* Company Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    <span>Salle: <strong>{company.room}</strong></span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Durée: <strong>{company.estimatedInterviewDuration} minutes</strong></span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span>File d'attente: <strong>{company.queueLength || 0} personne(s)</strong></span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2880CA] hover:text-[#1e5f8a] transition-colors"
                    >
                      Visiter le site web
                    </a>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t border-gray-200">
                  {company.studentInQueue ? (
                    <div className="text-center">
                      <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg font-semibold mb-2">
                        Dans la file - Position {company.studentInQueue.position}
                      </div>
                      <p className="text-xs text-gray-500">
                        Vous êtes déjà dans cette file d'attente
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => openJoinModal(company)}
                      className="w-full bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      Rejoindre la File
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Section */}
        {companies.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistiques</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#2880CA] mb-2">{companies.length}</div>
                <div className="text-sm text-gray-600">Entreprises participantes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#2880CA] mb-2">
                  {Math.round(companies.reduce((acc, company) => acc + company.estimatedInterviewDuration, 0) / companies.length)}
                </div>
                <div className="text-sm text-gray-600">Durée moyenne d'entretien</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[#2880CA] mb-2">
                  {new Set(companies.map(c => c.sector)).size}
                </div>
                <div className="text-sm text-gray-600">Secteurs représentés</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Join Queue Modal */}
      {isModalOpen && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Rejoindre la file d'attente
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  Entreprise: <strong>{selectedCompany.name}</strong>
                </p>
                <p className="text-gray-600 mb-4">
                  Salle: <strong>{selectedCompany.room}</strong>
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="opportunityType" className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'opportunité
                </label>
                <select
                  id="opportunityType"
                  value={selectedOpportunityType}
                  onChange={(e) => setSelectedOpportunityType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA]"
                >
                  <option value="pfa">PFA (Projet de Fin d'Année)</option>
                  <option value="pfe">PFE (Projet de Fin d'Études)</option>
                  <option value="employment">Emploi</option>
                  <option value="observation">Stage d'observation</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleJoinQueue}
                  disabled={isJoining}
                  className="px-4 py-2 bg-[#2880CA] text-white rounded-md hover:bg-[#1e5f8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Connexion...' : 'Rejoindre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
