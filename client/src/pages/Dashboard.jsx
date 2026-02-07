import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, IndianRupee, Building2, TrendingUp, CircleDollarSign, AlertCircle, ClipboardCheck, Wallet, ArrowDownCircle, ExternalLink, Download, Database } from 'lucide-react';
import api from '../lib/api';
import AuditModal from '../components/AuditModal';
import WithdrawalModal from '../components/WithdrawalModal';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [hasMoreWithdrawals, setHasMoreWithdrawals] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchWithdrawals();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/overview/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWithdrawals = async () => {
    try {
      // Fetch 4 to check if there are more than 3
      const res = await api.get('/withdrawal/list?limit=4');
      setHasMoreWithdrawals(res.data.data.length > 3);
      setWithdrawals(res.data.data.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch withdrawals', error);
    }
  };

  const handleWithdrawalSuccess = () => {
    fetchStats();
    fetchWithdrawals();
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const response = await api.get('/backup/download', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Get filename from content-disposition header if available
      const contentDisposition = response.headers['content-disposition'];
      let filename = `bank_backup_${new Date().toISOString().split('T')[0]}.zip`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Backup failed', error);
      alert('Failed to download system backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹ ${Math.round(parseFloat(amount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="dashboard-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            {loading ? 'Loading...' : stats?.organisation?.name || 'My Organisation'}
          </h1>
          <p className="hero-subtitle">
            Welcome back, {user?.username}! Here's an overview of your banking portal.
          </p>
        </div>
        <div className="hero-decoration"></div>
      </div>

      {/* Primary Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card-filled" style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)', color: 'white' }}>
          <div className="stat-icon" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
            <Wallet size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Cash in Hand</p>
            <h2 className="stat-value" style={{ color: 'white' }}>
              {loading ? '...' : formatCurrency(stats?.cashInHand)}
            </h2>
          </div>
        </div>

        <div className="stat-card-filled">
          <div className="stat-icon">
            <IndianRupee size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Organisation Amount</p>
            <h2 className="stat-value">
              {loading ? '...' : formatCurrency(stats?.organisation?.amount)}
            </h2>
          </div>
        </div>

        <div className="stat-card-filled">
          <div className="stat-icon savings">
            <IndianRupee size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Members Total Amount</p>
            <h2 className="stat-value">
              {loading ? '...' : formatCurrency(stats?.totalMembersAmount)}
            </h2>
          </div>
        </div>

        <div className="stat-card-filled">
          <div className="stat-icon members">
            <Users size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Members</p>
            <h2 className="stat-value">
              {loading ? '...' : stats?.memberCount || '0'}
            </h2>
          </div>
        </div>
        <div className="stat-card-filled">
          <div className="stat-icon org">
            <Building2 size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Total Penalty</p>
            <h2 className="stat-value">
              {loading ? '...' : formatCurrency(stats?.organisation?.penalty)}
            </h2>
          </div>
        </div>

        <div className="stat-card-filled" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }}>
          <div className="stat-icon" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
            <CircleDollarSign size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Advance Money</p>
            <h2 className="stat-value" style={{ color: 'white' }}>
              {loading ? '...' : formatCurrency(stats?.totalReleasedAmount)}
            </h2>
          </div>
        </div>
      </div>

      {/* Organisation Actions Section */}
      <div className="org-actions-section">
        <h3 className="org-actions-title">Organisation Actions</h3>
        <div className="org-actions-buttons">
          <button
            className="btn btn-primary"
            onClick={() => setIsWithdrawalModalOpen(true)}
            disabled={loading}
          >
            <Wallet size={20} />
            <span>Withdraw Funds</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/org-expenses')}
          >
            <ExternalLink size={20} />
            <span>View All Expenses</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleBackup}
            disabled={backupLoading}
            style={{ border: '1px solid #4f46e5', color: '#4f46e5' }}
          >
            {backupLoading ? <Database size={20} className="animate-spin" /> : <Download size={20} />}
            <span>{backupLoading ? 'Generating...' : 'Backup System Data'}</span>
          </button>
        </div>
      </div >

      {/* Loan & Profit Stats */}
      < div className="section-divider" >
        <h2 className="section-heading">Loan & Profit Overview</h2>
      </div >

      <div className="stats-grid loan-stats">
        <div className="stat-card-filled profit-card">
          <div className="stat-icon profit">
            <TrendingUp size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Accumulated Profit</p>
            <h2 className="stat-value profit-value">
              {loading ? '...' : formatCurrency(stats?.organisation?.profit)}
            </h2>
            <button
              className="btn btn-small btn-audit"
              onClick={() => setIsAuditModalOpen(true)}
              disabled={!stats?.organisation?.profit || stats?.organisation?.profit <= 0}
            >
              <ClipboardCheck size={16} />
              Run Audit
            </button>
          </div>
        </div>

        <div className="stat-card-filled">
          <div className="stat-icon loanable">
            <CircleDollarSign size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Available for Loan</p>
            <h2 className="stat-value">
              {loading ? '...' : formatCurrency(stats?.loanableAmount)}
            </h2>
          </div>
        </div>

        <div className="stat-card-filled">
          <div className="stat-icon active-loans">
            <CircleDollarSign size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Active Loans Total</p>
            <h2 className="stat-value">
              {loading ? '...' : formatCurrency(stats?.totalLoanedAmount)}
            </h2>
            <small className="stat-subtext">
              Active Count: {loading ? '...' : stats?.activeLoansCount || '0'}
            </small>
          </div>
        </div>

        <div
          className="stat-card-filled clickable"
          onClick={() => navigate('/loans')}
        >
          <div className="stat-icon">
            <CircleDollarSign size={28} />
          </div>
          <div className="stat-info">
            <p className="stat-label">Manage Loans</p>
            <span className="view-all-link">View All Loans →</span>
          </div>
        </div>
      </div>

      {/* Recent Withdrawals */}
      {
        withdrawals.length > 0 && (
          <div className="withdrawal-history-section">
            <div className="section-header">
              <div className="section-header-alert">
                <ArrowDownCircle size={24} />
                <h2 className="section-heading">Recent Expenses</h2>
              </div>
              {hasMoreWithdrawals && (
                <button
                  className="btn btn-small btn-secondary"
                  onClick={() => navigate('/org-expenses')}
                >
                  View All →
                </button>
              )}
            </div>

            <div className="card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Purpose</th>
                      <th>Source</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td>{formatDate(withdrawal.createdAt)}</td>
                        <td>{withdrawal.purpose}</td>
                        <td>
                          <span className={`source-badge ${withdrawal.source.toLowerCase()}`}>
                            {withdrawal.source === 'AMOUNT' ? 'Org Amount' : 'Penalty Fund'}
                          </span>
                        </td>
                        <td className="withdrawal-amount">{formatCurrency(withdrawal.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      {/* Missing Deposits Section */}
      {
        !loading && stats?.membersWithPendingDeposits?.length > 0 && (
          <div className="pending-deposits-section">
            <div className="section-header-alert">
              <AlertCircle size={24} />
              <h2 className="section-heading">Members With Pending Deposits</h2>
              <span className="count-badge">{stats.membersWithPendingDeposits.length}</span>
            </div>

            <div className="card">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Mobile</th>
                      <th>Account No.</th>
                      <th>Missed Months</th>
                      <th>Deposits Due</th>
                      <th>Penalty</th>
                      <th>Total Suggested</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.membersWithPendingDeposits.map((member) => (
                      <tr
                        key={member.id}
                        className="clickable-row"
                        onClick={() => navigate(`/members/${member.id}`)}
                      >
                        <td>{member.name || 'N/A'}</td>
                        <td>{member.mobile}</td>
                        <td>{member.accountNumber}</td>
                        <td>
                          <span className="missed-badge">{member.missedMonths} month(s)</span>
                        </td>
                        <td>{formatCurrency(member.breakdown.deposits)}</td>
                        <td className="penalty-amount">{formatCurrency(member.breakdown.penalty)}</td>
                        <td className="suggested-total">{formatCurrency(member.suggestedPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      {/* Audit Modal */}
      <AuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        profit={stats?.organisation?.profit || 0}
        memberCount={stats?.memberCount || 0}
        onSuccess={fetchStats}
      />

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        onSuccess={handleWithdrawalSuccess}
        orgAmount={stats?.organisation?.amount || 0}
        penaltyAmount={stats?.organisation?.penalty || 0}
      />
    </div >
  );
};

export default Dashboard;

