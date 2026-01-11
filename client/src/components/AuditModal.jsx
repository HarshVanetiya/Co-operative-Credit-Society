import { useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader, AlertTriangle } from 'lucide-react';

const AuditModal = ({ isOpen, onClose, profit, memberCount, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const perMemberShare = memberCount > 0 ? profit / memberCount : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (profit <= 0) {
      setError('No profit available to distribute');
      return;
    }

    if (memberCount <= 0) {
      setError('No members to distribute profit to');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/audit/run');
      alert(`Audit completed! ₹${perMemberShare.toFixed(2)} has been added to each member's account.`);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error running audit:', err);
      setError(err.response?.data?.error || 'Failed to run audit');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const formatCurrency = (amount) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Run Audit - Distribute Profit">
      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}

        {/* Warning */}
        <div className="audit-warning">
          <AlertTriangle size={20} />
          <span>This action will distribute all accumulated profit to members and reset the profit to zero.</span>
        </div>

        {/* Audit Summary */}
        <div className="audit-summary-card">
          <div className="audit-row">
            <span>Total Accumulated Profit:</span>
            <span className="value highlight">{formatCurrency(profit)}</span>
          </div>
          
          <div className="audit-row">
            <span>Total Active Members:</span>
            <span className="value">{memberCount}</span>
          </div>
          
          <div className="audit-row result">
            <span>Per Member Share:</span>
            <span className="value">{formatCurrency(perMemberShare)}</span>
          </div>
        </div>

        <p className="audit-note">
          Each member's account balance will increase by <strong>{formatCurrency(perMemberShare)}</strong>.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || profit <= 0}
          >
            {loading ? <Loader size={20} className="animate-spin" /> : null}
            <span>{loading ? 'Processing...' : 'Confirm Audit'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AuditModal;
