import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Save, Loader, Wallet, Receipt, CircleDollarSign, Clock, CheckCircle, Trash2, Calculator } from 'lucide-react';
import DepositModal from '../components/DepositModal';
import SmartDistributeModal from '../components/SmartDistributeModal';
import ReceiptModal from '../components/ReceiptModal';
import ReleasedMoneyModal from '../components/ReleasedMoneyModal';

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
  const [isSmartDistributeModalOpen, setIsSmartDistributeModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isReleasedMoneyModalOpen, setIsReleasedMoneyModalOpen] = useState(false);
  const [releasedLogs, setReleasedLogs] = useState([]);
  const [loadingReleasedLogs, setLoadingReleasedLogs] = useState(false);

  useEffect(() => {
    fetchMember();
    fetchTransactions();
    fetchLoans();
    fetchReleasedLogs();
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

  const fetchReleasedLogs = async () => {
    setLoadingReleasedLogs(true);
    try {
      const res = await api.get(`/released-money/logs/${id}`);
      setReleasedLogs(res.data);
    } catch (error) {
      console.error('Error fetching released money logs', error);
    } finally {
      setLoadingReleasedLogs(false);
    }
  };

  const handleDepositSuccess = () => {
    // Refresh member data and transactions
    fetchMember();
    fetchTransactions();
    fetchLoans();
    fetchReleasedLogs();
  };



  const deleteTransaction = async (transactionId) => {
    if (!window.confirm("Are you sure you want to delete this transaction? This action will revert all financial changes.")) {
      return;
    }

    try {
      await api.delete(`/transaction/${transactionId}`);
      // Refresh list
      fetchTransactions();
      fetchMember(); // Balance changed
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert("Failed to delete transaction");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (['name', 'fathersName'].includes(name)) {
      const capitalizedValue = value.replace(/\b\w/g, (char) => char.toUpperCase());
      setMember(prev => ({ ...prev, [name]: capitalizedValue }));
    } else {
      setMember(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updateData = {
        name: member.name,
        mobile: member.mobile,
        address: member.address,
        fathersName: member.fathersName,
        accountNumber: member.account?.accountNumber
      };
      const response = await api.put(`/member/update/${id}`, updateData);
      // Update local state with response
      setMember(response.data);
      alert('Member updated successfully!');
    } catch (error) {
      console.error('Error updating member', error);
      const errorMessage = error.response?.data?.error || 'Failed to update member.';
      setError(errorMessage);
      alert(errorMessage);
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
    return `₹ ${Math.round(parseFloat(amount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  if (loading) return <div className="empty-state">Loading...</div>;
  if (error) return <div className="empty-state" style={{ color: 'var(--danger)' }}>{error}</div>;

  const hasOldSchemeLoan = member.loans?.some(loan => loan.status === 'ACTIVE' && loan.type === 'OLD');

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
                onChange={handleChange}
                className="input"
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
                    name="accountNumber"
                    value={member.account?.accountNumber || ''}
                    onChange={(e) => setMember(prev => ({
                      ...prev,
                      account: { ...prev.account, accountNumber: e.target.value }
                    }))}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Total Amount</label>
                  <input
                    type="text"
                    value={`₹ ${Math.round(member.account.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    readOnly
                    className="input read-only"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Released Money</label>
                  <input
                    type="text"
                    value={`₹ ${Math.round(member.account.releasedMoney || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
                    readOnly
                    className="input read-only"
                    style={{ color: member.account.releasedMoney > 0 ? 'var(--warning, #f59e0b)' : 'inherit' }}
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
            <button
              type="button"
              className="btn btn-primary"
              style={{ backgroundColor: hasOldSchemeLoan ? '#9ca3af' : 'var(--success, #10b981)' }}
              onClick={() => setIsSmartDistributeModalOpen(true)}
              disabled={hasOldSchemeLoan}
              title={hasOldSchemeLoan ? "Smart Distribute is not available for OLD scheme loans" : ""}
            >
              <Calculator size={20} />
              <span>Smart Distribute</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ backgroundColor: 'var(--warning, #f59e0b)', color: 'white', borderColor: 'var(--warning, #f59e0b)' }}
              onClick={() => setIsReleasedMoneyModalOpen(true)}
            >
              <CircleDollarSign size={20} />
              <span>Released Money</span>
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
                  <th>Action</th>
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
                      <td>
                        <button
                          className="btn-icon danger"
                          onClick={() => deleteTransaction(tx.id)}
                          title="Delete Transaction"
                          style={{ padding: '4px', color: 'red' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
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

      {/* Released Money Logs Section */}
      <div className="card transaction-history-section">
        <div className="section-header">
          <h3 className="section-title">
            <CircleDollarSign size={20} />
            Released Money History
          </h3>
        </div>

        {loadingReleasedLogs ? (
          <div className="empty-state">
            <Loader size={20} className="animate-spin" />
            <span>Loading history...</span>
          </div>
        ) : releasedLogs.length === 0 ? (
          <div className="empty-state">No released money history yet</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Profit</th>
                </tr>
              </thead>
              <tbody>
                {releasedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.createdAt)}</td>
                    <td>
                      <span className={`status-badge ${log.type === 'RELEASE' ? 'status-active' : 'status-completed'}`}>
                        {log.type === 'RELEASE' ? 'Released' : 'Settled'}
                      </span>
                    </td>
                    <td className="font-bold">{formatCurrency(log.amount)}</td>
                    <td style={{ color: 'var(--success)' }}>
                      {log.profit > 0 ? formatCurrency(log.profit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReleasedMoneyModal
        isOpen={isReleasedMoneyModalOpen}
        onClose={() => setIsReleasedMoneyModalOpen(false)}
        member={member}
        onSuccess={handleDepositSuccess}
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        member={member}
        onSuccess={handleDepositSuccess}
      />

      <SmartDistributeModal
        isOpen={isSmartDistributeModalOpen}
        onClose={() => setIsSmartDistributeModalOpen(false)}
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

