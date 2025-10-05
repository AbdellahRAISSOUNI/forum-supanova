'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ClockIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Company {
  _id: string;
  name: string;
  sector: string;
  website: string;
  room: string;
  estimatedInterviewDuration: number;
  isActive: boolean;
  imageId?: string;
  imageUrl?: string;
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

interface QueueData {
  companyId: string;
  companyName: string;
  room: string;
  estimatedDuration: number;
  currentInterview: {
    studentName: string;
    studentStatus: string;
    role: string;
    opportunityType: string;
    startedAt: string;
    interviewId: string;
  } | null;
  nextInQueue: Array<{
    studentName: string;
    studentStatus: string;
    role: string;
    opportunityType: string;
    position: number;
    joinedAt: string;
    priorityScore: number;
    interviewId: string;
  }>;
  fullQueue: Array<{
    studentName: string;
    studentStatus: string;
    role: string;
    opportunityType: string;
    position: number;
    joinedAt: string;
    priorityScore: number;
    interviewId: string;
  }>;
  totalWaiting: number;
  averageWaitTime: number;
}

export default function AdminCompaniesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
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
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
    setSelectedImage(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleViewQueue = async (company: Company) => {
    setSelectedCompany(company);
    setShowQueueModal(true);
    setIsLoadingQueue(true);
    
    try {
      // Fetch queue data for this specific company
      const response = await fetch(`/api/admin/queues?companyId=${company._id}`);
      if (response.ok) {
        const data = await response.json();
        // Find the queue data for this company
        const companyQueue = data.queues.find((queue: QueueData) => queue.companyId === company._id);
        setQueueData(companyQueue || null);
      } else {
        setQueueData(null);
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
      setQueueData(null);
    } finally {
      setIsLoadingQueue(false);
    }
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
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Type de fichier non supporté. Utilisez JPEG, PNG ou WebP' });
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setMessage({ type: 'error', text: 'Fichier trop volumineux. Taille maximum: 5MB' });
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async (companyId: string) => {
    if (!selectedImage) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch(`/api/admin/companies/${companyId}/image`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Image téléchargée avec succès' });
        setSelectedImage(null);
        setImagePreview(null);
        fetchCompanies(); // Refresh companies list
        
        // Auto-close modal after successful upload
        setTimeout(() => {
          closeModal();
        }, 1500); // Close after 1.5 seconds to show success message
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors du téléchargement de l\'image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageDelete = async (companyId: string) => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}/image`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Image supprimée avec succès' });
        fetchCompanies(); // Refresh companies list
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la suppression de l\'image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    }
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getOpportunityTypeBadge = (type: string) => {
    switch (type) {
      case 'pfa':
      case 'pfe':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">PFA/PFE</span>;
      case 'employment':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Emploi</span>;
      case 'observation':
        return <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">Observation</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{type}</span>;
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

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Modern Header - Mobile Responsive */}
      <header className="bg-[#2880CA] backdrop-blur-md border-b border-blue-600 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                onClick={() => router.push('/dashboard/admin')}
                className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0"
              >
                <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                  Gestion des Entreprises
                </h1>
                <p className="text-blue-100 text-sm sm:text-base truncate">
                  Bienvenue, {session.user.firstName} {session.user.name}!
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between w-full sm:w-auto space-x-2 sm:space-x-3">
              <div className="hidden md:block text-right">
                <p className="text-xs sm:text-sm text-blue-100">Connecté en tant que</p>
                <p className="text-white font-medium text-sm sm:text-base truncate">
                  {session?.user.firstName} {session?.user.name}
                </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-xl transition-colors backdrop-blur-sm border border-red-400/50 text-sm sm:text-base flex-shrink-0"
          >
                Se déconnecter
          </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'error'
              ? 'bg-red-50/70 backdrop-blur-sm border border-red-200/50 text-red-700'
              : 'bg-green-50/70 backdrop-blur-sm border border-green-200/50 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Header with Add Button */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Liste des Entreprises</h2>
              <p className="text-gray-600 text-sm sm:text-base">Gérez les entreprises participantes</p>
            </div>
          <button
            onClick={openModal}
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold rounded-lg transition-colors"
          >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Ajouter une Entreprise</span>
              <span className="sm:hidden">Ajouter</span>
          </button>
          </div>
        </div>

        {/* Companies Table */}
        {isLoading ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2880CA] mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des entreprises...</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BuildingOfficeIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entreprise</h3>
            <p className="text-gray-600 mb-4">Commencez par ajouter votre première entreprise.</p>
            <button
              onClick={openModal}
              className="inline-flex items-center px-6 py-3 bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Ajouter une Entreprise
            </button>
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Secteur
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salle
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Durée
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          File d'Attente
                        </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/50">
                  {companies.map((company) => (
                    <tr key={company._id} className="hover:bg-white/70 transition-colors">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {company.imageUrl ? (
                            <img
                              src={company.imageUrl}
                              alt={`${company.name} logo`}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200 ${company.imageUrl ? 'hidden' : ''}`}>
                            <BuildingOfficeIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px]">{company.website}</div>
                        <div className="text-xs text-gray-500 sm:hidden">{company.sector}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                        {company.sector}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {company.room}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {company.estimatedInterviewDuration} min
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                          company.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.isActive ? (
                            <>
                              <CheckCircleIcon className="w-3 h-3 mr-1" />
                              Actif
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="w-3 h-3 mr-1" />
                              Inactif
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <button
                          onClick={() => handleViewQueue(company)}
                          className="inline-flex items-center text-[#2880CA] hover:text-[#1e5f8a] text-sm font-medium"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Voir la File
                        </button>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => handleEdit(company)}
                            className="inline-flex items-center text-[#2880CA] hover:text-[#1e5f8a] transition-colors"
                        >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Modifier</span>
                        </button>
                        <button
                          onClick={() => handleToggleActive(company)}
                            className={`inline-flex items-center transition-colors ${
                            company.isActive
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                            {company.isActive ? (
                              <>
                                <XCircleIcon className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Désactiver</span>
                              </>
                            ) : (
                              <>
                                <CheckCircleIcon className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">Activer</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleViewQueue(company)}
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 lg:hidden"
                          >
                            <EyeIcon className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">File</span>
                        </button>
                        </div>
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
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-white/20">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingCompany ? 'Modifier l\'Entreprise' : 'Ajouter une Entreprise'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100/50"
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-500 ${
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-500 ${
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-500 ${
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-500 ${
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
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-500 ${
                      errors.estimatedInterviewDuration ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.estimatedInterviewDuration && <p className="mt-1 text-sm text-red-600">{errors.estimatedInterviewDuration}</p>}
                </div>

                {/* Image Upload Section */}
                {editingCompany && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Image de l'entreprise
                    </label>
                    
                    {/* Current Image Display */}
                    {editingCompany.imageUrl && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Image actuelle:</p>
                        <div className="flex items-center space-x-4">
                          <img
                            src={editingCompany.imageUrl}
                            alt={`${editingCompany.name} logo`}
                            className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleImageDelete(editingCompany._id)}
                            className="px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors text-sm"
                          >
                            <XMarkIcon className="w-4 h-4 inline mr-1" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Image Upload */}
                    <div className="space-y-3">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[#2880CA] file:text-white hover:file:bg-[#1e5f8a] file:cursor-pointer"
                      />
                      
                      {imagePreview && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">Aperçu:</p>
                          <div className="flex items-center space-x-4">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedImage(null);
                                setImagePreview(null);
                              }}
                              className="px-3 py-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors text-sm"
                            >
                              <XMarkIcon className="w-4 h-4 inline mr-1" />
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}

                      {selectedImage && (
                        <button
                          type="button"
                          onClick={() => handleImageUpload(editingCompany._id)}
                          disabled={isUploadingImage}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {isUploadingImage ? 'Téléchargement...' : 'Télécharger l\'image'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

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

      {/* Queue Modal */}
      {showQueueModal && selectedCompany && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowQueueModal(false);
            }
          }}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-white/20 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center p-6 border-b border-gray-200/50 bg-gradient-to-r from-[#2880CA]/10 to-blue-50/50">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                File d'Attente - {selectedCompany.name}
              </h2>
                <p className="text-sm text-gray-600 mt-1">Salle {selectedCompany.room}</p>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh] bg-gradient-to-b from-white/50 to-gray-50/30">
              {isLoadingQueue ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2880CA] mx-auto"></div>
                  <p className="mt-4 text-gray-600">Chargement de la file d'attente...</p>
                </div>
              ) : queueData ? (
                <>
                  {/* Current Interview */}
                  {queueData.currentInterview && (
                    <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200/50 shadow-lg">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="text-lg font-bold text-green-800">Entretien en Cours</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="font-semibold text-green-700 text-lg">{queueData.currentInterview.studentName}</p>
                          <div className="flex items-center space-x-2 mt-2">
                            {getOpportunityTypeBadge(queueData.currentInterview.opportunityType)}
                            {getPriorityBadge(queueData.currentInterview.role, queueData.currentInterview.studentStatus)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-green-600 font-medium">Commencé à</p>
                          <p className="text-lg font-bold text-green-700">{formatTime(queueData.currentInterview.startedAt)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Queue Statistics */}
                  <div className="mb-6 p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-[#2880CA]">{queueData.totalWaiting}</p>
                        <p className="text-sm text-gray-600">En attente</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{queueData.averageWaitTime}</p>
                        <p className="text-sm text-gray-600">Min d'attente</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{queueData.estimatedDuration}</p>
                        <p className="text-sm text-gray-600">Min par entretien</p>
                      </div>
                    </div>
                  </div>

                  {/* Full Queue */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <UserGroupIcon className="w-5 h-5 mr-2 text-[#2880CA]" />
                      File d'Attente ({queueData.totalWaiting} étudiants)
                    </h3>
                    
                    {queueData.fullQueue.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <UserGroupIcon className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 text-lg">Aucun étudiant en attente</p>
                        <p className="text-gray-500 text-sm mt-1">La file d'attente est vide</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {queueData.fullQueue.map((student, index) => (
                          <div key={student.interviewId} className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 hover:bg-white/90 transition-all duration-200 shadow-sm hover:shadow-md">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-[#2880CA] to-blue-600 text-white rounded-xl flex items-center justify-center font-bold shadow-lg">
                                #{student.position}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{student.studentName}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  {getOpportunityTypeBadge(student.opportunityType)}
                                  {getPriorityBadge(student.role, student.studentStatus)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600 font-medium">
                                Arrivé: {formatDate(student.joinedAt)}
                              </p>
                              <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full mt-1">
                                Score: {student.priorityScore}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#2880CA]/20 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BuildingOfficeIcon className="w-10 h-10 text-[#2880CA]" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Aucune File d'Attente</h3>
                  <p className="text-gray-600 mb-4 max-w-md mx-auto">
                    Cette entreprise n'a actuellement aucune file d'attente active.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Les étudiants peuvent rejoindre la file d'attente en s'inscrivant aux entretiens.
                  </p>
              </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50">
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-6 py-3 text-gray-700 bg-white/80 backdrop-blur-sm border border-gray-300/50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800/90 backdrop-blur-sm text-white py-6 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-300">
            © 2025 ENSA Tétouan - Forum des Entreprises. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
