import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddMemberModal from '../components/AddMemberModal';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchMembers();
  }, [debouncedSearch]);

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
          search: debouncedSearch
        }
      });

      if (res.data.data) {
        setMembers(res.data.data);
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
        )}
      </div>
    </div>
  );
};

export default Members;
