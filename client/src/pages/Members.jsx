import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddMemberModal from '../components/AddMemberModal';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/member/list');
      // res.data.members assumes the API returns { members: [] } or just []
      // Let's assume the API returns the array directly or inside a data property
      // Based on typical controller patterns: res.json(members)
      setMembers(Array.isArray(res.data) ? res.data : (res.data.members || []));
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => 
    member.name?.toLowerCase().includes(search.toLowerCase()) ||
    member.mobile?.includes(search)
  );

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
        ) : filteredMembers.length === 0 ? (
            <div className="empty-state">No members found.</div>
        ) : (
            <table className="members-table">
            <thead>
                <tr>
                <th>Name</th>
                <th>Account No.</th>
                <th>Mobile</th>
                <th>Address</th>
                <th style={{textAlign: 'right'}}>Action</th>
                </tr>
            </thead>
            <tbody>
                {filteredMembers.map(member => (
                <tr 
                    key={member.id} 
                    onClick={() => navigate(`/members/${member.id}`)}
                >
                    <td style={{fontWeight: 500}}>{member.name || 'N/A'}</td>
                    <td className="mobile-text">{member.account?.accountNumber || 'N/A'}</td>
                    <td className="mobile-text">{member.mobile}</td>
                    <td>
                        <div className="address-text">{member.address || 'N/A'}</div>
                    </td>
                    <td style={{textAlign: 'right'}}>
                        <ChevronRight size={20} style={{color: 'var(--text-muted)'}} />
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
