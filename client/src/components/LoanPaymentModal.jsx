import { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader } from 'lucide-react';

const LoanPaymentModal = ({ isOpen, onClose, loan, onSuccess }) => {
  const [penalty, setPenalty] = useState('');
  const [principal, setPrincipal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Initialize principal with standard EMI amount when modal opens
  if (!loan && isOpen) return null; // Safety check

  // We need to set the initial principal value when loan data becomes available or modal opens
  // However, doing this in render or effect needs care to avoid loops.
  // Let's use a key or just default it in state initialization if possible, 
  // but loan prop might change. 
  // Better approach: Use useEffect to reset state when modal opens.

  // Use a separate useEffect for initialization
  // Note: We can't use hooks conditionally so we'll just put it at the top level
  // but we need to guard against loan being null in the effect.

  if (!loan) return null;

  const interestAmount = loan.remainingBalance * loan.interestRate;
  const standardEmiPrincipal = Math.min(loan.emiAmount, loan.remainingBalance);

  // Derive values from state for rendering
  const principalAmount = principal === '' ? standardEmiPrincipal : (parseFloat(principal) || 0);
  const penaltyAmount = parseFloat(penalty) || 0;

  const totalPayment = principalAmount + interestAmount + penaltyAmount;

  const handlePenaltyChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPenalty(value);
      setError('');
    }
  };

  const handlePrincipalChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setPrincipal(value);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    // Additional Validation
    if (principalAmount > loan.remainingBalance) {
      setError(`Principal cannot exceed remaining balance (₹${loan.remainingBalance})`);
      setLoading(false);
      return;
    }

    try {
      await api.post(`/loan/pay/${loan.id}`, {
        penalty: penaltyAmount,
        principalPaid: principalAmount,
      });

      alert('Payment recorded successfully!');
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
    setPrincipal(''); // Reset to empty to trigger default on next open if needed, or better logic in parent
    setError('');
    onClose();
  };

  const formatCurrency = (amount) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Pay Loan">
      <form onSubmit={handleSubmit} className="login-form">
        {error && <div className="error-message">{error}</div>}

        {/* Payment Summary */}
        <div className="payment-summary-card">
          <h4>Payment Breakdown</h4>

          <div className="summary-row">
            <span>Current Balance:</span>
            <span className="value">{formatCurrency(loan.remainingBalance)}</span>
          </div>

          <div className="summary-row">
            <span>Interest ({(loan.interestRate * 100).toFixed(1)}%):</span>
            <span className="value">{formatCurrency(interestAmount)}</span>
          </div>

          <div className="summary-row">
            <span>Principal Payment:</span>
            <span className="value">{formatCurrency(principalAmount)}</span>
          </div>

          <div className="summary-row">
            <span>Penalty:</span>
            <span className="value">{formatCurrency(penaltyAmount)}</span>
          </div>

          <div className="summary-row total">
            <span>Total To Pay:</span>
            <span className="value">{formatCurrency(totalPayment)}</span>
          </div>

          <div className="summary-row remaining">
            <span>Remaining After Payment:</span>
            <span className="value">
              {formatCurrency(Math.max(0, loan.remainingBalance - principalAmount))}
            </span>
          </div>
        </div>

        {/* Principal Input */}
        <div className="form-group">
          <label className="label">Principal Amount (₹)</label>
          <input
            ref={inputRef}
            type="text"
            value={principal === '' ? standardEmiPrincipal : principal}
            onChange={handlePrincipalChange}
            className="input"
            placeholder={`Default: ${standardEmiPrincipal}`}
            disabled={loading}
          />
          <small className="help-text">
            You can adjust the principal amount. Max: {formatCurrency(loan.remainingBalance)}
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

