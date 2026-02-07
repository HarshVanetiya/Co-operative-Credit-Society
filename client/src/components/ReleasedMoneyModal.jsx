import { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const ReleasedMoneyModal = ({ isOpen, onClose, member, onSuccess }) => {
    const [activeTab, setActiveTab] = useState('release'); // 'release' or 'settle'
    const [formData, setFormData] = useState({
        amount: '',
        profit: '0',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            // Auto-switch to settle if member has released money
            if (member?.account?.releasedMoney > 0) {
                setActiveTab('settle');
                setFormData(prev => ({ ...prev, amount: member.account.releasedMoney.toString() }));
            } else {
                setActiveTab('release');
            }
        }
    }, [isOpen, member]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setFormData((prev) => ({ ...prev, [name]: value }));
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amountValue = parseFloat(formData.amount) || 0;
        const profitValue = parseFloat(formData.profit) || 0;

        if (amountValue <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            if (activeTab === 'release') {
                await api.post('/released-money/release', {
                    memberId: member.id,
                    amount: amountValue,
                });
                alert('Cash released successfully!');
            } else {
                await api.post('/released-money/settle', {
                    memberId: member.id,
                    amountPaid: amountValue,
                    profit: profitValue,
                });
                alert('Settlement recorded successfully!');
            }

            handleClose();

            if (onSuccess) {
                onSuccess();
            }
        } catch (err) {
            console.error('Error with released money operation:', err);
            setError(err.response?.data?.error || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({ amount: '', profit: '0' });
        setError('');
        onClose();
    };

    if (!member) return null;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Release Money Management">
            <div className="modal-tabs">
                <button
                    className={`modal-tab ${activeTab === 'release' ? 'active' : ''}`}
                    onClick={() => setActiveTab('release')}
                >
                    <ArrowUpCircle size={18} />
                    <span>Release Cash</span>
                </button>
                <button
                    className={`modal-tab ${activeTab === 'settle' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('settle');
                        if (member?.account?.releasedMoney > 0) {
                            setFormData(prev => ({ ...prev, amount: member.account.releasedMoney.toString() }));
                        }
                    }}
                >
                    <ArrowDownCircle size={18} />
                    <span>Settle Money</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="login-form" style={{ marginTop: '1rem' }}>
                {error && <div className="error-message">{error}</div>}

                <div className="form-group">
                    <label className="label">
                        {activeTab === 'release' ? 'Amount to Release (₹)' : 'Amount Paid (₹)'}
                    </label>
                    <input
                        ref={inputRef}
                        type="text"
                        name="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="input"
                        placeholder="0"
                        disabled={loading}
                    />
                    {activeTab === 'settle' && member?.account?.releasedMoney > 0 && (
                        <small className="stat-subtext">Current released amount: ₹{member.account.releasedMoney}</small>
                    )}
                </div>

                {activeTab === 'settle' && (
                    <div className="form-group">
                        <label className="label">Profit / Gain (₹)</label>
                        <input
                            type="text"
                            name="profit"
                            value={formData.profit}
                            onChange={handleChange}
                            className="input"
                            placeholder="0"
                            disabled={loading}
                        />
                        <small className="stat-subtext">This will be added to organization profit.</small>
                    </div>
                )}

                <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <Loader size={20} className="animate-spin" /> : null}
                        <span>{loading ? 'Processing...' : activeTab === 'release' ? 'Release Cash' : 'Submit Settlement'}</span>
                    </button>
                </div>
            </form>

            <style jsx>{`
        .modal-tabs {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid var(--border, #e5e7eb);
          margin-bottom: 1rem;
        }
        .modal-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          cursor: pointer;
          color: var(--text-secondary, #6b7280);
          border-bottom: 2px solid transparent;
          font-weight: 500;
          transition: all 0.2s;
        }
        .modal-tab:hover {
          color: var(--primary, #4f46e5);
        }
        .modal-tab.active {
          color: var(--primary, #4f46e5);
          border-bottom-color: var(--primary, #4f46e5);
        }
      `}</style>
        </Modal>
    );
};

export default ReleasedMoneyModal;
