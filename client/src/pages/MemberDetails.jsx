import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Save, Loader, Wallet, Receipt, CircleDollarSign, Clock, CheckCircle } from 'lucide-react';
import DepositModal from '../components/DepositModal';
import ReceiptModal from '../components/ReceiptModal';

const MemberDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [member, setMember] = useState({ name: '', fathersName: '', mobile: '', address: '', account: null });
  const [transactions, setTransactions] = useState([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loans, setLoans] = useState([]);
  const [hasMoreLoans, setHasMoreLoans] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [error, setError] = useState('');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  useEffect(() => {
    fetchMember();
    fetchTransactions();
    fetchLoans();
  }, [id]);

  const fetchMember = async () => {
    try {
      const res = await api.get(`/member/get/${id}`);
      if (res.data) {
          setMember(res.data);
      }
    } catch (error) {
      console.error('Error fetching member', error);
      setError('Could not load member details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      // Fetch 4 to check if there are more than 3
      const res = await api.get(`/transaction/member/${id}?limit=4`);
      setHasMoreTransactions(res.data.length > 3);
      setTransactions(res.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching transactions', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchLoans = async () => {
    setLoadingLoans(true);
    try {
      // Fetch 4 to check if there are more than 3
      const res = await api.get(`/loan/member/${id}?limit=4`);
      setHasMoreLoans(res.data.length > 3);
      setLoans(res.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching loans', error);
    } finally {
      setLoadingLoans(false);
    }
  };

  const handleDepositSuccess = () => {
    // Refresh member data and transactions
    fetchMember();
    fetchTransactions();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMember(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData = {
        name: member.name,
        mobile: member.mobile,
        address: member.address,
        fathersName: member.fathersName
      };
      await api.put(`/member/update/${id}`, updateData);
      alert('Member updated successfully!');
    } catch (error) {
      console.error('Error updating member', error);
      alert('Failed to update member.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatCurrency = (amount) => {
    return `₹ ${(amount || 0).toLocaleString()}`;
  };

  if (loading) return <div className="empty-state">Loading...</div>;
  if (error) return <div className="empty-state" style={{color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="details-container">
      <button 
        onClick={() => navigate('/members')}
        className="back-link"
      >
        <ArrowLeft size={16} />
        Back to Members
      </button>

      <div className="details-header">
        <h1 className="page-title">Member Details</h1>
        <div className="id-badge">
            ID: {id}
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-grid">
            <div className="form-group">
              <label className="label">Full Name</label>
              <input
                type="text"
                name="name"
                value={member.name || ''}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="form-group">
              <label className="label">Father's Name</label>
              <input
                type="text"
                name="fathersName"
                value={member.fathersName || ''}
                onChange={handleChange}
                className="input"
              />
            </div>
            
            <div className="form-group">
              <label className="label">Mobile Number</label>
              <input
                type="text"
                name="mobile"
                value={member.mobile || ''}
                readOnly
                className="input read-only"
                title="Mobile number cannot be changed"
              />
            </div>

            <div className="form-group col-span-2">
              <label className="label">Address</label>
              <textarea
                name="address"
                value={member.address || ''}
                onChange={handleChange}
                className="input textarea"
              />
            </div>
          </div>

          {/* Account Information - Read Only */}
          {member.account && (
            <div className="account-info-section">
              <h3 className="section-title">Account Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Account Number</label>
                  <input
                    type="text"
                    value={member.account.accountNumber || ''}
                    readOnly
                    className="input read-only"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Total Amount</label>
                  <input
                    type="text"
                    value={`₹ ${member.account.totalAmount?.toLocaleString() || '0'}`}
                    readOnly
                    className="input read-only"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsDepositModalOpen(true)}
            >
              <Wallet size={20} />
              <span>Deposit Money</span>
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Transaction History Section */}
      <div className="card transaction-history-section">
        <div className="section-header">
          <h3 className="section-title">
            <Receipt size={20} />
            Transaction History
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
                className="btn btn-small btn-primary"
                onClick={() => setIsReceiptModalOpen(true)}
                style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
            >
                Generate Receipt
            </button>
            {hasMoreTransactions && (
                <button 
                className="btn btn-small btn-secondary"
                onClick={() => navigate(`/history?mobile=${member.mobile}`)}
                >
                View All →
                </button>
            )}
          </div>
        </div>
        
        {loadingTransactions ? (
          <div className="empty-state">
            <Loader size={20} className="animate-spin" />
            <span>Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">No transactions yet</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Basic Pay</th>
                  <th>Dev Fee</th>
                  <th>Penalty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const total = (tx.basicPay || 0) + (tx.developmentFee || 0) + (tx.penalty || 0);
                  return (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.createdAt)}</td>
                      <td>{formatCurrency(tx.basicPay)}</td>
                      <td>{formatCurrency(tx.developmentFee)}</td>
                      <td>{formatCurrency(tx.penalty)}</td>
                      <td className="font-bold">{formatCurrency(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member Loans Section */}
      <div className="card transaction-history-section">
        <div className="section-header">
          <h3 className="section-title">
            <CircleDollarSign size={20} />
            Loan History
          </h3>
          {hasMoreLoans && (
            <button 
              className="btn btn-small btn-secondary"
              onClick={() => navigate(`/loans?memberId=${id}`)}
            >
              View All →
            </button>
          )}
        </div>
        
        {loadingLoans ? (
          <div className="empty-state">
            <Loader size={20} className="animate-spin" />
            <span>Loading loans...</span>
          </div>
        ) : loans.length === 0 ? (
          <div className="empty-state">No loans yet</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Principal</th>
                  <th>Interest</th>
                  <th>Period</th>
                  <th>Remaining</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td>#{loan.id}</td>
                    <td>{formatCurrency(loan.principalAmount)}</td>
                    <td>{(loan.interestRate * 100).toFixed(1)}%</td>
                    <td>{loan.timePeriod} months</td>
                    <td className="remaining-balance">{formatCurrency(loan.remainingBalance)}</td>
                    <td>
                      {loan.status === 'ACTIVE' ? (
                        <span className="status-badge status-active">
                          <Clock size={14} /> Active
                        </span>
                      ) : (
                        <span className="status-badge status-completed">
                          <CheckCircle size={14} /> Completed
                        </span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-small btn-secondary"
                        onClick={() => navigate(`/loans/${loan.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        member={member}
        onSuccess={handleDepositSuccess}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        member={member}
      />
    </div>
  );
};

export default MemberDetails;

