import { useState } from 'react';
import Modal from './Modal';
import api from '../lib/api';
import { Loader, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReceiptModal = ({ isOpen, onClose, member }) => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth()); // 0-11
  const [year, setYear] = useState(currentDate.getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setError('');

    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last date of the month

      const [txRes, loanRes] = await Promise.all([
        api.get(`/transaction/member/${member.id}`, {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }),
        api.get(`/loan/payments/member/${member.id}`, {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        })
      ]);

      const transactions = txRes.data;
      const loanPayments = loanRes.data;

      if (transactions.length === 0 && loanPayments.length === 0) {
        setError('No transactions or loan payments found for this month.');
        setLoading(false);
        return;
      }

      generatePDF(transactions, loanPayments, startDate);
      onClose();
    } catch (err) {
      console.error('Error generating receipt:', err);
      setError('Failed to generate receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = (transactions, loanPayments, date) => {
    const doc = new jsPDF();

    // Add Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Monthly Transaction Receipt', 105, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.text('Co-operative Bank', 105, 22, { align: 'center' }); // Replace with actual org name if available

    // Member Details
    doc.setFontSize(10);
    doc.text(`Member Name: ${member.name}`, 14, 35);
    doc.text(`Mobile: ${member.mobile}`, 14, 40);
    doc.text(`Account No: ${member.account?.accountNumber || 'N/A'}`, 14, 45);
    doc.text(`Period: ${months[month]} ${year}`, 150, 35);

    let currentY = 55;
    let grandTotal = 0;

    // --- Regular Transactions Table ---
    if (transactions.length > 0) {
      doc.setFontSize(12);
      doc.text('Regular Deposits', 14, currentY - 5);

      const tableColumn = ["Date", "Basic Pay", "Dev Fee", "Penalty", "Total"];
      const tableRows = [];

      let totalBasic = 0;
      let totalDev = 0;
      let totalPenalty = 0;

      transactions.forEach(tx => {
        const txDate = new Date(tx.createdAt).toLocaleDateString('en-IN');
        const total = (tx.basicPay || 0) + (tx.developmentFee || 0) + (tx.penalty || 0);

        totalBasic += (tx.basicPay || 0);
        totalDev += (tx.developmentFee || 0);
        totalPenalty += (tx.penalty || 0);

        const rowData = [
          txDate,
          `Rs. ${Number(tx.basicPay || 0).toFixed(2)}`,
          `Rs. ${Number(tx.developmentFee || 0).toFixed(2)}`,
          `Rs. ${Number(tx.penalty || 0).toFixed(2)}`,
          `Rs. ${total.toFixed(2)}`
        ];
        tableRows.push(rowData);
      });

      const sectionTotal = totalBasic + totalDev + totalPenalty;
      grandTotal += sectionTotal;

      tableRows.push([
        'Total',
        `Rs. ${totalBasic.toFixed(2)}`,
        `Rs. ${totalDev.toFixed(2)}`,
        `Rs. ${totalPenalty.toFixed(2)}`,
        `Rs. ${sectionTotal.toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [66, 133, 244] },
        styles: { fontSize: 9 },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      currentY = doc.lastAutoTable.finalY + 20;
    }

    // --- Loan Payments Table ---
    if (loanPayments.length > 0) {
      doc.setFontSize(12);
      doc.text('Loan Repayments', 14, currentY - 5);

      const loanColumns = ["Date", "Principal", "Interest", "Penalty", "Total Paid"];
      const loanRows = [];

      let totalPrincipal = 0;
      let totalInterest = 0;
      let totalLoanPenalty = 0;

      loanPayments.forEach(payment => {
        const pDate = new Date(payment.createdAt).toLocaleDateString('en-IN');
        
        totalPrincipal += (payment.principalPaid || 0);
        totalInterest += (payment.interestPaid || 0);
        totalLoanPenalty += (payment.penalty || 0);

        const rowData = [
          pDate,
          `Rs. ${Number(payment.principalPaid || 0).toFixed(2)}`,
          `Rs. ${Number(payment.interestPaid || 0).toFixed(2)}`,
          `Rs. ${Number(payment.penalty || 0).toFixed(2)}`,
          `Rs. ${Number(payment.totalPaid || 0).toFixed(2)}`
        ];
        loanRows.push(rowData);
      });

      const loanSectionTotal = totalPrincipal + totalInterest + totalLoanPenalty;
      grandTotal += loanSectionTotal;

      loanRows.push([
        'Total',
        `Rs. ${totalPrincipal.toFixed(2)}`,
        `Rs. ${totalInterest.toFixed(2)}`,
        `Rs. ${totalLoanPenalty.toFixed(2)}`,
        `Rs. ${loanSectionTotal.toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [loanColumns],
        body: loanRows,
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [255, 112, 67] }, // Orange for Loans
        styles: { fontSize: 9 },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
      
      currentY = doc.lastAutoTable.finalY + 20;
    }

    // --- Grand Total ---
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Grand Total: Rs. ${grandTotal.toFixed(2)}`, 140, currentY, { align: 'right' });

    // Save
    doc.save(`Receipt_${member.name}_${months[month]}_${year}.pdf`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Monthly Receipt">
      <div className="login-form">
        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label className="label">Select Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="input"
            disabled={loading}
          >
            {months.map((m, index) => (
              <option key={index} value={index}>{m}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="label">Select Year</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="input"
            min="2000"
            max="2100"
            disabled={loading}
          />
        </div>

        <div className="modal-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleGenerate} 
            disabled={loading}
          >
            {loading ? <Loader size={20} className="animate-spin" /> : <Download size={20} />}
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiptModal;
