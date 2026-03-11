import * as XLSX from 'xlsx';

const TIMING_LABELS = {
  before_show: 'Before Show',
  during_show: 'During Show',
  after_show: 'After Show',
};

const UNIT_LABELS = {
  flat: 'Flat Fee',
  per_day: 'Per Day',
  per_head: 'Per Head',
  per_hour: 'Per Hour',
  per_unit: 'Per Unit',
  per_person: 'Per Person',
};

const PAYMENT_TIMING_LABELS = {
  pre_entry: 'Pre-Entry / Reservation',
  at_check_in: 'At Check-In',
  settlement: 'Post-Show / Settlement',
};

/**
 * Export show budget (fees + expenses + profit/loss) as an Excel file.
 */
export const exportShowBudgetToExcel = (formData) => {
  const fees = formData.fees || [];
  const expenses = formData.showExpenses || [];
  const showName = formData.showName || 'Untitled Show';

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Income (Fees + Sponsorship) ---
  const sponsorshipItems = formData.sponsorshipRevenue || [];

  const feeRows = fees.map(fee => ({
    'Name': fee.name || '',
    'Type': fee.type || '',
    'Amount': parseFloat(fee.amount) || 0,
    'Payment Timing': PAYMENT_TIMING_LABELS[fee.payment_timing] || fee.payment_timing || '',
    'Per Judge': fee.apply_per_judge ? 'Yes' : 'No',
    'Notes': fee.notes || '',
  }));
  const totalFeeIncome = feeRows.reduce((sum, r) => sum + r['Amount'], 0);
  feeRows.push({ Name: 'SUBTOTAL FEE REVENUE', Type: '', Amount: totalFeeIncome, 'Payment Timing': '', 'Per Judge': '', Notes: '' });

  feeRows.push({ Name: '', Type: '', Amount: '', 'Payment Timing': '', 'Per Judge': '', Notes: '' });
  for (const sponsor of sponsorshipItems.filter(s => s.name)) {
    feeRows.push({
      Name: sponsor.name,
      Type: 'Sponsorship',
      Amount: parseFloat(sponsor.amount) || 0,
      'Payment Timing': '',
      'Per Judge': '',
      Notes: sponsor.notes || '',
    });
  }
  const totalSponsorship = sponsorshipItems.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  feeRows.push({ Name: 'SUBTOTAL SPONSORSHIP', Type: '', Amount: totalSponsorship, 'Payment Timing': '', 'Per Judge': '', Notes: '' });

  const totalIncome = totalFeeIncome + totalSponsorship;
  feeRows.push({ Name: '', Type: '', Amount: '', 'Payment Timing': '', 'Per Judge': '', Notes: '' });
  feeRows.push({ Name: 'TOTAL INCOME', Type: '', Amount: totalIncome, 'Payment Timing': '', 'Per Judge': '', Notes: '' });

  const wsFees = XLSX.utils.json_to_sheet(feeRows);
  wsFees['!cols'] = [
    { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 24 }, { wch: 10 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFees, 'Income');

  // --- Sheet 2: Expenses (grouped by timing bucket) ---
  const awardExpenses = formData.awardExpenses || [];
  const classAwards = formData.classAwards || {};
  const expenseRows = [];
  let totalShowExpenses = 0;

  const emptyExpenseRow = { 'Expense Name': '', Category: '', Unit: '', Qty: '', 'Unit Cost': '', Timing: '', 'Due Date': '', 'Line Total': '', Notes: '' };

  for (const timingId of ['before_show', 'during_show', 'after_show']) {
    const bucketExpenses = expenses.filter(e => e.name && e.timing === timingId);
    if (bucketExpenses.length === 0) continue;
    expenseRows.push({ ...emptyExpenseRow, 'Expense Name': TIMING_LABELS[timingId] });
    for (const expense of bucketExpenses) {
      const unitCost = parseFloat(expense.amount) || 0;
      const qty = parseInt(expense.quantity) || 1;
      const lineTotal = unitCost * qty;
      totalShowExpenses += lineTotal;
      expenseRows.push({
        'Expense Name': expense.name,
        Category: expense.category || '',
        Unit: UNIT_LABELS[expense.unit] || expense.unit || 'Flat Fee',
        Qty: qty,
        'Unit Cost': unitCost,
        Timing: TIMING_LABELS[expense.timing] || '',
        'Due Date': expense.dueDate || '',
        'Line Total': lineTotal,
        Notes: expense.notes || '',
      });
    }
    const bucketTotal = bucketExpenses.reduce((sum, e) => sum + ((parseFloat(e.amount) || 0) * (parseInt(e.quantity) || 1)), 0);
    expenseRows.push({ ...emptyExpenseRow, 'Expense Name': `Subtotal ${TIMING_LABELS[timingId]}`, 'Line Total': bucketTotal });
    expenseRows.push({ ...emptyExpenseRow });
  }

  // Include any expenses without a timing value
  const untimed = expenses.filter(e => e.name && !e.timing);
  for (const expense of untimed) {
    const unitCost = parseFloat(expense.amount) || 0;
    const qty = parseInt(expense.quantity) || 1;
    const lineTotal = unitCost * qty;
    totalShowExpenses += lineTotal;
    expenseRows.push({
      'Expense Name': expense.name,
      Category: expense.category || '',
      Unit: UNIT_LABELS[expense.unit] || expense.unit || 'Flat Fee',
      Qty: qty,
      'Unit Cost': unitCost,
      Timing: '',
      'Due Date': expense.dueDate || '',
      'Line Total': lineTotal,
      Notes: expense.notes || '',
    });
  }

  expenseRows.push({ ...emptyExpenseRow, 'Expense Name': 'SUBTOTAL SHOW EXPENSES', 'Line Total': totalShowExpenses });

  // Award expenses
  expenseRows.push({ ...emptyExpenseRow });
  for (const award of awardExpenses.filter(a => a.name)) {
    const lineTotal = (parseFloat(award.amount) || 0) * (parseInt(award.qty) || 1);
    expenseRows.push({
      'Expense Name': award.name,
      Category: 'Awards',
      Unit: '',
      Qty: parseInt(award.qty) || 1,
      'Unit Cost': parseFloat(award.amount) || 0,
      Timing: '',
      'Due Date': '',
      'Line Total': lineTotal,
      Notes: award.qty > 1 ? `${award.qty} x $${award.amount}` : '',
    });
  }
  const totalAwardExp = awardExpenses.reduce((sum, a) => sum + ((parseFloat(a.amount) || 0) * (parseInt(a.qty) || 1)), 0);
  const totalClassAwards = Object.values(classAwards).reduce((sum, a) => sum + (parseFloat(a.budget) || 0), 0);
  if (totalClassAwards > 0) {
    expenseRows.push({ ...emptyExpenseRow, 'Expense Name': 'Class Awards Budget', Category: 'Awards', 'Line Total': totalClassAwards });
  }
  expenseRows.push({ ...emptyExpenseRow, 'Expense Name': 'SUBTOTAL AWARD EXPENSES', 'Line Total': totalAwardExp + totalClassAwards });

  const totalExpenses = totalShowExpenses + totalAwardExp + totalClassAwards;
  expenseRows.push({ ...emptyExpenseRow });
  expenseRows.push({ ...emptyExpenseRow, 'Expense Name': 'TOTAL EXPENSES', 'Line Total': totalExpenses });

  const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
  wsExpenses['!cols'] = [
    { wch: 32 }, { wch: 24 }, { wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

  // --- Sheet 3: Budget Summary ---
  const summaryRows = [
    { 'Item': 'Fee Revenue', 'Amount': totalFeeIncome },
    { 'Item': 'Sponsorship Revenue', 'Amount': totalSponsorship },
    { 'Item': 'Total Revenue', 'Amount': totalIncome },
    { 'Item': '', 'Amount': '' },
    { 'Item': 'Total Expenses', 'Amount': totalExpenses },
    { 'Item': '', 'Amount': '' },
    { 'Item': 'Projected Profit / Loss', 'Amount': totalIncome - totalExpenses },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Budget Summary');

  // Download
  const fileName = `${showName.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Budget'} - Show Budget.xlsx`;
  XLSX.writeFile(wb, fileName);
  return true;
};
