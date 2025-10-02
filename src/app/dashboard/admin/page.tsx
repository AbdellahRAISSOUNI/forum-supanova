'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/admin');
      return;
    }

    if (session.user.role !== 'admin') {
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

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2880CA] text-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tableau de Bord Administrateur</h1>
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
              Vous êtes connecté en tant qu&apos;administrateur du système.
            </p>
          </div>

          {/* Admin Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Utilisateurs</h3>
                  <p className="text-gray-600">Gestion des comptes</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Entreprises</h3>
                  <p className="text-gray-600">Gestion des partenaires</p>
                </div>
              </div>
            </div>

                <Link href="/dashboard/admin/committee" className="bg-purple-50 p-6 rounded-lg hover:bg-purple-100 transition-colors">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">Comité</h3>
                      <p className="text-gray-600">Gestion des membres du comité</p>
                    </div>
                  </div>
                </Link>

            <div className="bg-red-50 p-6 rounded-lg">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#2880CA] rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Système</h3>
                  <p className="text-gray-600">Configuration globale</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t pt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Actions Rapides</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/dashboard/admin/companies" className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-4 py-3 rounded-lg transition-colors text-center">
                    Gérer les Entreprises
                  </Link>
                  <Link href="/dashboard/admin/committee" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg transition-colors text-center">
                    Gérer le Comité
                  </Link>
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors">
                    Gestion Utilisateurs
                  </button>
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors">
                    Statistiques
                  </button>
            </div>
          </div>

          {/* System Overview */}
          <div className="border-t pt-8 mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Vue d&apos;ensemble du système</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Étudiants actifs</h4>
                <p className="text-2xl font-bold text-[#2880CA]">0</p>
                <p className="text-sm text-gray-600">Dernière mise à jour: Jamais</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Offres disponibles</h4>
                <p className="text-2xl font-bold text-[#2880CA]">0</p>
                <p className="text-sm text-gray-600">Dernière mise à jour: Jamais</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Candidatures en cours</h4>
                <p className="text-2xl font-bold text-[#2880CA]">0</p>
                <p className="text-sm text-gray-600">Dernière mise à jour: Jamais</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 px-4 sm:px-8 mt-12">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Espace Administrateur.
          </p>
        </div>
      </footer>
    </div>
  );
}