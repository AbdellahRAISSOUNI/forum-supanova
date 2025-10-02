'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Company {
  _id: string;
  name: string;
  sector: string;
  room: string;
}

export default function CommitteeDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [assignedCompany, setAssignedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/committee');
      return;
    }

    if (session.user.role !== 'committee') {
      router.push('/'); // Redirect non-committee members
      return;
    }

    fetchAssignedCompany();
  }, [session, status, router]);

  const fetchAssignedCompany = async () => {
    if (!session?.user.assignedRoom) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        const company = data.companies.find((c: Company) => c.room === session.user.assignedRoom);
        setAssignedCompany(company || null);
      }
    } catch (error) {
      console.error('Error fetching assigned company:', error);
    } finally {
      setIsLoading(false);
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
    return null; // Or a custom unauthorized component
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2880CA] text-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tableau de Bord Comité</h1>
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
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Bienvenue, {session.user.firstName} {session.user.name} !
            </h2>
            <p className="text-gray-600">
              Vous êtes connecté en tant que membre du comité.
            </p>
          </div>

          {/* Assigned Room Information */}
          <div className="bg-blue-50 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations d'Assignation</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Salle Assignée:</p>
                <p className="text-lg font-medium text-gray-900">
                  {session.user.assignedRoom || 'Aucune salle assignée'}
                </p>
              </div>
              {assignedCompany && (
                <div>
                  <p className="text-sm text-gray-600">Entreprise:</p>
                  <p className="text-lg font-medium text-gray-900">{assignedCompany.name}</p>
                  <p className="text-sm text-gray-600">{assignedCompany.sector}</p>
                </div>
              )}
            </div>
          </div>

          {/* Queue Management Notice */}
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-yellow-800">Gestion des Files d'Attente</h4>
                <p className="text-yellow-700 mt-1">
                  La gestion des files d'attente pour votre salle sera disponible prochainement.
                </p>
              </div>
            </div>
          </div>

          {/* Committee Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Gestion des Étudiants</h3>
                  <p className="text-gray-600">Gérer les comptes étudiants</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Files d'Attente</h3>
                  <p className="text-gray-600">Gérer les files d'attente</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Statistiques</h3>
                  <p className="text-gray-600">Voir les rapports et statistiques</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="border-t pt-8 mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Activité récente</h3>
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-600">Aucune activité récente à afficher</p>
            </div>
          </div>
        </div>
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