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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CompanyFormData {
  name: string;
  sector: string;
  website: string;
  room: string;
  estimatedInterviewDuration: number;
}

export default function AdminCompaniesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    sector: '',
    website: '',
    room: '',
    estimatedInterviewDuration: 20,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchCompanies();
  }, [session, status, router]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies');
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
    if (!formData.sector.trim()) newErrors.sector = 'Le secteur est requis';
    if (!formData.website.trim()) newErrors.website = 'Le site web est requis';
    if (!formData.room.trim()) newErrors.room = 'La salle est requise';
    if (formData.estimatedInterviewDuration < 5 || formData.estimatedInterviewDuration > 120) {
      newErrors.estimatedInterviewDuration = 'La durée doit être entre 5 et 120 minutes';
    }

    // Basic URL validation
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'URL invalide (doit commencer par http:// ou https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const url = editingCompany 
        ? `/api/admin/companies/${editingCompany._id}`
        : '/api/admin/companies';
      
      const method = editingCompany ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: editingCompany ? 'Entreprise mise à jour avec succès' : 'Entreprise créée avec succès' 
        });
        setIsModalOpen(false);
        setEditingCompany(null);
        resetForm();
        fetchCompanies();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      sector: company.sector,
      website: company.website,
      room: company.room,
      estimatedInterviewDuration: company.estimatedInterviewDuration,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (company: Company) => {
    try {
      const response = await fetch(`/api/admin/companies/${company._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !company.isActive }),
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Entreprise ${!company.isActive ? 'activée' : 'désactivée'} avec succès` 
        });
        fetchCompanies();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la mise à jour' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sector: '',
      website: '',
      room: '',
      estimatedInterviewDuration: 20,
    });
    setErrors({});
  };

  const openModal = () => {
    setEditingCompany(null);
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCompany(null);
    resetForm();
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

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2880CA] text-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Entreprises</h1>
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

        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Liste des Entreprises</h2>
          <button
            onClick={openModal}
            className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Ajouter une Entreprise
          </button>
        </div>

        {/* Companies Table */}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entreprise</h3>
            <p className="text-gray-600 mb-4">Commencez par ajouter votre première entreprise.</p>
            <button
              onClick={openModal}
              className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Ajouter une Entreprise
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Secteur
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-sm text-gray-500">{company.website}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.sector}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.room}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.estimatedInterviewDuration} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          company.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(company)}
                          className="text-[#2880CA] hover:text-[#1e5f8a] transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleToggleActive(company)}
                          className={`transition-colors ${
                            company.isActive
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {company.isActive ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCompany ? 'Modifier l\'Entreprise' : 'Ajouter une Entreprise'}
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de l'entreprise *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Nom de l'entreprise"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-1">
                    Secteur *
                  </label>
                  <input
                    type="text"
                    id="sector"
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] ${
                      errors.sector ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Secteur d'activité"
                  />
                  {errors.sector && <p className="mt-1 text-sm text-red-600">{errors.sector}</p>}
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    Site web *
                  </label>
                  <input
                    type="url"
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] ${
                      errors.website ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="https://www.example.com"
                  />
                  {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
                </div>

                <div>
                  <label htmlFor="room" className="block text-sm font-medium text-gray-700 mb-1">
                    Salle *
                  </label>
                  <input
                    type="text"
                    id="room"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] ${
                      errors.room ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Numéro de salle"
                  />
                  {errors.room && <p className="mt-1 text-sm text-red-600">{errors.room}</p>}
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Durée estimée (minutes) *
                  </label>
                  <input
                    type="number"
                    id="duration"
                    min="5"
                    max="120"
                    value={formData.estimatedInterviewDuration}
                    onChange={(e) => setFormData({ ...formData, estimatedInterviewDuration: parseInt(e.target.value) || 20 })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] ${
                      errors.estimatedInterviewDuration ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.estimatedInterviewDuration && <p className="mt-1 text-sm text-red-600">{errors.estimatedInterviewDuration}</p>}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#2880CA] text-white rounded-md hover:bg-[#1e5f8a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </form>
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
