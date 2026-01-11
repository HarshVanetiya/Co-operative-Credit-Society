import { useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader } from 'lucide-react';

const LoanPaymentModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [penalty, setPenalty] = useState('');
  const [extraPrincipal, setExtraPrincipal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!loan) return null;

  // Calculate payment details
  const interestAmount = loan.remainingBalance * loan.interestRate;
  const emiPrincipal = Math.min(loan.emiAmount, loan.remainingBalance);
  const penaltyAmount = parseFloat(penalty) || 0;
  const extraPrincipalAmount = parseFloat(extraPrincipal) || 0;
  
  // Max extra principal is remaining balance after EMI
  const remainingAfterEmi = loan.remainingBalance - emiPrincipal;
  const actualExtraPrincipal = Math.min(extraPrincipalAmount, remainingAfterEmi);
  
  // Total principal and total payment
  const totalPrincipalPaid = emiPrincipal + actualExtraPrincipal;
  const totalPayment = totalPrincipalPaid + interestAmount + penaltyAmount;

  const handlePenaltyChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPenalty(value);
      setError('');
    }
  };

  const handleExtraPrincipalChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setExtraPrincipal(value);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      await api.post(`/loan/pay/${loan.id}`, {
        penalty: penaltyAmount,
        extraPrincipal: actualExtraPrincipal,
      });

      alert('EMI payment recorded successfully!');
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err.response?.data?.error || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPenalty('');
    setExtraPrincipal('');
    setError('');
    onClose();
  };

  const formatCurrency = (amount) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pay EMI">
      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}

        {/* Payment Summary */}
        <div className="payment-summary-card">
          <h4>Payment Summary</h4>
          
          <div className="summary-row">
            <span>Current Balance:</span>
            <span className="value">{formatCurrency(loan.remainingBalance)}</span>
          </div>
          
          <div className="summary-row">
            <span>EMI (Principal):</span>
            <span className="value">{formatCurrency(emiPrincipal)}</span>
          </div>
          
          {actualExtraPrincipal > 0 && (
            <div className="summary-row extra-principal-row">
              <span>Extra Principal:</span>
              <span className="value">{formatCurrency(actualExtraPrincipal)}</span>
            </div>
          )}
          
          <div className="summary-row">
            <span>Interest ({(loan.interestRate * 100).toFixed(1)}%):</span>
            <span className="value">{formatCurrency(interestAmount)}</span>
          </div>
          
          <div className="summary-row">
            <span>Penalty:</span>
            <span className="value">{formatCurrency(penaltyAmount)}</span>
          </div>
          
          <div className="summary-row total">
            <span>Total Payment:</span>
            <span className="value">{formatCurrency(totalPayment)}</span>
          </div>

          <div className="summary-row remaining">
            <span>Remaining After Payment:</span>
            <span className="value">
              {formatCurrency(Math.max(0, loan.remainingBalance - totalPrincipalPaid))}
            </span>
          </div>
        </div>

        {/* Extra Principal Input */}
        <div className="form-group">
          <label className="label">Extra Principal (₹)</label>
          <input
            type="text"
            value={extraPrincipal}
            onChange={handleExtraPrincipalChange}
            className="input"
            placeholder="Pay extra to reduce principal (optional)"
            disabled={loading}
          />
          <small className="help-text">
            Paying extra reduces principal, lowering future interest. Max: {formatCurrency(remainingAfterEmi)}
          </small>
        </div>

        {/* Penalty Input */}
        <div className="form-group">
          <label className="label">Penalty Amount (₹)</label>
          <input
            type="text"
            value={penalty}
            onChange={handlePenaltyChange}
            className="input"
            placeholder="Enter penalty if any (optional)"
            disabled={loading}
          />
          <small className="help-text">
            Leave blank or 0 if no penalty applies
          </small>
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
            <span>{loading ? 'Processing...' : `Pay ${formatCurrency(totalPayment)}`}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LoanPaymentModal;

