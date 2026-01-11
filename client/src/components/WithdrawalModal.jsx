import { useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader } from 'lucide-react';

const WithdrawalModal = ({ isOpen, onClose, onSuccess, orgAmount, penaltyAmount }) => {
  const [formData, setFormData] = useState({
    purpose: '',
    amount: '',
    source: 'AMOUNT',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
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

    const { purpose, amount, source } = formData;

    // Validate
    if (!purpose.trim()) {
      setError('Please enter a purpose for the withdrawal');
      return;
    }
    
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const availableBalance = source === 'AMOUNT' ? orgAmount : penaltyAmount;
    if (withdrawAmount > availableBalance) {
      setError(`Amount exceeds available balance. Max: ₹${availableBalance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/withdrawal/create', {
        purpose: purpose.trim(),
        amount: withdrawAmount,
        source,
      });

      alert('Withdrawal recorded successfully!');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating withdrawal:', err);
      setError(err.response?.data?.error || 'Failed to create withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      purpose: '',
      amount: '',
      source: 'AMOUNT',
    });
    setError('');
    onClose();
  };

  const formatCurrency = (amount) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const selectedBalance = formData.source === 'AMOUNT' ? orgAmount : penaltyAmount;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Withdraw Funds">
      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label className="label">Purpose</label>
          <input
            type="text"
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            className="input"
            placeholder="e.g., Annual Event 2025, Office Supplies"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="label">Source Account</label>
          <select
            name="source"
            value={formData.source}
            onChange={handleChange}
            className="input"
            disabled={loading}
          >
            <option value="AMOUNT">Organisation Amount ({formatCurrency(orgAmount)})</option>
            <option value="PENALTY">Penalty Fund ({formatCurrency(penaltyAmount)})</option>
          </select>
          <small className="help-text">
            Available: {formatCurrency(selectedBalance)}
          </small>
        </div>

        <div className="form-group">
          <label className="label">Amount (₹)</label>
          <input
            type="text"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="input"
            placeholder="Enter withdrawal amount"
            disabled={loading}
          />
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
            <span>{loading ? 'Processing...' : 'Withdraw'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default WithdrawalModal;
