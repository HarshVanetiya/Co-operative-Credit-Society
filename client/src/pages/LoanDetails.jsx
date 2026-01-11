import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Loader, CircleDollarSign, Receipt, Wallet, CheckCircle, Clock } from 'lucide-react';
import LoanPaymentModal from '../components/LoanPaymentModal';

const LoanDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchLoan();
  }, [id]);

  const fetchLoan = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/loan/get/${id}`);
      setLoan(res.data);
    } catch (err) {
      console.error('Error fetching loan:', err);
      setError('Could not load loan details.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
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

  if (loading) return <div className="empty-state"><Loader size={24} className="animate-spin" /> Loading...</div>;
  if (error) return <div className="empty-state" style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!loan) return <div className="empty-state">Loan not found</div>;

  // Calculate next payment details
  const nextInterest = loan.remainingBalance * loan.interestRate;
  const nextEmi = Math.min(loan.emiAmount, loan.remainingBalance);
  const nextTotal = nextEmi + nextInterest;

  return (
    <div className="details-container">
      <button onClick={() => navigate('/loans')} className="back-link">
        <ArrowLeft size={16} />
        Back to Loans
      </button>

      <div className="details-header">
        <h1 className="page-title">
          <CircleDollarSign size={28} />
          Loan Details
        </h1>
        <div className="header-badges">
          <div className="id-badge">Loan #{id}</div>
          {getStatusBadge(loan.status)}
        </div>
      </div>

      {/* Loan Summary Card */}
      <div className="card">
        <h3 className="section-title">Loan Information</h3>
        <div className="loan-summary-grid">
          <div className="loan-info-item">
            <span className="loan-label">Member</span>
            <span className="loan-value">{loan.member?.name || 'N/A'}</span>
            <span className="loan-subvalue">{loan.member?.mobile}</span>
          </div>
          <div className="loan-info-item">
            <span className="loan-label">Principal Amount</span>
            <span className="loan-value">{formatCurrency(loan.principalAmount)}</span>
          </div>
          <div className="loan-info-item">
            <span className="loan-label">Interest Rate</span>
            <span className="loan-value">{(loan.interestRate * 100).toFixed(1)}% / month</span>
          </div>
          <div className="loan-info-item">
            <span className="loan-label">Time Period</span>
            <span className="loan-value">{loan.timePeriod} months</span>
          </div>
          <div className="loan-info-item">
            <span className="loan-label">EMI Amount</span>
            <span className="loan-value">{formatCurrency(loan.emiAmount)}</span>
          </div>
          <div className="loan-info-item highlight">
            <span className="loan-label">Remaining Balance</span>
            <span className="loan-value">{formatCurrency(loan.remainingBalance)}</span>
          </div>
          <div className="loan-info-item">
            <span className="loan-label">Total Interest Paid</span>
            <span className="loan-value">{formatCurrency(loan.totalInterestPaid)}</span>
          </div>
          <div className="loan-info-item">
            <span className="loan-label">Created On</span>
            <span className="loan-value">{formatDate(loan.createdAt)}</span>
          </div>
        </div>

        {/* Next Payment Preview (only if active) */}
        {loan.status === 'ACTIVE' && (
          <div className="next-payment-section">
            <h4 className="subsection-title">Next Payment Due</h4>
            <div className="next-payment-summary">
              <div className="payment-breakdown">
                <span>Principal (EMI): {formatCurrency(nextEmi)}</span>
                <span>Interest ({(loan.interestRate * 100).toFixed(1)}%): {formatCurrency(nextInterest)}</span>
                <span className="payment-total">Total: <strong>{formatCurrency(nextTotal)}</strong></span>
              </div>
              <button className="btn btn-primary" onClick={() => setIsPaymentModalOpen(true)}>
                <Wallet size={20} />
                <span>Pay EMI</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="card transaction-history-section">
        <div className="section-header">
          <h3 className="section-title">
            <Receipt size={20} />
            Payment History
          </h3>
        </div>

        {loan.loanPayments?.length === 0 ? (
          <div className="empty-state">No payments recorded yet</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Principal</th>
                  <th>Extra Principal</th>
                  <th>Interest</th>
                  <th>Penalty</th>
                  <th>Total Paid</th>
                  <th>Remaining After</th>
                </tr>
              </thead>
              <tbody>
                {loan.loanPayments?.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.createdAt)}</td>
                    <td>{formatCurrency(payment.principalPaid - (payment.extraPrincipal || 0))}</td>
                    <td className={payment.extraPrincipal > 0 ? 'extra-principal-highlight' : ''}>
                      {formatCurrency(payment.extraPrincipal || 0)}
                    </td>
                    <td>{formatCurrency(payment.interestPaid)}</td>
                    <td>{formatCurrency(payment.penalty)}</td>
                    <td className="font-bold">{formatCurrency(payment.totalPaid)}</td>
                    <td>{formatCurrency(payment.remainingAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <LoanPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        loan={loan}
        onSuccess={fetchLoan}
      />
    </div>
  );
};

export default LoanDetails;
