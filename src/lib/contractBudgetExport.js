import * as XLSX from 'xlsx';
import { flattenPersonnel, calculateMemberFinancials, currency } from '@/lib/contractUtils';

/**
 * Export contract budget data as an Excel (.xlsx) file.
 * Columns: Name | Role | Association | Days | Day Rate | Day Pay | Expenses | Total
 */
export const exportBudgetToExcel = (formData) => {
  const personnel = flattenPersonnel(formData);
  if (personnel.length === 0) return false;

  const showName = formData.showName || 'Untitled Show';

  // Build rows
  const rows = personnel.map((member) => {
    const fin = calculateMemberFinancials(member);
    return {
      Name: member.name || 'Unnamed',
      Role: member.roleName || '',
      Association: member.assocId || '',
      Days: fin.employmentDays,
      'Day Rate': fin.dayFee,
      'Day Pay': fin.totalDayFee,
      Expenses: fin.totalExpenses,
      Total: fin.totalCompensation,
    };
  });

  // Add totals row
  const totals = rows.reduce(
    (acc, r) => ({
      Days: acc.Days + r.Days,
      'Day Pay': acc['Day Pay'] + r['Day Pay'],
      Expenses: acc.Expenses + r.Expenses,
      Total: acc.Total + r.Total,
    }),
    { Days: 0, 'Day Pay': 0, Expenses: 0, Total: 0 }
  );

  rows.push({
    Name: 'TOTAL',
    Role: '',
    Association: '',
    Days: totals.Days,
    'Day Rate': '',
    'Day Pay': totals['Day Pay'],
    Expenses: totals.Expenses,
    Total: totals.Total,
  });

  // Create workbook
  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 22 }, // Name
    { wch: 18 }, // Role
    { wch: 14 }, // Association
    { wch: 6 },  // Days
    { wch: 12 }, // Day Rate
    { wch: 12 }, // Day Pay
    { wch: 12 }, // Expenses
    { wch: 14 }, // Total
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Budget');

  // Download
  const fileName = `${showName.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Budget'} - Contract Budget.xlsx`;
  XLSX.writeFile(wb, fileName);
  return true;
};
