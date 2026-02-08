import Modal from './Modal';
import { Wallet, Plus, Minus, Equal } from 'lucide-react';

const CashBreakdownModal = ({ isOpen, onClose, stats }) => {
    const formatCurrency = (amount) => {
        return `₹ ${Math.round(parseFloat(amount || 0)).toLocaleString('en-IN')}`;
    };

    if (!stats) return null;

    const {
        organisation,
        totalMembersAmount,
        totalLoanedAmount,
        totalReleasedAmount,
        cashInHand
    } = stats;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cash in Hand Calculation">
            <div className="cash-breakdown-container">
                <div className="breakdown-list">
                    <div className="breakdown-item">
                        <div className="breakdown-label">
                            <Plus size={16} className="icon-plus" />
                            <span>Members' Account Total</span>
                        </div>
                        <div className="breakdown-value">{formatCurrency(totalMembersAmount)}</div>
                    </div>

                    <div className="breakdown-item">
                        <div className="breakdown-label">
                            <Plus size={16} className="icon-plus" />
                            <span>Penalty Amount</span>
                        </div>
                        <div className="breakdown-value">{formatCurrency(organisation?.penalty)}</div>
                    </div>

                    <div className="breakdown-item">
                        <div className="breakdown-label">
                            <Plus size={16} className="icon-plus" />
                            <span>Organisation Dev Fee</span>
                        </div>
                        <div className="breakdown-value">{formatCurrency(organisation?.amount)}</div>
                    </div>

                    <div className="breakdown-item">
                        <div className="breakdown-label">
                            <Plus size={16} className="icon-plus" />
                            <span>Interest Earned (Profit)</span>
                        </div>
                        <div className="breakdown-value">{formatCurrency(organisation?.profit)}</div>
                    </div>

                    <div className="breakdown-divider"></div>

                    <div className="breakdown-item subtraction">
                        <div className="breakdown-label">
                            <Minus size={16} className="icon-minus" />
                            <span>Total Loans Distributed</span>
                        </div>
                        <div className="breakdown-value">({formatCurrency(totalLoanedAmount)})</div>
                    </div>

                    <div className="breakdown-item subtraction">
                        <div className="breakdown-label">
                            <Minus size={16} className="icon-minus" />
                            <span>Advance Paid (Short Term)</span>
                        </div>
                        <div className="breakdown-value">({formatCurrency(totalReleasedAmount)})</div>
                    </div>

                    <div className="breakdown-total">
                        <div className="breakdown-label">
                            <Equal size={20} />
                            <span>Total Cash in Hand</span>
                        </div>
                        <div className="breakdown-value primary">{formatCurrency(cashInHand)}</div>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-primary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>

        </Modal>
    );
};

export default CashBreakdownModal;
