import { useState, useEffect } from "react";
import api from "../lib/api";
import { Download, Loader, Users } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const Activity = () => {
    const [loading, setLoading] = useState(false);
    const [statusRows, setStatusRows] = useState([]);

    useEffect(() => {
        fetchMemberStatus();
    }, []);

    const fetchMemberStatus = async () => {
        setLoading(true);
        try {
            const res = await api.get("/report/status");
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
            const doc = new jsPDF({ unit: "in", format: "letter" });
            // Helper for PDF currency to avoid glyph issues with ₹
            const pdfCurrency = (val) =>
                `${Math.round(parseFloat(val || 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

            // Member Status PDF
            const margin = 0.5;
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            const year = now.getFullYear();

            doc.setFontSize(18);
            doc.text(`Phul Mali Uba Ganesh Ji Alp Bachat Samiti`, 4.25, 0.7, {
                align: "center",
            });

            doc.setFontSize(10);
            doc.text(`Generated on: ${month}-${year}`, margin, 1.0);

            const tableColumn = [
                "A.N.",
                "Name",
                "Loan Bal",
                "Expected Amt",
                "Sum",
                "Office",
                "Member",
            ];
            const tableRows = statusRows.map((item) => {
                const b = item.breakdown || {};
                const basic = b.basic || 500;
                const devFee = b.devFee || 20;
                const loanPrincipal = b.loanPrincipal || 0;
                const loanInterest = b.loanInterest || 0;
                const total = basic + devFee + loanPrincipal + loanInterest;

                const breakdownParts = [
                    basic,
                    devFee,
                    loanPrincipal > 0 ? loanPrincipal.toFixed(0) : null,
                    loanInterest > 0 ? loanInterest.toFixed(0) : null,
                ].filter((part) => part !== null);
                const breakdownStr = breakdownParts.join("+");

                return [
                    item.accountNumber,
                    item.name,
                    item.remainingLoanPrincipal > 0
                        ? pdfCurrency(item.remainingLoanPrincipal)
                        : "0",
                    breakdownStr,
                    Math.round(total).toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                    }),
                    "", // Office
                    "", // Member
                ];
            });

            const loanBalTotal = statusRows.reduce((sum, item) => {
                const loanBal = parseFloat(item.remainingLoanPrincipal || 0);
                return sum + (loanBal > 0 ? loanBal : 0);
            }, 0);

            tableRows.push([
                "",
                "Grand Total",
                Math.round(loanBalTotal).toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                }),
                "",
                "",
                "",
                "",
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 1.3,
                margin: {
                    left: margin,
                    right: margin,
                    top: margin,
                    bottom: margin,
                },
                theme: "grid",
                styles: {
                    fontSize: 12,
                    cellPadding: 0.04,
                    overflow: "linebreak",
                    lineColor: [0, 0, 0],
                    lineWidth: 0.01,
                },
                headStyles: {
                    fillColor: [255, 255, 255],
                    textColor: [0, 0, 0],
                    fontSize: 12,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.01,
                },
                columnStyles: {
                    0: { cellWidth: 0.5 }, // A.N.
                    1: { cellWidth: 1.85 }, // Name
                    2: { cellWidth: 0.9, halign: "right" }, // Loan Bal
                    3: { cellWidth: 1.8 }, // Expected Amt
                    4: { cellWidth: 0.7, halign: "right" }, // Per Person
                    5: { cellWidth: 0.85 }, // Office
                    6: { cellWidth: 0.85 }, // Member
                },
            });
            doc.save(
                `Member_Status_${new Date().toISOString().slice(0, 10)}.pdf`,
            );
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const formatCurrency = (amount) => {
        return `₹ ${Math.round(parseFloat(amount || 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    };

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Member Status</h1>
                    <p className="page-description">
                        Overview of member balances and expected contributions
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={downloadPDF}>
                    <Download size={20} />
                    <span>Download PDF</span>
                </button>
            </div>

            <div className="card">
                <div className="page-header" style={{ marginBottom: "1.5rem" }}>
                    <h2 className="title" style={{ fontSize: "1.25rem" }}>
                        Member Status Details
                    </h2>
                    <div
                        className="stat-card-filled"
                        style={{
                            padding: "0.75rem 1.5rem",
                            background: "#e0e7ff",
                            borderColor: "#c7d2fe",
                        }}
                    >
                        <div className="stat-info">
                            <span
                                className="stat-label"
                                style={{ color: "#4338ca" }}
                            >
                                Total Members
                            </span>
                            <span
                                className="stat-value"
                                style={{ color: "#4338ca" }}
                            >
                                {statusRows.length}
                            </span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <Loader
                            className="animate-spin"
                            style={{ margin: "0 auto", marginBottom: "1rem" }}
                        />
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
                                {statusRows.map((item) => (
                                    <tr key={item.memberId}>
                                        <td className="mobile-text">
                                            {item.accountNumber}
                                        </td>
                                        <td>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                }}
                                            >
                                                <span
                                                    style={{ fontWeight: 500 }}
                                                >
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{item.fathersName}</td>
                                        <td className="text-left">
                                            {item.remainingLoanPrincipal > 0 ? (
                                                <span
                                                    style={{
                                                        color: "#ea580c",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {formatCurrency(
                                                        item.remainingLoanPrincipal,
                                                    )}
                                                </span>
                                            ) : (
                                                <span
                                                    style={{ color: "#9ca3af" }}
                                                >
                                                    0
                                                </span>
                                            )}
                                        </td>
                                        <td
                                            style={{ fontWeight: 700 }}
                                            className="text-left"
                                        >
                                            {item.breakdown
                                                ? `${item.breakdown.basic} + ${item.breakdown.devFee}${item.breakdown.loanPrincipal > 0 ? " + " + item.breakdown.loanPrincipal.toFixed(0) : ""}${item.breakdown.loanInterest > 0 ? " + " + item.breakdown.loanInterest.toFixed(0) : ""}`
                                                : formatCurrency(
                                                      item.expectedAmount,
                                                  )}
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
