'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/student');
      return;
    }

    if (session.user.role !== 'student') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

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
            <h1 className="text-3xl font-bold">Tableau de Bord Étudiant</h1>
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
              Vous êtes connecté en tant qu&apos;étudiant {session.user.studentStatus === 'ensa' ? 'ENSA' : 'externe'}.
            </p>
            <p className="text-gray-600 mt-2">
              Type d&apos;opportunité: {session.user.opportunityType === 'pfa' ? 'PFA (Projet de Fin d\'Année)' :
                session.user.opportunityType === 'pfe' ? 'PFE (Projet de Fin d\'Études)' :
                session.user.opportunityType === 'employment' ? 'Emploi' : 'Stage d\'observation'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Link href="/dashboard/student/companies" className="bg-blue-50 p-6 rounded-lg hover:bg-blue-100 transition-colors">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Entreprises</h3>
                  <p className="text-gray-600">Découvrir les entreprises et rejoindre les files</p>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/student/queues" className="bg-green-50 p-6 rounded-lg hover:bg-green-100 transition-colors">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Mes Files d'Attente</h3>
                  <p className="text-gray-600">Consulter vos positions dans les files</p>
                </div>
              </div>
            </Link>

            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Mon Profil</h3>
                  <p className="text-gray-600">Gérer vos informations personnelles</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="border-t pt-8">
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
            © 2025 ENSA Tétouan - Forum des Entreprises. Espace Étudiant.
          </p>
        </div>
      </footer>
    </div>
  );
}

