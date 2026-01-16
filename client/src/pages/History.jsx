import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { Search, Filter, X, Loader, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

const History = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({
    name: '',
    accountNumber: '',
    mobile: searchParams.get('mobile') || '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(!!searchParams.get('mobile'));

  useEffect(() => {
    // If mobile is in URL, apply filter immediately
    if (searchParams.get('mobile')) {
      fetchTransactions({ mobile: searchParams.get('mobile') }, 1);
    } else {
      fetchTransactions({}, 1);
    }
  }, []);

  const fetchTransactions = async (filterParams = {}, page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filterParams).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      params.append('page', page);
      params.append('limit', 20);

      const res = await api.get(`/transaction/list?${params}`);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction? This action will revert all financial changes.")) {
      return;
    }

    try {
      await api.delete(`/transaction/${id}`);
      // Refresh list
      fetchTransactions(filters, pagination.page);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert("Failed to delete transaction");
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchTransactions(filters, 1);
  };

  const clearFilters = () => {
    const clearedFilters = {
      name: '',
      accountNumber: '',
      mobile: '',
      startDate: '',
      endDate: '',
    };
    setFilters(clearedFilters);
    setSearchParams({});
    fetchTransactions({}, 1);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchTransactions(filters, page);
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
      <div className="page-header">
        <h1 className="page-title">Transaction History</h1>
        <button
          className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} />
          <span>Filters</span>
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card filter-panel">
          <div className="filter-grid">
            <div className="form-group">
              <label className="label">Member Name</label>
              <input
                type="text"
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                className="input"
                placeholder="Search by name"
              />
            </div>
            <div className="form-group">
              <label className="label">Account Number</label>
              <input
                type="text"
                name="accountNumber"
                value={filters.accountNumber}
                onChange={handleFilterChange}
                className="input"
                placeholder="Search by account"
              />
            </div>
            <div className="form-group">
              <label className="label">Mobile Number</label>
              <input
                type="text"
                name="mobile"
                value={filters.mobile}
                onChange={handleFilterChange}
                className="input"
                placeholder="Search by mobile"
              />
            </div>
            <div className="form-group">
              <label className="label">From Date</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">To Date</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="input"
              />
            </div>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={clearFilters}>
              <X size={16} />
              <span>Clear</span>
            </button>
            <button className="btn btn-primary" onClick={applyFilters}>
              <Search size={16} />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="card">
        {loading ? (
          <div className="empty-state">
            <Loader size={24} className="animate-spin" />
            <span>Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">No transactions found</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Member Name</th>
                    <th>Account No.</th>
                    <th>Mobile</th>
                    <th>Basic Pay</th>
                    <th>Dev Fee</th>
                    <th>Penalty</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const total = (tx.basicPay || 0) + (tx.developmentFee || 0) + (tx.penalty || 0);
                    return (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.createdAt)}</td>
                        <td>{tx.member?.name || 'N/A'}</td>
                        <td className="font-mono">{tx.account?.accountNumber || 'N/A'}</td>
                        <td>{tx.member?.mobile || 'N/A'}</td>
                        <td>{formatCurrency(tx.basicPay)}</td>
                        <td>{formatCurrency(tx.developmentFee)}</td>
                        <td>{formatCurrency(tx.penalty)}</td>
                        <td className="font-bold">{formatCurrency(total)}</td>
                        <td>
                          <button
                            className="btn-icon danger"
                            onClick={() => deleteTransaction(tx.id)}
                            title="Delete Transaction"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

export default History;

