import { useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader } from 'lucide-react';

const DepositModal = ({ isOpen, onClose, member, onSuccess }) => {
  const [formData, setFormData] = useState({
    basicAmount: '500',
    developmentFee: '20',
    penalty: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const basicPay = parseFloat(formData.basicAmount) || 0;
    const developmentFee = parseFloat(formData.developmentFee) || 0;
    const penalty = parseFloat(formData.penalty) || 0;

    // Validate at least one amount is entered
    if (basicPay === 0 && developmentFee === 0 && penalty === 0) {
      setError('Please enter at least one amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/transaction/create', {
        memberId: member.id,
        accountId: member.account?.id,
        basicPay,
        developmentFee,
        penalty,
      });

      alert('Transaction recorded successfully!');

      // Reset form and close modal
      setFormData({ basicAmount: '', developmentFee: '', penalty: '' });
      onClose();

      // Callback to refresh member data
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating transaction:', err);
      setError(err.response?.data?.error || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ basicAmount: '500', developmentFee: '20', penalty: '' });
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Deposit Money">
      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label className="label">Basic Amount (₹)</label>
          <input
            type="text"
            name="basicAmount"
            value={formData.basicAmount}
            onChange={handleChange}
            className="input"
            placeholder="Enter basic amount"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="label">Development Fee (₹)</label>
          <input
            type="text"
            name="developmentFee"
            value={formData.developmentFee}
            onChange={handleChange}
            className="input"
            placeholder="Enter development fee"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label className="label">Penalty (₹)</label>
          <input
            type="text"
            name="penalty"
            value={formData.penalty}
            onChange={handleChange}
            className="input"
            placeholder="Enter penalty amount"
            disabled={loading}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader size={20} className="animate-spin" /> : null}
            <span>{loading ? 'Processing...' : 'Submit Deposit'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DepositModal;
