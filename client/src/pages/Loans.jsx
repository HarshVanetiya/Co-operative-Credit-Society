import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Plus, Loader, CircleDollarSign, CheckCircle, Clock, Filter, X, ChevronLeft, ChevronRight, ChevronDown, Search } from 'lucide-react';
import LoanModal from '../components/LoanModal';

const Loans = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filter, setFilter] = useState('ALL');
  const [memberFilter, setMemberFilter] = useState(searchParams.get('memberId') || '');
  const [members, setMembers] = useState([]);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanableAmount, setLoanableAmount] = useState(0);

  // Search/Dropdown states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchToken, setDebouncedSearchToken] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMemberName, setSelectedMemberName] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchToken(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch members when search token changes
  useEffect(() => {
    fetchMembers(debouncedSearchToken);
  }, [debouncedSearchToken]);

  // Sync selectedMemberName if memberFilter is preset (e.g. from URL)
  useEffect(() => {
    if (memberFilter && members.length > 0) {
      const m = members.find(m => m.id === parseInt(memberFilter));
      if (m) {
        setSelectedMemberName(m.name);
        setSearchTerm(m.name);
      }
    }
  }, [memberFilter, members]);

  useEffect(() => {
    fetchLoans(1);
    fetchLoanableAmount();
    fetchMembers();
  }, [filter, memberFilter]);

  // Handle Space key to open modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
        setIsLoanModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchLoans = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 20);

      if (filter !== 'ALL') {
        params.append('status', filter);
      }
      if (memberFilter) {
        params.append('memberId', memberFilter);
      }

      const res = await api.get(`/loan/all?${params}`);
      setLoans(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching loans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanableAmount = async () => {
    try {
      const res = await api.get('/loan/available');
      setLoanableAmount(res.data.availableFunds);
    } catch (error) {
      console.error('Error fetching loanable amount:', error);
    }
  };

  const fetchMembers = async (search = '') => {
    setLoadingMembers(true);
    try {
      const res = await api.get(`/member/list?search=${search}`);
      setMembers(res.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleLoanSuccess = () => {
    fetchLoans(pagination.page);
    fetchLoanableAmount();
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedMemberName(value);
    setShowDropdown(true);
    if (value === '') {
      setMemberFilter('');
      setSearchParams({});
    }
  };

  const selectMember = (member) => {
    setMemberFilter(member.id.toString());
    setSearchParams({ memberId: member.id });
    setSelectedMemberName(member.name);
    setSearchTerm(member.name);
    setShowDropdown(false);
  };

  const handleMemberFilterChange = (e) => {
    const value = e.target.value;
    setMemberFilter(value);
    if (value) {
      setSearchParams({ memberId: value });
    } else {
      setSearchParams({});
    }
  };

  const clearMemberFilter = () => {
    setMemberFilter('');
    setSearchParams({});
    setSearchTerm('');
    setSelectedMemberName('');
    fetchMembers('');
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchLoans(page);
    }
  };

  const formatCurrency = (amount) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      dateStyle: 'medium',
    });
  };

  const getStatusBadge = (status) => {
    if (status === 'ACTIVE') {
      return (
        <span className="status-badge status-active">
          <Clock size={14} />
          Active
        </span>
      );
    }
    return (
      <span className="status-badge status-completed">
        <CheckCircle size={14} />
        Completed
      </span>
    );
  };

  // Find selected member name for display
  const selectedMember = members.find(m => m.id === parseInt(memberFilter));

  return (
    <div className="members-container">
      <div className="page-header">
        <h1 className="page-title">
          <CircleDollarSign size={28} />
          Loan Management
        </h1>
        <div className="header-actions">
          <div className="loanable-amount-badge">
            Available for Loan: <strong>{formatCurrency(loanableAmount)}</strong>
          </div>
          <button className="btn btn-primary" onClick={() => setIsLoanModalOpen(true)}>
            <Plus size={20} />
            <span>New Loan</span>
          </button>
        </div>
      </div>

      {/* Member Filter */}
      <div className="member-filter-section">
        <div className="filter-row" style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <div className="search-input-wrapper" style={{ position: 'relative', flex: 1 }}>
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search member..."
              value={selectedMemberName}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              className="input"
              style={{ paddingLeft: '32px' }}
              autoComplete="off"
            />
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer' }}>
              {loadingMembers ? <Loader size={16} className="animate-spin" /> :
                selectedMemberName ? <X size={16} onClick={clearMemberFilter} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {showDropdown && (
            <div className="dropdown-list" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              marginTop: '4px',
              zIndex: 50,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
              {loadingMembers ? (
                <div style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Searching...</div>
              ) : members.length === 0 ? (
                <div style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                  No members found.
                </div>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => selectMember(member)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    className="dropdown-item"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div>
                      <div style={{ fontWeight: 500 }}>{member.name}</div>
                      <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>{member.mobile}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Overlay to close dropdown when clicking outside */}
          {showDropdown && (
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => setShowDropdown(false)}
            />
          )}
        </div>
        {selectedMember && (
          <div className="filter-info">
            Showing loans for: <strong>{selectedMember.name}</strong>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All Loans
        </button>
        <button
          className={`filter-tab ${filter === 'ACTIVE' ? 'active' : ''}`}
          onClick={() => setFilter('ACTIVE')}
        >
          Active
        </button>
        <button
          className={`filter-tab ${filter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setFilter('COMPLETED')}
        >
          Completed
        </button>
      </div>

      {/* Loans Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state">
            <Loader size={24} className="animate-spin" />
            <span>Loading loans...</span>
          </div>
        ) : loans.length === 0 ? (
          <div className="empty-state">
            <CircleDollarSign size={48} />
            <p>No loans found</p>
            <button className="btn btn-primary" onClick={() => setIsLoanModalOpen(true)}>
              <Plus size={20} />
              <span>Create First Loan</span>
            </button>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Member</th>
                    <th>Principal</th>
                    <th>Interest Rate</th>
                    <th>Time Period</th>
                    <th>EMI</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr
                      key={loan.id}
                      onClick={() => navigate(`/loans/${loan.id}`)}
                      className="clickable-row"
                    >
                      <td>#{loan.id}</td>
                      <td>
                        <div className="member-cell">
                          <span className="member-name">{loan.member?.name || 'N/A'}</span>
                          <span className="member-mobile">{loan.member?.mobile}</span>
                        </div>
                      </td>
                      <td>{formatCurrency(loan.principalAmount)}</td>
                      <td>{(loan.interestRate * 100).toFixed(1)}%</td>
                      <td>{loan.timePeriod} months</td>
                      <td>{formatCurrency(loan.emiAmount)}</td>
                      <td className="remaining-balance">
                        {formatCurrency(loan.remainingBalance)}
                      </td>
                      <td>{getStatusBadge(loan.status)}</td>
                      <td>{formatDate(loan.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pagination-controls">
                <div className="pagination-info">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="pagination-buttons">
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>
                  <span className="page-indicator">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    className="btn btn-small btn-secondary"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Loan Modal */}
      <LoanModal
        isOpen={isLoanModalOpen}
        onClose={() => setIsLoanModalOpen(false)}
        onSuccess={handleLoanSuccess}
        maxAmount={loanableAmount}
      />
    </div>
  );
};

export default Loans;
