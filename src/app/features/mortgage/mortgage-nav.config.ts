export type MortgageNavItem = {
  label: string;
  path: string;
};

export const MORTGAGE_NAV_ITEMS: MortgageNavItem[] = [
  { label: 'Management Summary', path: 'management-summary' },
  { label: 'Loan Alias Assignment', path: 'loan-alias-assignment' },
  { label: 'Investor Alias Assignment', path: 'investor-alias-assignment' },
  { label: 'Loan Attribute Assignment', path: 'loans-ranking' },
  { label: 'Loan Exposure Markers', path: 'security-value' },
  { label: 'Default Date', path: 'default-date-capture' },
  { label: 'Other Cost Capture', path: 'other-cost-capture' },
  { label: 'Default Analytics', path: 'default-subjective-analytics' },
  { label: 'Tax Arrears', path: 'tax-arrears-capture' },
  { label: 'Non-KS Loans', path: 'non-ks-serviced-loans' },
  { label: 'LTV Validation', path: 'ltv-validation' },
  { label: 'File Upload', path: 'cmhc-upload' },
];

export const MORTGAGE_DEFAULT_ROUTE = 'management-summary';
