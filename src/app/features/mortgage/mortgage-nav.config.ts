export type MortgageNavItem = {
  label: string;
  path: string;
};

export const MORTGAGE_NAV_ITEMS: MortgageNavItem[] = [
  { label: 'Management Summary', path: 'management-summary' },
  { label: 'Loans & Ranking', path: 'loans-ranking' },
  { label: 'Loan Alias', path: 'loan-alias' },
  { label: 'Loan Assignment', path: 'loan-alias-assignment' },
  { label: 'Investor Alias', path: 'investor-alias' },
  { label: 'Investor Assignment', path: 'investor-alias-assignment' },
  { label: 'Security Value', path: 'security-value' },
  { label: 'File Upload', path: 'cmhc-upload' },
  { label: 'Other Cost', path: 'other-cost-capture' },
  { label: 'Default Date', path: 'default-date-capture' },
  { label: 'Default Analytics', path: 'default-subjective-analytics' },
  { label: 'Tax Arrears', path: 'tax-arrears-capture' },
  { label: 'LTV Validation', path: 'ltv-validation' },
  { label: 'Non-KS Loans', path: 'non-ks-serviced-loans' },
];

export const MORTGAGE_DEFAULT_ROUTE = 'management-summary';
