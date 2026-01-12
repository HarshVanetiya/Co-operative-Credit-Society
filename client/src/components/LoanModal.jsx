import { useState, useEffect } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      fetchEligibleMembers();
    }
  }, [isOpen]);

  const fetchEligibleMembers = async () => {
    setLoadingMembers(true);
    try {
      // Get all members
      const membersRes = await api.get('/member/list');
      
      // Get all active loans to filter out members who already have one
      const loansRes = await api.get('/loan/all?status=ACTIVE');
      const membersWithActiveLoans = new Set(loansRes.data.data.map(loan => loan.memberId));
      
      // Filter to only members without active loans
      const eligibleMembers = membersRes.data.filter(
        member => !membersWithActiveLoans.has(member.id)
      );
      
      setMembers(eligibleMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoadingMembers(false);
    }
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
      interestRate: '2',
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

        <div className="form-group">
          <label className="label">Select Member</label>
          {loadingMembers ? (
            <div className="loading-inline">
              <Loader size={16} className="animate-spin" />
              Loading members...
            </div>
          ) : (
            <select
              name="memberId"
              value={formData.memberId}
              onChange={handleChange}
              className="input"
              disabled={loading}
            >
              <option value="">-- Select Member --</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.mobile})
                </option>
              ))}
            </select>
          )}
          {members.length === 0 && !loadingMembers && (
            <small className="help-text">
              No eligible members. All members already have active loans.
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
