'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#2880CA] text-white py-6 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestion du Comité</h1>
            <p className="text-lg opacity-90">Gérer les membres du comité et leurs salles assignées</p>
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
        {message && (
          <div className={`p-4 rounded-md mb-6 ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Add Button */}
        <div className="mb-6">
          <button
            onClick={openAddModal}
            className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-6 py-3 rounded-lg transition-colors"
          >
            Ajouter un Membre du Comité
          </button>
        </div>

        {/* Committee Members Table */}
        {committeeMembers.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 text-lg">Aucun membre du comité trouvé.</p>
            <p className="text-gray-500 mt-2">Cliquez sur "Ajouter un Membre du Comité" pour commencer.</p>
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
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salle Assignée
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {committeeMembers.map((member) => (
                    <tr key={member._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {member.firstName} {member.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.assignedRoom}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => openEditModal(member)}
                          className="text-[#2880CA] hover:text-[#1e5f8a] mr-4"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(member._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Supprimer
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
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingMember ? 'Modifier le Membre du Comité' : 'Ajouter un Membre du Comité'}
              </h2>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA]"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA]"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA]"
                    required
                  />
                </div>

                {!editingMember && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA]"
                      required
                      minLength={6}
                    />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2880CA]"
                    required
                  >
                    <option value="">Sélectionner une salle</option>
                    {rooms.map((room) => (
                      <option key={room.room} value={room.room}>
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
