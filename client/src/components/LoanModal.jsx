import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Search, Loader, X, ChevronDown } from 'lucide-react';

const LoanModal = ({ isOpen, onClose, onSuccess, maxAmount }) => {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [formData, setFormData] = useState({
    memberId: '',
    principalAmount: '',
    interestRate: '1',
    timePeriod: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchToken, setDebouncedSearchToken] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMemberName, setSelectedMemberName] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchToken(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isOpen) {
      // Reset search states when modal opens
      setSearchTerm('');
      setDebouncedSearchToken('');
      setSelectedMemberName('');
      setMembers([]);
      // Initial fetch
      fetchEligibleMembers('');
    }
  }, [isOpen]);

  // Fetch when debounced search changes
  useEffect(() => {
    if (isOpen) {
      fetchEligibleMembers(debouncedSearchToken);
    }
  }, [debouncedSearchToken]);

  const fetchEligibleMembers = async (search = '') => {
    setLoadingMembers(true);
    try {
      // Use the new query params
      // Force excludeActiveLoans=true
      const res = await api.get(`/member/list?search=${search}&excludeActiveLoans=true`);
      setMembers(res.data);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedMemberName(value); // Keep input in sync with typing
    setShowDropdown(true);
    setFormData(prev => ({ ...prev, memberId: '' })); // Clear selection while typing
  };

  const selectMember = (member) => {
    setFormData(prev => ({ ...prev, memberId: member.id }));
    setSelectedMemberName(member.name);
    setSearchTerm(member.name); // Set search term to name to keep it visible
    setShowDropdown(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // For number fields, validate input
    if (['principalAmount', 'interestRate', 'timePeriod'].includes(name)) {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { memberId, principalAmount, interestRate, timePeriod } = formData;

    // Validate
    if (!memberId) {
      setError('Please select a member');
      return;
    }

    const principal = parseFloat(principalAmount);
    if (!principal || principal <= 0) {
      setError('Please enter a valid principal amount');
      return;
    }

    if (principal > maxAmount) {
      setError(`Amount exceeds available funds. Max: ₹${maxAmount.toLocaleString()}`);
      return;
    }

    const rate = parseFloat(interestRate);
    if (!rate || rate <= 0) {
      setError('Please enter a valid interest rate');
      return;
    }

    const months = parseInt(timePeriod);
    if (!months || months <= 0) {
      setError('Please enter a valid time period');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/loan/create', {
        memberId: parseInt(memberId),
        principalAmount: principal,
        interestRate: rate,
        timePeriod: months,
      });

      alert('Loan created successfully!');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating loan:', err);
      setError(err.response?.data?.error || 'Failed to create loan');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      memberId: '',
      principalAmount: '',
      interestRate: '1',
      timePeriod: '',
    });
    setError('');
    onClose();
  };

  // Calculate EMI preview
  const calculateEmi = () => {
    const principal = parseFloat(formData.principalAmount) || 0;
    const months = parseInt(formData.timePeriod) || 0;
    if (principal > 0 && months > 0) {
      return (principal / months).toFixed(2);
    }
    return '0.00';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Loan">
      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="label">Select Member</label>
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search member by name..."
              value={selectedMemberName}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
              className="input"
              disabled={loading}
              autoComplete="off"
            />
            <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
              {loadingMembers ? <Loader size={16} className="animate-spin" /> : <ChevronDown size={16} />}
            </div>
          </div>

          {showDropdown && (
            <div className="dropdown-list" style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '200px',
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
                  {debouncedSearchToken ? 'No eligible members found.' : 'Type to search...'}
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
                    <div style={{ fontSize: '0.75em', background: '#e0e7ff', color: '#4f46e5', padding: '2px 6px', borderRadius: '4px' }}>
                      ID: {member.id}
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

          {members.length === 0 && !loadingMembers && debouncedSearchToken && (
            <small className="help-text">
              No members found matching "{debouncedSearchToken}" or they already have loans.
            </small>
          )}
        </div>

        <div className="form-group">
          <label className="label">Principal Amount (₹)</label>
          <input
            type="text"
            name="principalAmount"
            value={formData.principalAmount}
            onChange={handleChange}
            className="input"
            placeholder="Enter loan amount"
            disabled={loading}
          />
          <small className="help-text">
            Max available: ₹{(maxAmount || 0).toLocaleString()}
          </small>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Interest Rate (%)</label>
            <input
              type="text"
              name="interestRate"
              value={formData.interestRate}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 2"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="label">Time Period (months)</label>
            <input
              type="text"
              name="timePeriod"
              value={formData.timePeriod}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 6"
              disabled={loading}
            />
          </div>
        </div>

        {/* EMI Preview */}
        <div className="emi-preview">
          <span className="emi-label">Calculated EMI (per month):</span>
          <span className="emi-value">₹ {calculateEmi()}</span>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader size={20} className="animate-spin" /> : null}
            <span>{loading ? 'Creating...' : 'Create Loan'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LoanModal;
