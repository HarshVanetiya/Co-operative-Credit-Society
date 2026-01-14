import { useState, useEffect } from 'react';
import api from '../lib/api';
import { FileText, Download, Calendar, Loader, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Activity = () => {
    const [activeTab, setActiveTab] = useState('report'); // 'report', 'expected', or 'status'
    const [loading, setLoading] = useState(false);
    
    // Date Selection State
    const currentYear = new Date().getFullYear();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    
    // Report Data State
    const [reportRows, setReportRows] = useState([]); // List of members with their activity
    const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, net: 0 });
    
    // Expected Data State
    const [expectedData, setExpectedData] = useState([]);
    const [expectedSummary, setExpectedSummary] = useState({ totalExpected: 0, memberCount: 0 });

    // Status Data State
    const [statusRows, setStatusRows] = useState([]);

    useEffect(() => {
        if (activeTab === 'report') {
            fetchActivityReport();
        } else if (activeTab === 'expected') {
            fetchExpectedCollections();
        } else {
            fetchMemberStatus();
        }
    }, [activeTab, selectedMonth, selectedYear]);

    const fetchActivityReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/report/activity?month=${selectedMonth}&year=${selectedYear}`);
            setReportRows(res.data.rows || []);
            setSummary(res.data.summary || { totalIn: 0, totalOut: 0, net: 0 });
        } catch (error) {
            console.error("Error fetching activity report:", error);
            setReportRows([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchExpectedCollections = async () => {
        setLoading(true);
        try {
            const res = await api.get('/report/expected');
            setExpectedData(res.data.collections || []);
            setExpectedSummary({
                totalExpected: res.data.totalExpected || 0,
                memberCount: res.data.memberCount || 0
            });
        } catch (error) {
            console.error("Error fetching expected collections:", error);
            setExpectedData([]);
        } finally {
            setLoading(false);
        }
    };

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
            
            if (activeTab === 'report') {
                doc.setFontSize(18);
                doc.text(`Monthly Activity Report`, 14, 20);
                
                doc.setFontSize(12);
                doc.text(`Period: ${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 30);
                
                doc.setFontSize(10);
                doc.text(`Total In: ${formatCurrency(summary.totalIn)}`, 14, 40);
                doc.text(`Total Expenses: ${formatCurrency(summary.totalOut)}`, 100, 40);
                
                const tableColumn = ["Account", "Member Name", "Deposits", "Loan Paid", "Total Paid"];
                const tableRows = reportRows.map(item => [
                    item.accountNumber,
                    `${item.name}\n${item.mobile}`,
                    formatCurrency(item.depositAmount),
                    item.loanAmount > 0 ? formatCurrency(item.loanAmount) : "N/A",
                    formatCurrency(item.totalPaid)
                ]);

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 50,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 2 },
                    headStyles: { fillColor: [79, 70, 229] } // Indigo 600
                });
                doc.save(`Activity_Report_${selectedYear}_${selectedMonth}.pdf`);
            } else if (activeTab === 'expected') {
                // Expected Collections PDF
                doc.setFontSize(18);
                doc.text(`Expected Collections Report`, 14, 20);
                
                doc.setFontSize(12);
                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                doc.text(`Total Expected: ${formatCurrency(expectedSummary.totalExpected)}`, 14, 40);

                const tableColumn = ["Account", "Member Name", "Base Fee", "Loan Due", "Total Expected"];
                const tableRows = expectedData.map(item => [
                    item.accountNumber,
                    `${item.name}\n${item.mobile}`,
                    formatCurrency(item.baseAmount),
                    item.hasActiveLoan ? formatCurrency(item.loanAmount) : "N/A",
                    formatCurrency(item.totalExpected)
                ]);

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 50,
                    theme: 'grid',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [79, 70, 229] }
                });
                doc.save(`Expected_Collections_${new Date().toISOString().slice(0, 10)}.pdf`);
            } else {
                // Member Status PDF
                doc.setFontSize(18);
                doc.text(`Member Status Report`, 14, 20);
                
                doc.setFontSize(12);
                doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                doc.text(`Total Members: ${statusRows.length}`, 14, 40);

                const tableColumn = ["Account", "Name", "Father's Name", "Loan Bal", "Expected Amt", "Member Sig.", "Office Sig."];
                const tableRows = statusRows.map(item => [
                    item.accountNumber,
                    item.name,
                    item.fathersName,
                    item.remainingLoanPrincipal > 0 ? formatCurrency(item.remainingLoanPrincipal) : "0",
                    formatCurrency(item.expectedAmount),
                    "", // Blank for Signature
                    ""  // Blank for Remarks
                ]);

                autoTable(doc, {
                    head: [tableColumn],
                    body: tableRows,
                    startY: 50,
                    theme: 'grid',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [79, 70, 229] }
                });
                doc.save(`Member_Status_${new Date().toISOString().slice(0, 10)}.pdf`);
            }
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const formatCurrency = (amount) => {
        return `₹ ${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    };

    // Generate Year Options
    const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
    const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Activity & Reports</h1>
                    <p className="page-description">Track member contributions and forecast collections</p>
                </div>
                <button className="btn btn-secondary" onClick={downloadPDF}>
                    <Download size={20} />
                    <span>Download PDF</span>
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="card" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--background)', border: 'none' }}>
                <button 
                    className={`btn ${activeTab === 'report' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('report')}
                    style={{ flex: 1 }}
                >
                    <FileText size={18} /> Monthly Report
                </button>
                <button 
                    className={`btn ${activeTab === 'expected' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('expected')}
                    style={{ flex: 1 }}
                >
                    <Calendar size={18} /> Expected Collections
                </button>
                <button 
                    className={`btn ${activeTab === 'status' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('status')}
                    style={{ flex: 1 }}
                >
                    <Users size={18} /> Member Status
                </button>
            </div>

            {activeTab === 'report' && (
                <div className="card">
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div className="form-group" style={{ width: '150px' }}>
                                <label className="label">Month</label>
                                <select 
                                    className="input"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                >
                                    {monthOptions.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ width: '100px' }}>
                                <label className="label">Year</label>
                                <select 
                                    className="input"
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                >
                                    {yearOptions.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', flex: 1 }}>
                            <div className="stat-card-filled" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                                <span className="stat-label" style={{ color: '#047857' }}>Total In</span>
                                <span className="stat-value" style={{ color: '#047857', fontSize: '1.25rem' }}>+{formatCurrency(summary.totalIn)}</span>
                            </div>
                             <div className="stat-card-filled" style={{ padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', background: '#fef2f2', borderColor: '#fecaca' }}>
                                <span className="stat-label" style={{ color: '#b91c1c' }}>Expenses</span>
                                <span className="stat-value" style={{ color: '#b91c1c', fontSize: '1.25rem' }}>-{formatCurrency(summary.totalOut)}</span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty-state">
                            <Loader className="animate-spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
                            Loading activity...
                        </div>
                    ) : (
                        <div className="table-container">
                            {reportRows.length === 0 ? (
                                <div className="empty-state">No members found</div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Acc No.</th>
                                            <th>Member Name</th>
                                            <th>Deposits</th>
                                            <th>Loan Repayment</th>
                                            <th>Total Paid</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportRows.map(item => (
                                            <tr key={item.memberId}>
                                                <td className="mobile-text">{item.accountNumber}</td>
                                                <td>
                                                    <div style={{display:'flex', flexDirection:'column'}}>
                                                        <span style={{fontWeight: 500}}>{item.name}</span>
                                                        <small className="text-muted" style={{fontSize: '0.75rem'}}>{item.mobile}</small>
                                                    </div>
                                                </td>
                                                <td>{formatCurrency(item.depositAmount)}</td>
                                                <td>
                                                    {item.loanAmount > 0 ? (
                                                        <span style={{color: '#ea580c', fontWeight: 500}}>{formatCurrency(item.loanAmount)}</span>
                                                    ) : (
                                                        <span style={{color: '#9ca3af'}}>N/A</span>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#059669' }}>
                                                    {formatCurrency(item.totalPaid)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {activeTab === 'expected' && (
                <div className="card">
                     <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                        <h2 className="title" style={{ fontSize: '1.25rem' }}>Next Month Forecast</h2>
                        <div className="stat-card-filled" style={{ padding: '0.75rem 1.5rem', background: '#e0e7ff', borderColor: '#c7d2fe' }}>
                            <div className="stat-info">
                                <span className="stat-label" style={{ color: '#4338ca' }}>Total Expected</span>
                                <span className="stat-value" style={{ color: '#4338ca' }}>{formatCurrency(expectedSummary.totalExpected)}</span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty-state">
                            <Loader className="animate-spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
                            Calculating expectations...
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Acc No.</th>
                                        <th>Member Name</th>
                                        <th>Base Fee</th>
                                        <th>Loan Due</th>
                                        <th>Total Expected</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expectedData.map(item => (
                                        <tr key={item.memberId}>
                                            <td className="mobile-text">{item.accountNumber}</td>
                                            <td>
                                                <div style={{display:'flex', flexDirection:'column'}}>
                                                    <span style={{fontWeight: 500}}>{item.name}</span>
                                                    <small className="text-muted" style={{fontSize: '0.75rem'}}>{item.mobile}</small>
                                                </div>
                                            </td>
                                            <td>{formatCurrency(item.baseAmount)}</td>
                                            <td>
                                                {item.hasActiveLoan ? (
                                                    <span style={{color: '#ea580c', fontWeight: 500}}>{formatCurrency(item.loanAmount)}</span>
                                                ) : (
                                                    <span style={{color: '#9ca3af'}}>N/A</span>
                                                )}
                                            </td>
                                            <td style={{fontWeight: 700}}>{formatCurrency(item.totalExpected)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'status' && (
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
                                        <th>Loan Bal</th>
                                        <th>Expected Amt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusRows.map(item => (
                                        <tr key={item.memberId}>
                                            <td className="mobile-text">{item.accountNumber}</td>
                                            <td>
                                                <div style={{display:'flex', flexDirection:'column'}}>
                                                    <span style={{fontWeight: 500}}>{item.name}</span>
                                                </div>
                                            </td>
                                            <td>{item.fathersName}</td>
                                            <td>
                                                 {item.remainingLoanPrincipal > 0 ? (
                                                    <span style={{color: '#ea580c', fontWeight: 500}}>{formatCurrency(item.remainingLoanPrincipal)}</span>
                                                 ) : (
                                                    <span style={{color: '#9ca3af'}}>0</span>
                                                 )}
                                            </td>
                                            <td style={{fontWeight: 700}}>{formatCurrency(item.expectedAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Activity;
