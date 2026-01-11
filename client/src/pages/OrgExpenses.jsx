import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowLeft, Loader, Download, ChevronLeft, ChevronRight } from 'lucide-react';

const OrgExpenses = () => {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchWithdrawals(1);
  }, []);

  const fetchWithdrawals = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/withdrawal/list?page=${page}&limit=20`);
      setWithdrawals(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchWithdrawals(page);
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

  return (
    <div className="history-container">
      <button 
        onClick={() => navigate('/')}
        className="back-link"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </button>

      <div className="page-header">
        <h1 className="page-title">
          <Download size={28} />
          Organisation Expenses
        </h1>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state">
            <Loader size={24} className="animate-spin" />
            <span>Loading expenses...</span>
          </div>
        ) : withdrawals.length === 0 ? (
          <div className="empty-state">No expenses found</div>
        ) : (
          <>
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

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="pagination-controls">
                <div className="pagination-info">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="pagination-buttons">
                  <button 
                    className="btn btn-small btn-secondary"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>
                  <span className="page-indicator">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button 
                    className="btn btn-small btn-secondary"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OrgExpenses;
