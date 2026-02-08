import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Download, Loader, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Activity = () => {
    const [loading, setLoading] = useState(false);
    const [statusRows, setStatusRows] = useState([]);

    useEffect(() => {
        fetchMemberStatus();
    }, []);


    const fetchMemberStatus = async () => {
        setLoading(true);
        try {
            const res = await api.get('/report/status');
            setStatusRows(res.data.rows || []);
        } catch (error) {
            console.error("Error fetching member status:", error);
            setStatusRows([]);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = () => {
        try {
            const doc = new jsPDF();
            // Helper for PDF currency to avoid glyph issues with ₹
            const pdfCurrency = (val) => `Rs. ${Math.round(parseFloat(val || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

            // Member Status PDF
            doc.setFontSize(22);
            doc.text(`Member Status Report`, 14, 20);

            doc.setFontSize(14);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
            doc.text(`Total Members: ${statusRows.length}`, 14, 40);

            const tableColumn = ["Account", "Name", "Father's Name", "Loan Bal", "Expected Amt", "Member Sig.", "Office Sig."];
            const tableRows = statusRows.map(item => {
                const b = item.breakdown || {};
                const basic = b.basic || 500;
                const devFee = b.devFee || 20;
                const loanPrincipal = b.loanPrincipal || 0;
                const loanInterest = b.loanInterest || 0;
                const total = basic + devFee + loanPrincipal + loanInterest;

                const breakdownStr = `${basic} + ${devFee}${loanPrincipal > 0 ? ' + ' + loanPrincipal.toFixed(0) : ''}${loanInterest > 0 ? ' + ' + loanInterest.toFixed(0) : ''} = ${Math.round(total).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

                return [
                    item.accountNumber,
                    item.name,
                    item.fathersName,
                    item.remainingLoanPrincipal > 0 ? pdfCurrency(item.remainingLoanPrincipal) : "0",
                    breakdownStr,
                    "", // Blank for Signature
                    ""  // Blank for Remarks
                ];
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 50,
                theme: 'grid',
                styles: { fontSize: 10, cellPadding: 1.5, overflow: 'linebreak' },
                headStyles: { fillColor: [79, 70, 229] },
                columnStyles: {
                    0: { cellWidth: 15 }, // Account
                    1: { cellWidth: 35 }, // Name
                    2: { cellWidth: 35 }, // Father's Name
                    3: { cellWidth: 25, halign: 'right' }, // Loan Bal
                    4: { cellWidth: 45 }, // Expected Amt
                    5: { cellWidth: 15 }, // Member Sig
                    6: { cellWidth: 15 }  // Office Sig
                }
            });
            doc.save(`Member_Status_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const formatCurrency = (amount) => {
        return `₹ ${Math.round(parseFloat(amount || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Member Status</h1>
                    <p className="page-description">Overview of member balances and expected contributions</p>
                </div>
                <button className="btn btn-secondary" onClick={downloadPDF}>
                    <Download size={20} />
                    <span>Download PDF</span>
                </button>
            </div>

            <div className="card">
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <h2 className="title" style={{ fontSize: '1.25rem' }}>Member Status Details</h2>
                    <div className="stat-card-filled" style={{ padding: '0.75rem 1.5rem', background: '#e0e7ff', borderColor: '#c7d2fe' }}>
                        <div className="stat-info">
                            <span className="stat-label" style={{ color: '#4338ca' }}>Total Members</span>
                            <span className="stat-value" style={{ color: '#4338ca' }}>{statusRows.length}</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <Loader className="animate-spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
                        Fetching status...
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Acc No.</th>
                                    <th>Name</th>
                                    <th>Father's Name</th>
                                    <th className="text-left">Loan Bal</th>
                                    <th className="text-left">Expected Amt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statusRows.map(item => (
                                    <tr key={item.memberId}>
                                        <td className="mobile-text">{item.accountNumber}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 500 }}>{item.name}</span>
                                            </div>
                                        </td>
                                        <td>{item.fathersName}</td>
                                        <td className="text-left">
                                            {item.remainingLoanPrincipal > 0 ? (
                                                <span style={{ color: '#ea580c', fontWeight: 500 }}>{formatCurrency(item.remainingLoanPrincipal)}</span>
                                            ) : (
                                                <span style={{ color: '#9ca3af' }}>0</span>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 700 }} className="text-left">
                                            {item.breakdown ?
                                                `${item.breakdown.basic} + ${item.breakdown.devFee}${item.breakdown.loanPrincipal > 0 ? ' + ' + item.breakdown.loanPrincipal.toFixed(0) : ''}${item.breakdown.loanInterest > 0 ? ' + ' + item.breakdown.loanInterest.toFixed(0) : ''}`
                                                : formatCurrency(item.expectedAmount)
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Activity;
