import prisma from "../lib/prisma-client.js";
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

export const downloadBackup = async (req, res) => {
    try {
        const zip = new JSZip();

        // 1. Fetch all data
        const [
            members,
            accounts,
            transactions,
            loans,
            loanPayments,
            organisation,
            withdrawals,
            auditLogs,
            releasedLogs
        ] = await Promise.all([
            prisma.member.findMany(),
            prisma.account.findMany(),
            prisma.transactionLog.findMany(),
            prisma.loan.findMany(),
            prisma.loanPayment.findMany(),
            prisma.organisation.findMany(),
            prisma.orgWithdrawal.findMany(),
            prisma.auditLog.findMany(),
            prisma.releasedMoneyLog.findMany()
        ]);

        // 2. Generate SQL Dump
        let sqlDump = `-- Bank Portal System Backup\n-- Generated on: ${new Date().toISOString()}\n\n`;

        const generateTableSql = (tableName, data) => {
            if (!data.length) return "";
            let sql = `-- Data for ${tableName}\n`;
            data.forEach(row => {
                const keys = Object.keys(row);
                const values = Object.values(row).map(v => {
                    if (v === null) return "NULL";
                    if (v instanceof Date) return `'${v.toISOString()}'`;
                    if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                    return v;
                });
                sql += `INSERT INTO "${tableName}" ("${keys.join('", "')}") VALUES (${values.join(", ")});\n`;
            });
            return sql + "\n";
        };

        sqlDump += generateTableSql("Member", members);
        sqlDump += generateTableSql("Account", accounts);
        sqlDump += generateTableSql("TransactionLog", transactions);
        sqlDump += generateTableSql("Loan", loans);
        sqlDump += generateTableSql("LoanPayment", loanPayments);
        sqlDump += generateTableSql("Organisation", organisation);
        sqlDump += generateTableSql("OrgWithdrawal", withdrawals);
        sqlDump += generateTableSql("AuditLog", auditLogs);
        sqlDump += generateTableSql("ReleasedMoneyLog", releasedLogs);

        zip.file("backup_data.sql", sqlDump);

        // 3. Generate Excel
        const workbook = new ExcelJS.Workbook();

        const addSheet = (name, data) => {
            if (!data.length) return;
            const sheet = workbook.addWorksheet(name);
            const keys = Object.keys(data[0]);
            sheet.columns = keys.map(key => ({ header: key, key: key, width: 20 }));
            sheet.addRows(data);
        };

        addSheet("Members", members);
        addSheet("Accounts", accounts);
        addSheet("Transactions", transactions);
        addSheet("Loans", loans);
        addSheet("Loan Payments", loanPayments);
        addSheet("Organisation", organisation);
        addSheet("Expenses", withdrawals);
        addSheet("Audit Logs", auditLogs);
        addSheet("Released Money", releasedLogs);

        const excelBuffer = await workbook.xlsx.writeBuffer();
        zip.file("backup_records.xlsx", excelBuffer);

        // 4. Generate Zip and Send
        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=bank_backup_${new Date().toISOString().split('T')[0]}.zip`);
        res.set("Access-Control-Expose-Headers", "Content-Disposition");
        res.send(zipBuffer);

    } catch (error) {
        console.error("Backup failed:", error);
        res.status(500).json({ error: "System backup failed" });
    }
};
