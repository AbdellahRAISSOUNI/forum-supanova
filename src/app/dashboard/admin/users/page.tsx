'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  ArrowLeftIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  CogIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface User {
  _id: string;
  email: string;
  name: string;
  firstName?: string;
  role: 'student' | 'committee' | 'admin';
  studentStatus?: 'ensa' | 'external';
  opportunityType?: 'pfa' | 'pfe' | 'employment' | 'observation';
  assignedRoom?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserStats {
  totalUsers: number;
  roleStats: {
    student: number;
    committee: number;
    admin: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function UserManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to first page when search changes
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [search]);

  // Auth check
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login?callbackUrl=/dashboard/admin/users');
      return;
    }

    if (session.user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // Fetch users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', page, debouncedSearch, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(debouncedSearch && { search: debouncedSearch })
      });
      
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!session && session.user.role === 'admin',
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      return response.json();
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    },
  });

  const handleDeleteUser = (user: User) => {
    if (user._id === session?.user.id) {
      toast.error('Cannot delete your own account');
      return;
    }
    
    if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
      deleteUserMutation.mutate(user._id);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Admin</span>;
      case 'committee':
        return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">Committee</span>;
      case 'student':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Student</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{role}</span>;
    }
  };

  const getStudentStatusBadge = (status?: string) => {
    if (!status) return null;
    switch (status) {
      case 'ensa':
        return <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">ENSA</span>;
      case 'external':
        return <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded-full">External</span>;
      default:
        return null;
    }
  };

  const getOpportunityTypeBadge = (type?: string) => {
    if (!type) return null;
    switch (type) {
      case 'pfa':
      case 'pfe':
        return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">PFA/PFE</span>;
      case 'employment':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Employment</span>;
      case 'observation':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Observation</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{type}</span>;
    }
  };

  if (status === 'loading' || usersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#2880CA] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  const users: User[] = usersData?.users || [];
  const stats: UserStats = usersData?.stats || { totalUsers: 0, roleStats: { student: 0, committee: 0, admin: 0 } };
  const pagination: PaginationInfo = usersData?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
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
                  User Management
                </h1>
                <p className="text-blue-100 text-sm sm:text-base truncate">
                  Manage system users and permissions
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between w-full sm:w-auto space-x-2 sm:space-x-3">
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-500 hover:bg-red-600 text-white px-3 sm:px-4 py-2 rounded-xl transition-colors backdrop-blur-sm border border-red-400/50 text-sm sm:text-base flex-shrink-0"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#2880CA]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Total Users</h3>
                <p className="text-xl sm:text-2xl font-bold text-[#2880CA]">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Students</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.roleStats.student}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Committee</h3>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.roleStats.committee}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6">
            <div className="flex items-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center mr-3 sm:mr-4">
                <CogIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-800">Admins</h3>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.roleStats.admin}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                />
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
              >
                <option value="all" className="text-gray-900">All Roles</option>
                <option value="student" className="text-gray-900">Students</option>
                <option value="committee" className="text-gray-900">Committee</option>
                <option value="admin" className="text-gray-900">Admins</option>
              </select>
            </div>

            {/* Create User Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 w-full sm:w-auto justify-center"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50/50 border-b border-gray-200/50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">User</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 sm:px-4 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.name}
                        </div>
                        <div className="text-sm text-gray-700">{user.email}</div>
                        <div className="sm:hidden mt-1 space-y-1">
                          {getStudentStatusBadge(user.studentStatus)}
                          {getOpportunityTypeBadge(user.opportunityType)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-3 sm:px-4 py-4 hidden sm:table-cell">
                      {getStudentStatusBadge(user.studentStatus)}
                    </td>
                    <td className="px-3 sm:px-4 py-4 hidden md:table-cell">
                      {getOpportunityTypeBadge(user.opportunityType)}
                      {user.assignedRoom && (
                        <div className="text-xs text-gray-700 mt-1">Room: {user.assignedRoom}</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-4 text-sm text-gray-700 hidden lg:table-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 sm:px-4 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={user._id === session.user.id}
                          className="text-red-600 hover:text-red-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50/50 px-4 py-3 border-t border-gray-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-900 font-medium">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-900 bg-white"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-900 font-medium bg-gray-100 rounded">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-gray-900 bg-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          }}
        />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    firstName: '',
    role: 'student' as 'student' | 'committee' | 'admin',
    studentStatus: '' as 'ensa' | 'external' | '',
    opportunityType: '' as 'pfa' | 'pfe' | 'employment' | 'observation' | '',
    assignedRoom: ''
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      toast.success('User created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up empty fields
    const submitData = { ...formData };
    if (!submitData.studentStatus) delete submitData.studentStatus;
    if (!submitData.opportunityType) delete submitData.opportunityType;
    if (!submitData.assignedRoom) delete submitData.assignedRoom;
    
    createUserMutation.mutate(submitData);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Create New User</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                placeholder="Enter password"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
              >
                <option value="student" className="text-gray-900">Student</option>
                <option value="committee" className="text-gray-900">Committee</option>
                <option value="admin" className="text-gray-900">Admin</option>
              </select>
            </div>

            {formData.role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Status</label>
                  <select
                    value={formData.studentStatus}
                    onChange={(e) => setFormData({ ...formData, studentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">Select status</option>
                    <option value="ensa" className="text-gray-900">ENSA</option>
                    <option value="external" className="text-gray-900">External</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Type</label>
                  <select
                    value={formData.opportunityType}
                    onChange={(e) => setFormData({ ...formData, opportunityType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">Select type</option>
                    <option value="pfa" className="text-gray-900">PFA</option>
                    <option value="pfe" className="text-gray-900">PFE</option>
                    <option value="employment" className="text-gray-900">Employment</option>
                    <option value="observation" className="text-gray-900">Observation</option>
                  </select>
                </div>
              </>
            )}

            {formData.role === 'committee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Room</label>
                <input
                  type="text"
                  value={formData.assignedRoom}
                  onChange={(e) => setFormData({ ...formData, assignedRoom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                  placeholder="e.g., Room A, Room B"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 bg-gray-50 p-4 -mx-6 -mb-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createUserMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 bg-[#2880CA] hover:bg-[#1e5f8a] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onSuccess }: { user: User; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    email: user.email,
    password: '',
    name: user.name,
    firstName: user.firstName || '',
    role: user.role,
    studentStatus: user.studentStatus || '',
    opportunityType: user.opportunityType || '',
    assignedRoom: user.assignedRoom || ''
  });

  const editUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up empty fields
    const submitData = { ...formData };
    if (!submitData.password) delete submitData.password;
    if (!submitData.studentStatus) delete submitData.studentStatus;
    if (!submitData.opportunityType) delete submitData.opportunityType;
    if (!submitData.assignedRoom) delete submitData.assignedRoom;
    
    editUserMutation.mutate(submitData);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Edit User</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password (leave empty to keep current)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                placeholder="Enter new password"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
              >
                <option value="student" className="text-gray-900">Student</option>
                <option value="committee" className="text-gray-900">Committee</option>
                <option value="admin" className="text-gray-900">Admin</option>
              </select>
            </div>

            {formData.role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student Status</label>
                  <select
                    value={formData.studentStatus}
                    onChange={(e) => setFormData({ ...formData, studentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">Select status</option>
                    <option value="ensa" className="text-gray-900">ENSA</option>
                    <option value="external" className="text-gray-900">External</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Type</label>
                  <select
                    value={formData.opportunityType}
                    onChange={(e) => setFormData({ ...formData, opportunityType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="" className="text-gray-900">Select type</option>
                    <option value="pfa" className="text-gray-900">PFA</option>
                    <option value="pfe" className="text-gray-900">PFE</option>
                    <option value="employment" className="text-gray-900">Employment</option>
                    <option value="observation" className="text-gray-900">Observation</option>
                  </select>
                </div>
              </>
            )}

            {formData.role === 'committee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Room</label>
                <input
                  type="text"
                  value={formData.assignedRoom}
                  onChange={(e) => setFormData({ ...formData, assignedRoom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2880CA] focus:border-transparent text-gray-900 placeholder-gray-600 bg-white"
                  placeholder="e.g., Room A, Room B"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 bg-gray-50 p-4 -mx-6 -mb-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editUserMutation.isPending}
                className="w-full sm:w-auto px-4 py-2 bg-[#2880CA] hover:bg-[#1e5f8a] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {editUserMutation.isPending ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}