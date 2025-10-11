'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  UsersIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface CommitteeMember {
  _id: string;
  firstName: string;
  name: string;
  email: string;
  assignedRoom: string;
  createdAt: string;
  updatedAt: string;
}

interface Room {
  room: string;
  companies: string;
}

export default function AdminCommitteePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberStatuses, setMemberStatuses] = useState<Record<string, { isActive: boolean; lastActivity?: string }>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    name: '',
    email: '',
    password: '',
    assignedRoom: '',
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/admin/committee');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchCommitteeMembers();
    fetchRooms();
  }, [session, status, router]);

  const fetchCommitteeMembers = async () => {
    try {
      const response = await fetch('/api/admin/committee');
      if (response.ok) {
        const data = await response.json();
        setCommitteeMembers(data.committeeMembers);
        
        // Fetch member statuses (active interviews)
        const statusPromises = data.committeeMembers.map(async (member: CommitteeMember) => {
          try {
            const statusResponse = await fetch(`/api/admin/committee/${member._id}/status`);
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              return { memberId: member._id, status: statusData };
            }
          } catch (error) {
            console.error(`Error fetching status for member ${member._id}:`, error);
          }
          return { memberId: member._id, status: { isActive: false } };
        });
        
        const statuses = await Promise.all(statusPromises);
        const statusMap: Record<string, { isActive: boolean; lastActivity?: string }> = {};
        statuses.forEach(({ memberId, status }) => {
          statusMap[memberId] = status;
        });
        setMemberStatuses(statusMap);
      } else {
        setMessage({ type: 'error', text: 'Erreur lors du chargement des membres du comité' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/admin/rooms');
      if (response.ok) {
        const data = await response.json();
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const openAddModal = () => {
    setEditingMember(null);
    setFormData({
      firstName: '',
      name: '',
      email: '',
      password: '',
      assignedRoom: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (member: CommitteeMember) => {
    setEditingMember(member);
    setFormData({
      firstName: member.firstName,
      name: member.name,
      email: member.email,
      password: '', // Don't pre-fill password
      assignedRoom: member.assignedRoom,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMember(null);
    setShowPassword(false);
    setFormData({
      firstName: '',
      name: '',
      email: '',
      password: '',
      assignedRoom: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const url = editingMember 
        ? `/api/admin/committee/${editingMember._id}`
        : '/api/admin/committee';
      
      const method = editingMember ? 'PATCH' : 'POST';
      
      const body = editingMember 
        ? { ...formData, password: undefined } // Don't send password for updates
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: editingMember 
            ? 'Membre du comité mis à jour avec succès'
            : 'Membre du comité créé avec succès'
        });
        closeModal();
        fetchCommitteeMembers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre du comité ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/committee/${memberId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Membre du comité supprimé avec succès' });
        fetchCommitteeMembers();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la suppression' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
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
                  Gestion du Comité
                </h1>
                <p className="text-blue-100 text-sm sm:text-base truncate">
                  Gérer les membres du comité et leurs salles assignées
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
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
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
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Membres du Comité</h2>
              <p className="text-gray-600 text-sm sm:text-base">Gérez les membres du comité et leurs salles assignées</p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold rounded-lg transition-colors"
            >
              <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Ajouter un Membre</span>
              <span className="sm:hidden">Ajouter</span>
            </button>
          </div>
        </div>

        {/* Committee Members Table */}
        {committeeMembers.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UsersIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun membre du comité</h3>
            <p className="text-gray-600 mb-4">Commencez par ajouter votre premier membre du comité.</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-6 py-3 bg-[#2880CA] hover:bg-[#1e5f8a] text-white font-semibold rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Ajouter un Membre
            </button>
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salle Assignée
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/50">
                  {committeeMembers.map((member) => (
                    <tr key={member._id} className="hover:bg-white/70 transition-colors">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.name}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden">{member.email}</div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                        {member.email}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.assignedRoom}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        {memberStatuses[member._id] ? (
                          <div className="flex flex-col space-y-1">
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              memberStatuses[member._id].isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {memberStatuses[member._id].isActive ? (
                                <>
                                  <ClockIcon className="w-3 h-3 mr-1" />
                                  En entretien
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                                  Disponible
                                </>
                              )}
                            </span>
                            {memberStatuses[member._id].lastActivity && (
                              <span className="text-xs text-gray-500">
                                {new Date(memberStatuses[member._id].lastActivity!).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Chargement...</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="inline-flex items-center text-[#2880CA] hover:text-[#1e5f8a] transition-colors"
                          >
                            <PencilIcon className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Modifier</span>
                          </button>
                          <button
                            onClick={() => handleDelete(member._id)}
                            className="inline-flex items-center text-red-600 hover:text-red-800 transition-colors"
                          >
                            <TrashIcon className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Supprimer</span>
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
                <h2 className="text-xl font-bold text-gray-900">
                  {editingMember ? 'Modifier le Membre du Comité' : 'Ajouter un Membre du Comité'}
                </h2>
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
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Entrez le prénom"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-600 bg-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Entrez le nom de famille"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-600 bg-white"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="exemple@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-600 bg-white"
                    required
                  />
                </div>

                {!editingMember && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Minimum 6 caractères"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 placeholder-gray-600 bg-white"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-4 w-4 text-gray-600 hover:text-gray-800" />
                        ) : (
                          <EyeIcon className="h-4 w-4 text-gray-600 hover:text-gray-800" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="assignedRoom" className="block text-sm font-medium text-gray-700 mb-1">
                    Salle Assignée *
                  </label>
                  <select
                    id="assignedRoom"
                    value={formData.assignedRoom}
                    onChange={(e) => setFormData({ ...formData, assignedRoom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA] text-gray-900 bg-white"
                    required
                  >
                    <option value="" className="text-gray-900 bg-white">Sélectionner une salle</option>
                    {rooms.map((room) => (
                      <option key={room.room} value={room.room} className="text-gray-900 bg-white">
                        {room.room} ({room.companies})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#2880CA] text-white rounded-md hover:bg-[#1e5f8a] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sauvegarde...' : editingMember ? 'Mettre à jour' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
