import { useState } from 'react';
import api from '../lib/api';
import Modal from './Modal';

const AddMemberModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: 'mr.',
    fathersName: 'mr.',
    mobile: '',
    address: '',
    accountNumber: '',
    initialAmount: '151365',
    developmentFee: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For number fields, validate input
    if (['initialAmount', 'developmentFee'].includes(name)) {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else if (['name', 'fathersName'].includes(name)) {
        // Capitalize first letter of each word
        const capitalizedValue = value.replace(/\b\w/g, (char) => char.toUpperCase());
        setFormData((prev) => ({ ...prev, [name]: capitalizedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/member/create', {
        ...formData,
        initialAmount: parseFloat(formData.initialAmount) || 0,
        developmentFee: parseFloat(formData.developmentFee) || 0,
      });
      setFormData({ 
        name: '', 
        fathersName: '', 
        mobile: '', 
        address: '',
        accountNumber: '',
        initialAmount: '',
        developmentFee: '',
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create member', err);
      setError(err.response?.data?.error || 'Failed to create member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Member">
      {error && <div className="error-alert">{error}</div>}
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label className="label">Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            placeholder="Enter member's name"
          />
        </div>

        <div className="form-group">
          <label className="label">Father's Name</label>
          <input
            type="text"
            name="fathersName"
            value={formData.fathersName}
            onChange={handleChange}
            className="input"
            placeholder="Enter father's name"
          />
        </div>

        <div className="form-row">
            <div className="form-group">
            <label className="label">Mobile Number</label>
            <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                className="input"
                placeholder="Enter mobile number"
            />
            </div>
            <div className="form-group">
            <label className="label">Account Number *</label>
            <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleChange}
                className="input"
                placeholder="Unique Account No."
                required
            />
            </div>
        </div>

        <div className="form-group">
          <label className="label">Address</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="input textarea"
            placeholder="Enter address"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="label">Initial Amount (₹)</label>
            <input
              type="text"
              name="initialAmount"
              value={formData.initialAmount}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 5000"
            />
            <small className="help-text">
              Added to member's account balance
            </small>
          </div>

          <div className="form-group">
            <label className="label">Development Fee (₹)</label>
            <input
              type="text"
              name="developmentFee"
              value={formData.developmentFee}
              onChange={handleChange}
              className="input"
              placeholder="e.g., 500"
            />
            <small className="help-text">
              Added to organisation amount
            </small>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddMemberModal;

