import { useState, useEffect } from 'react';
import { X, Loader, Calculator, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

const SmartDistributeModal = ({ isOpen, onClose, member, onSuccess }) => {
    const [amount, setAmount] = useState('');
    const [penaltyInput, setPenaltyInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [breakdown, setBreakdown] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setPenaltyInput('');
            setBreakdown(null);
            setError('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setBreakdown(null);
            return;
        }

        // Live breakdown logic (matches backend)
        let remaining = parseFloat(amount);
        const penaltyToPay = parseFloat(penaltyInput) || 0;

        const bd = {
            penalty: Math.min(remaining, penaltyToPay),
            developmentFee: 0,
            baseDeposit: 0,
            loanInterest: 0,
            loanPrincipal: 0,
            extraDeposit: 0
        };
        remaining -= bd.penalty;

        bd.developmentFee = Math.min(remaining, 20);
        remaining -= bd.developmentFee;

        bd.baseDeposit = Math.min(remaining, 500);
        remaining -= bd.baseDeposit;

        const activeLoan = member.loans?.find(l => l.status === 'ACTIVE');
        if (activeLoan && remaining > 0) {
            const interestDue = activeLoan.remainingBalance * activeLoan.interestRate;
            bd.loanInterest = Math.min(remaining, interestDue);
            remaining -= bd.loanInterest;

            if (remaining > 0) {
                bd.loanPrincipal = Math.min(remaining, activeLoan.remainingBalance);
                remaining -= bd.loanPrincipal;
            }
        }

        if (remaining > 0) {
            bd.extraDeposit = remaining;
        }

        setBreakdown(bd);
    }, [amount, penaltyInput, member]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return;

        setLoading(true);
        setError('');

        try {
            await api.post('/transaction/smart-distribute', {
                memberId: member.id,
                totalAmount: parseFloat(amount),
                penaltyProvided: parseFloat(penaltyInput) || 0
            });
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to distribute money');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const formatCurrency = (val) => `₹ ${Math.round(parseFloat(val || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Smart Money Distribution</h2>
                    <button onClick={onClose} className="close-button">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Last Paid Date:</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{formatDate(member.lastPaidDate)}</span>
                    </div>

                    <div className="form-group">
                        <label className="label">Penalty (if any)</label>
                        <div className="input-with-icon">
                            <span className="input-icon">₹</span>
                            <input
                                type="number"
                                value={penaltyInput}
                                onChange={(e) => setPenaltyInput(e.target.value)}
                                placeholder="0.00"
                                className="input"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label className="label">Total Amount to Distribute</label>
                        <div className="input-with-icon">
                            <span className="input-icon">₹</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="input"
                                autoFocus
                                required
                                min="1"
                            />
                        </div>
                        {(() => {
                            const activeLoan = member.loans?.find(l => l.status === 'ACTIVE');
                            const penaltyToPay = parseFloat(penaltyInput) || 0;
                            const expectedBreakdown = {
                                penalty: penaltyToPay,
                                fee: 20,
                                base: 500,
                                interest: activeLoan ? activeLoan.remainingBalance * activeLoan.interestRate : 0,
                                principal: activeLoan ? Math.min(activeLoan.emiAmount, activeLoan.remainingBalance) : 0
                            };
                            const totalExpected = expectedBreakdown.penalty + expectedBreakdown.fee + expectedBreakdown.base + expectedBreakdown.interest + expectedBreakdown.principal;

                            return (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '12px',
                                    background: 'var(--primary-light)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--primary)',
                                    color: 'var(--primary-dark)',
                                    fontSize: '0.9rem'
                                }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Expected Amount:</span>
                                        <span>{formatCurrency(totalExpected)}</span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                        {penaltyToPay > 0 && <span>Penalty: {formatCurrency(penaltyToPay)}</span>}
                                        <span>Fee: {formatCurrency(expectedBreakdown.fee)}</span>
                                        <span>Base: {formatCurrency(expectedBreakdown.base)}</span>
                                        {activeLoan && (
                                            <>
                                                <span>Intrst: {formatCurrency(expectedBreakdown.interest)}</span>
                                                <span>Princpl: {formatCurrency(expectedBreakdown.principal)}</span>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAmount(totalExpected.toString())}
                                        style={{
                                            marginTop: '8px',
                                            width: '100%',
                                            padding: '4px',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        Use Expected Amount
                                    </button>
                                </div>
                            );
                        })()}
                    </div>

                    {breakdown && (
                        <div className="breakdown-card" style={{
                            background: 'var(--bg-secondary)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            marginTop: '1.5rem',
                            border: '1px solid var(--border-color)'
                        }}>
                            <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calculator size={18} /> Distribution Breakdown
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {breakdown.penalty > 0 && (
                                    <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Penalty Paid:</span>
                                        <span className="font-bold text-danger" style={{ color: 'var(--danger)' }}>{formatCurrency(breakdown.penalty)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Development Fee:</span>
                                    <span className="font-bold">{formatCurrency(breakdown.developmentFee)}</span>
                                </div>
                                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Base Deposit:</span>
                                    <span className="font-bold">{formatCurrency(breakdown.baseDeposit)}</span>
                                </div>
                                {breakdown.loanInterest > 0 && (
                                    <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Loan Interest:</span>
                                        <span className="font-bold text-success" style={{ color: 'var(--success)' }}>{formatCurrency(breakdown.loanInterest)}</span>
                                    </div>
                                )}
                                {breakdown.loanPrincipal > 0 && (
                                    <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Loan Principal:</span>
                                        <span className="font-bold text-success" style={{ color: 'var(--success)' }}>{formatCurrency(breakdown.loanPrincipal)}</span>
                                    </div>
                                )}
                                {breakdown.extraDeposit > 0 && (
                                    <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Extra Deposit:</span>
                                        <span className="font-bold">{formatCurrency(breakdown.extraDeposit)}</span>
                                    </div>
                                )}
                                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span className="font-bold">Total:</span>
                                    <span className="font-bold" style={{ color: 'var(--primary)' }}>{formatCurrency(amount)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}

                    <div className="modal-footer" style={{ marginTop: '2rem' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !amount}>
                            {loading ? <Loader className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                            <span>Confirm Distribution</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SmartDistributeModal;
