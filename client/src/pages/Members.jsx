import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Search, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddMemberModal from '../components/AddMemberModal';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  useEffect(() => {
    fetchMembers();
  }, [debouncedSearch, pagination.page]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/member/list', {
        params: {
          search: debouncedSearch,
          page: pagination.page,
          limit: pagination.limit
        }
      });

      if (res.data.data) {
        setMembers(res.data.data);
        setPagination(res.data.pagination);
      } else {
        // Fallback or backward compatibility
        setMembers(Array.isArray(res.data) ? res.data : (res.data.members || []));
      }
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="dashboard-container">
      <AddMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchMembers}
      />
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-description">Manage your organization's members</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          <span>Add Member</span>
        </button>
      </div>

      {/* Filters */}
      <div className="search-container">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          placeholder="Search members by name or mobile..."
          className="input search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="table-container">
        {loading ? (
          <div className="empty-state">Loading members...</div>
        ) : members.length === 0 ? (
          <div className="empty-state">No members found.</div>
        ) : (
          <>
            <table className="members-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Account No.</th>
                  <th>Total Amount</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr
                    key={member.id}
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <td style={{ fontWeight: 500 }}>{member.name || 'N/A'}</td>
                    <td className="mobile-text">{member.account?.accountNumber || 'N/A'}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {`₹ ${(member.account?.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
                    </td>
                    <td>
                      <div className="address-text">{member.address || 'N/A'}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pagination-controls" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
                <div className="pagination-info" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="pagination-buttons" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                  >
                    <ChevronLeft size={16} />
                    <span style={{ marginLeft: '0.25rem' }}>Prev</span>
                  </button>
                  <span className="page-indicator" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                  >
                    <span style={{ marginRight: '0.25rem' }}>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Members;
