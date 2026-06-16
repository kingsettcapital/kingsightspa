import {
  DynamicFieldDto,
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundDistributionGroupTabRow,
  FundNavTabRow,
  InvestorCapitalActivityTabRow,
  InvestorDetailDto,
  InvestorDistributionTableTabRow,
  InvestorInvestmentDto,
  InvestorIrrTabRow,
} from '../../../shared/models/api.models';
import { formatByFormatType, toFieldLabel } from '../../../shared/utils/dynamic-sections.util';
import { InvestorTableRow } from '../../../shared/utils/investor-list-row.util';
import { INVESTOR_DETAIL_SIDEBAR_SECTIONS } from '../models/investor-detail-sidebar.config';
import {
  InvestorDetailBlock,
  InvestorDetailDocumentListBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailKpiRowBlock,
  InvestorDetailSectionBlock,
  InvestorDetailTableBlock,
} from '../models/investor-detail-block.models';
import {
  INVESTOR_DETAIL_CELL_TONES_KEY,
  InvestorDetailColumnTone,
  InvestorDetailTableColumn,
  InvestorDetailTableRow,
} from '../models/investor-detail-table.models';

function sumColumn(rows: InvestorDetailTableRow[], key: string): number {
  return rows.reduce((total, row) => {
    const value = row[key];
    return total + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
}

function buildTotalsRow(
  columns: InvestorDetailTableColumn[],
  rows: InvestorDetailTableRow[],
  labelKey = 'fund',
  label = 'Total',
): InvestorDetailTableRow {
  const totals: InvestorDetailTableRow = { [labelKey]: label };

  for (const column of columns) {
    if (column.key === labelKey) {
      continue;
    }
    if (column.type === 'amount' || column.type === 'number') {
      totals[column.key] = sumColumn(rows, column.key);
      continue;
    }
    totals[column.key] = '—';
  }

  return totals;
}

function amountByFundCode(rows: FundAmountTabRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const code = row.fundCode?.trim();
    if (!code) {
      continue;
    }
    map.set(code, (map.get(code) ?? 0) + row.amount);
  }
  return map;
}

function lookupAmount(map: Map<string, number>, ...keys: string[]): number {
  for (const key of keys) {
    const trimmed = key.trim();
    if (!trimmed) {
      continue;
    }
    const value = map.get(trimmed);
    if (value !== undefined) {
      return value;
    }
  }
  return 0;
}

function normalizeFundName(name: string | null | undefined): string {
  return name?.trim().toLowerCase() ?? '';
}

function readInvestmentFundCode(investment: InvestorInvestmentDto): string {
  const record = investment as InvestorInvestmentDto & Record<string, unknown>;
  for (const key of ['fund_code', 'fundCode', 'FundCode']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function fundLookupKeys(
  investment: InvestorInvestmentDto,
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
): string[] {
  const keys = new Set<string>();
  const add = (value: string | null | undefined): void => {
    const trimmed = value?.trim();
    if (trimmed) {
      keys.add(trimmed);
    }
  };

  add(String(investment.fundKey));
  add(investment.fundName);
  add(readInvestmentFundCode(investment));

  const fundName = normalizeFundName(investment.fundName);
  for (const row of capitalActivities) {
    const rowName = normalizeFundName(row.fundName);
    if (
      (fundName && rowName === fundName) ||
      row.fundCode?.trim() === String(investment.fundKey)
    ) {
      add(row.fundCode);
    }
  }
  for (const row of distributionTable) {
    const rowName = normalizeFundName(row.fundName);
    if (
      (fundName && rowName === fundName) ||
      row.fundCode?.trim() === String(investment.fundKey)
    ) {
      add(row.fundCode);
    }
  }

  if (fundName) {
    keys.add(fundName);
  }

  return [...keys];
}

function calledByFundCode(rows: InvestorCapitalActivityTabRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const code = row.fundCode?.trim();
    if (code) {
      map.set(code, row.called);
    }
    const name = normalizeFundName(row.fundName);
    if (name) {
      map.set(name, row.called);
    }
  }
  return map;
}

function findDistributionRow(
  investment: InvestorInvestmentDto,
  distributionTable: InvestorDistributionTableTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
): InvestorDistributionTableTabRow | undefined {
  const lookupKeys = new Set(fundLookupKeys(investment, capitalActivities, distributionTable));
  const fundName = normalizeFundName(investment.fundName);
  return distributionTable.find((row) => {
    const code = row.fundCode?.trim();
    const name = normalizeFundName(row.fundName);
    return (
      (!!code && lookupKeys.has(code)) ||
      (!!fundName && name === fundName)
    );
  });
}

function netDistributedAmount(
  distributionRow: InvestorDistributionTableTabRow | undefined,
  fallback: number,
): number {
  if (!distributionRow) {
    return fallback;
  }
  return (
    distributionRow.cashDist + distributionRow.gainDist + distributionRow.returnOfCapital
  );
}

function investedByFundCode(rows: FundCommitmentTabRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const code = row.fundCode?.trim();
    if (!code) {
      continue;
    }
    map.set(code, (map.get(code) ?? 0) + row.amount);
  }
  return map;
}

function distributionByFundAndType(
  groups: FundDistributionGroupTabRow[],
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const group of groups) {
    const code = group.fundCode?.trim();
    if (!code) {
      continue;
    }
    const typeMap = map.get(code) ?? new Map<string, number>();
    const type = group.transactionType?.toLowerCase() ?? '';
    typeMap.set(type, (typeMap.get(type) ?? 0) + group.totalAmount);
    map.set(code, typeMap);
  }
  return map;
}

function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMultiple(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return `${value.toFixed(2)}x`;
}

function tableBlock(
  config: Omit<InvestorDetailTableBlock, 'kind'>,
): InvestorDetailTableBlock {
  return { kind: 'table', ...config };
}

export function buildFundExposureTable(
  investments: InvestorInvestmentDto[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundAmountTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
): InvestorDetailTableBlock {
  const commitmentMap = amountByFundCode(commitments);
  const unfundedMap = amountByFundCode(unfunded);
  const investedMap = investedByFundCode(capitalInvestments);
  const distributedMap = amountByFundCode(distributions);
  const calledMap = calledByFundCode(capitalActivities);

  const columns: InvestorDetailTableColumn[] = [
    { key: 'fund', label: 'Fund', type: 'text', align: 'left', sortBy: 'fund' },
    { key: 'commitment', label: 'Commitment', type: 'amount', align: 'right', sortBy: 'commitment' },
    { key: 'netInvestedCapital', label: 'Net Invested Capital', type: 'amount', align: 'right', sortBy: 'netInvestedCapital' },
    { key: 'netDistributed', label: 'Net Distributed', type: 'amount', align: 'right', sortBy: 'netDistributed' },
    { key: 'reserved', label: 'Reserved', type: 'amount', align: 'right', sortBy: 'reserved' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', sortBy: 'unfunded' },
    { key: 'releasedCapital', label: 'Released Capital', type: 'amount', align: 'right', sortBy: 'releasedCapital' },
  ];

  const rows: InvestorDetailTableRow[] = investments.map((investment) => {
    const keys = fundLookupKeys(investment, capitalActivities, distributionTable);
    const distributionRow = findDistributionRow(investment, distributionTable, capitalActivities);
    const commitment = distributionRow
      ? distributionRow.committed
      : lookupAmount(commitmentMap, ...keys) || investment.investedAmount || 0;
    const unfundedAmount = distributionRow
      ? distributionRow.unfunded
      : lookupAmount(unfundedMap, ...keys);
    const netInvestedCapital =
      lookupAmount(investedMap, ...keys) || investment.investedAmount || 0;
    const netDistributed = netDistributedAmount(
      distributionRow,
      lookupAmount(distributedMap, ...keys),
    );
    const called = lookupAmount(calledMap, ...keys);
    const reserved = called > 0 ? commitment - called : commitment - netInvestedCapital - unfundedAmount;
    const releasedCapital = distributionRow?.released ?? 0;

    return {
      fund: investment.fundName ?? '—',
      fundKey: investment.fundKey,
      commitment,
      netInvestedCapital,
      netDistributed,
      reserved,
      unfunded: unfundedAmount,
      releasedCapital,
    };
  });

  return tableBlock({
    id: 'fund-exposure',
    title: 'Fund Exposure',
    columns,
    rows,
    totals: rows.length ? buildTotalsRow(columns, rows) : null,
    collapsible: true,
    defaultExpanded: true,
  });
}

function buildCapitalAccountGrid(kpi: InvestorDetailKpiCards): InvestorDetailFieldGridBlock {
  const deployedPct =
    kpi.totalCommitment > 0
      ? (kpi.netInvestedCapital / kpi.totalCommitment) * 100
      : 0;
  const totalValue = kpi.netInvestedCapital + kpi.netDistributed;
  const tvpi = kpi.netInvestedCapital > 0 ? totalValue / kpi.netInvestedCapital : 0;

  return {
    kind: 'field-grid',
    id: 'capital-account',
    title: 'Capital Account',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        fields: [
          { label: 'Total Commitment (ITD)', value: formatCurrencyCompact(kpi.totalCommitment) },
          { label: 'Net Invested Capital (ITD)', value: formatCurrencyCompact(kpi.netInvestedCapital) },
          { label: 'Reserved', value: formatCurrencyCompact(kpi.reservedUncalled) },
          { label: '% Deployed', value: `${deployedPct.toFixed(1)}%` },
        ],
      },
      {
        fields: [
          { label: 'Net Distributed (ITD)', value: formatCurrencyCompact(kpi.netDistributed) },
          { label: 'Released Capital', value: formatCurrencyCompact(kpi.releasedCapital) },
          { label: 'Total Value (Invested+Dist.)', value: formatCurrencyCompact(totalValue) },
          { label: 'Investment Multiple (TVPI)', value: formatMultiple(tvpi) },
        ],
      },
    ],
  };
}

function buildPerformanceKpiRow(kpi: InvestorDetailKpiCards): InvestorDetailKpiRowBlock {
  const dpi = kpi.netInvestedCapital > 0 ? kpi.netDistributed / kpi.netInvestedCapital : 0;
  const totalValue = kpi.netInvestedCapital + kpi.netDistributed;
  const tvpi = kpi.netInvestedCapital > 0 ? totalValue / kpi.netInvestedCapital : 0;
  const rvpi = Math.max(tvpi - dpi, 0);

  return {
    kind: 'kpi-row',
    id: 'performance-metrics',
    title: 'Performance Metrics',
    collapsible: true,
    defaultExpanded: true,
    cards: [
      { label: 'TVPI', value: formatMultiple(tvpi), variant: 'navy' },
      { label: 'DPI', value: formatMultiple(dpi), variant: 'blue' },
      { label: 'RVPI', value: formatMultiple(rvpi), variant: 'blue-light' },
      { label: 'FUNDS', value: String(kpi.fundsCount), variant: 'gold' },
    ],
  };
}

function occupancyTone(value: number | null | undefined): InvestorDetailColumnTone {
  if (value == null || !Number.isFinite(value)) {
    return 'muted';
  }
  return value >= 90 ? 'positive' : 'warning';
}

function buildUnderlyingInvestmentsTable(
  investments: InvestorInvestmentDto[],
): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'property', label: 'Property', type: 'text', align: 'left', sortBy: 'property' },
    { key: 'type', label: 'Type', type: 'text', align: 'left', tone: 'muted', sortBy: 'type' },
    { key: 'city', label: 'City', type: 'text', align: 'left', tone: 'muted', sortBy: 'city' },
    { key: 'fund', label: 'Fund', type: 'text', align: 'left', tone: 'muted', sortBy: 'fund' },
    { key: 'gla', label: 'GLA (sf)', type: 'number', align: 'right', sortBy: 'gla' },
    { key: 'occupancy', label: 'Occupancy', type: 'percent', align: 'right', sortBy: 'occupancy' },
    { key: 'marketValue', label: 'Market Value', type: 'amount', align: 'right', sortBy: 'marketValue' },
    { key: 'capRate', label: 'Cap Rate', type: 'percent', align: 'right', tone: 'muted', sortBy: 'capRate' },
    { key: 'status', label: 'Status', type: 'status', align: 'left', sortBy: 'status' },
  ];

  const rows: InvestorDetailTableRow[] = investments.map((investment) => {
    const occupancy = investment.totalReturnPercent;
    return {
      property: investment.fundName ?? '—',
      type: investment.fundType ?? investment.fundCategory ?? '—',
      city: '—',
      fund: investment.fundName ?? '—',
      gla: 0,
      occupancy,
      marketValue: investment.investedAmountFmv ?? investment.investedAmount ?? 0,
      capRate: null,
      status: investment.status ?? '—',
      [INVESTOR_DETAIL_CELL_TONES_KEY]: {
        occupancy: occupancyTone(occupancy),
      },
    };
  });

  return tableBlock({
    id: 'underlying-investments',
    title: 'Underlying Assets',
    subtitle: `${rows.length} propert${rows.length === 1 ? 'y' : 'ies'} across ${investments.length} fund${investments.length === 1 ? '' : 's'}`,
    columns,
    rows,
    collapsible: false,
    defaultExpanded: true,
    variant: 'investments',
  });
}

function fundToolbarTableBlock(
  config: Omit<InvestorDetailTableBlock, 'kind' | 'variant' | 'showToolbar' | 'collapsible' | 'defaultExpanded'>,
): InvestorDetailTableBlock {
  return tableBlock({
    ...config,
    collapsible: false,
    defaultExpanded: true,
    variant: 'transactions',
    showToolbar: true,
  });
}

function capitalActivityRowsToTableRows(rows: InvestorCapitalActivityTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    fundCode: row.fundCode,
    fundName: row.fundName,
    called: row.called,
    transferIn: row.transferIn,
    transferOut: row.transferOut,
    redemption: row.redemption,
  }));
}

function distributionTableRowsToTableRows(rows: InvestorDistributionTableTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    fundCode: row.fundCode,
    fundName: row.fundName,
    prefReturn: row.preferredReturn,
    committed: row.committed,
    unfunded: row.unfunded,
    cashDist: row.cashDist,
    gainDist: row.gainDist,
    returnOfCapital: row.returnOfCapital,
    released: row.released,
  }));
}

function irrRowsToTableRows(rows: InvestorIrrTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    fundCode: row.fundCode,
    fundName: row.fundName,
    irr1Year: row.irr1Year,
    irr3Year: row.irr3Year,
    irr5Year: row.irr5Year,
    irr7Year: row.irr7Year,
    irr10Year: row.irr10Year,
    irrLtd: row.irrLtd,
  }));
}

function buildCapitalActivitiesTable(
  rows: InvestorCapitalActivityTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = capitalActivityRowsToTableRows(rows);
  const columns: InvestorDetailTableColumn[] = [
    { key: 'fundCode', label: 'Fund Code', type: 'link', align: 'left', sortBy: 'fund_code' },
    { key: 'fundName', label: 'Fund Name', type: 'text', align: 'left', sortBy: 'fund_name' },
    { key: 'called', label: 'Called', type: 'amount', align: 'right', sortBy: 'called' },
    { key: 'transferIn', label: 'Transfer In', type: 'amount', align: 'right', sortBy: 'transfer_in' },
    { key: 'transferOut', label: 'Transfer Out', type: 'amount', align: 'right', tone: 'negative', sortBy: 'transfer_out' },
    { key: 'redemption', label: 'Redemption', type: 'amount', align: 'right', sortBy: 'redemption' },
  ];

  return fundToolbarTableBlock({
    id: 'capital-activities',
    title: 'Capital Activities',
    subtitle: 'Capital calls, transfers, and redemptions across fund subscriptions ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'fundCode', `Total — ${tableRows.length}`) : null,
  });
}

function buildDistributionsTable(
  rows: InvestorDistributionTableTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = distributionTableRowsToTableRows(rows);
  const columns: InvestorDetailTableColumn[] = [
    { key: 'fundCode', label: 'Fund Code', type: 'link', align: 'left', sortBy: 'fund_code' },
    { key: 'fundName', label: 'Fund Name', type: 'text', align: 'left', sortBy: 'fund_name' },
    { key: 'prefReturn', label: `Pref. Return (${periodLabel})`, type: 'amount', align: 'right', tone: 'info', sortBy: 'preferred_return' },
    { key: 'committed', label: 'Committed', type: 'amount', align: 'right', sortBy: 'committed' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', tone: 'warning', sortBy: 'unfunded' },
    { key: 'cashDist', label: `Cash Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive', sortBy: 'cash_dist' },
    { key: 'gainDist', label: `Gain Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive', sortBy: 'gain_dist' },
    { key: 'returnOfCapital', label: 'Return of Capital', type: 'amount', align: 'right', sortBy: 'return_of_capital' },
    { key: 'released', label: 'Released', type: 'amount', align: 'right', sortBy: 'released' },
  ];

  return fundToolbarTableBlock({
    id: 'distributions',
    title: 'Distributions',
    subtitle: 'Distribution activity and capital account balances by fund ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'fundCode', `Total — ${tableRows.length}`) : null,
  });
}

function buildIrrsTable(
  rows: InvestorIrrTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = irrRowsToTableRows(rows);
  const columns: InvestorDetailTableColumn[] = [
    { key: 'fundCode', label: 'Fund Code', type: 'link', align: 'left', sortBy: 'fund_code' },
    { key: 'fundName', label: 'Fund Name', type: 'text', align: 'left', sortBy: 'fund_name' },
    { key: 'irr1Year', label: '1Y IRR', type: 'percent', align: 'right', sortBy: 'irr_1_year_pct' },
    { key: 'irr3Year', label: '3Y IRR', type: 'percent', align: 'right', sortBy: 'irr_3_year_pct' },
    { key: 'irr5Year', label: '5Y IRR', type: 'percent', align: 'right', sortBy: 'irr_5_year_pct' },
    { key: 'irr7Year', label: '7Y IRR', type: 'percent', align: 'right', sortBy: 'irr_7_year_pct' },
    { key: 'irr10Year', label: '10Y IRR', type: 'percent', align: 'right', sortBy: 'irr_10_year_pct' },
    { key: 'irrLtd', label: 'ITD IRR', type: 'percent', align: 'right', tone: 'info', sortBy: 'irr_ltd_pct' },
  ];

  return fundToolbarTableBlock({
    id: 'irrs',
    title: 'IRRs',
    subtitle: 'Internal rate of return by fund subscription ·',
    subtitleAccent: periodLabel,
    columns,
    rows: tableRows,
    totals: null,
  });
}

function buildDocumentsList(detail: InvestorDetailDto | null): InvestorDetailDocumentListBlock {
  const count = detail?.summary.documentsCount ?? 0;
  const documents = Array.from({ length: Math.max(count, 3) }, (_, index) => ({
    name: `Fund Report Q${(index % 4) + 1} 2024`,
    category: index % 2 === 0 ? 'Quarterly Report' : 'Statement',
    date: `2024-${String((index % 12) + 1).padStart(2, '0')}-15`,
    size: `${(1.2 + index * 0.3).toFixed(1)} MB`,
  }));

  return {
    kind: 'document-list',
    id: 'documents',
    title: 'Documents',
    subtitle: 'Financial statements, reports, and fund agreements',
    collapsible: false,
    defaultExpanded: true,
    documents,
  };
}

function buildRiskComplianceGrid(): InvestorDetailFieldGridBlock {
  return {
    kind: 'field-grid',
    id: 'risk-compliance',
    title: 'Risk & Compliance',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        title: 'KYC / AML',
        fields: [
          { label: 'Status', value: 'Completed', tone: 'positive' },
          { label: 'Last Review', value: '2024-09-15' },
          { label: 'Next Review', value: '2025-09-15' },
          { label: 'Risk Rating', value: 'Low', tone: 'positive' },
        ],
      },
      {
        title: 'Subscription Agreement',
        fields: [
          { label: 'Status', value: 'Fully Executed' },
          { label: 'Signed Date', value: '2019-03-22' },
          { label: 'Governing Law', value: 'Ontario' },
          { label: 'Side Letter', value: 'Yes' },
        ],
      },
    ],
  };
}

function buildCommunicationsTable(): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'date', label: 'Date', type: 'date', align: 'left', tone: 'muted', sortBy: 'date' },
    { key: 'description', label: 'Description', type: 'text', align: 'left', sortBy: 'description' },
    { key: 'status', label: 'Status', type: 'status', align: 'right', sortBy: 'status' },
  ];

  const rows: InvestorDetailTableRow[] = [
    { date: '2024-11-01', description: 'Q3 2024 Investor Letter', status: 'Sent' },
    { date: '2024-10-15', description: 'Capital Call Notice — KMT Fund', status: 'Sent' },
    { date: '2024-09-30', description: 'Annual KYC Review Reminder', status: 'Completed' },
    { date: '2024-12-01', description: 'Q4 2024 Report Distribution', status: 'Scheduled' },
  ];

  return tableBlock({
    id: 'communications',
    title: 'Communications & Reporting',
    columns,
    rows,
    collapsible: true,
    defaultExpanded: true,
    variant: 'communications',
  });
}

function buildPortfolioFieldGrid(fields: DynamicFieldDto[] | null | undefined): InvestorDetailFieldGridBlock | null {
  if (!fields?.length) {
    return null;
  }

  const midpoint = Math.ceil(fields.length / 2);
  const left = fields.slice(0, midpoint);
  const right = fields.slice(midpoint);

  const mapFields = (items: DynamicFieldDto[]) =>
    items.map((field) => ({
      label: field.key ? toFieldLabel(field.key) : 'Field',
      value: formatByFormatType(field.value, field.formatType) ?? '—',
    }));

  return {
    kind: 'field-grid',
    id: 'portfolio-summary',
    title: 'Portfolio Summary',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      { fields: mapFields(left) },
      { fields: mapFields(right) },
    ],
  };
}

function buildContactFieldGrid(fields: DynamicFieldDto[] | null | undefined): InvestorDetailFieldGridBlock | null {
  if (!fields?.length) {
    return null;
  }

  const midpoint = Math.ceil(fields.length / 2);
  const left = fields.slice(0, midpoint);
  const right = fields.slice(midpoint);

  const mapFields = (items: DynamicFieldDto[]) =>
    items.map((field) => ({
      label: field.key ? toFieldLabel(field.key) : 'Field',
      value: formatByFormatType(field.value, field.formatType) ?? '—',
    }));

  return {
    kind: 'field-grid',
    id: 'contact-information',
    title: 'Contact Information',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      { fields: mapFields(left) },
      { fields: mapFields(right) },
    ],
  };
}

export type InvestorDetailSectionId =
  | 'overview'
  | 'fund-exposure'
  | 'capital-account'
  | 'performance'
  | 'investments'
  | 'capital-activities'
  | 'distributions'
  | 'irrs'
  | 'documents'
  | 'risk-compliance'
  | 'communications';

export function distributionAmountRows(groups: FundDistributionGroupTabRow[]): FundAmountTabRow[] {
  return groups.map((group) => ({
    fundCode: group.fundCode,
    amount: group.totalAmount,
    description: group.transactionType,
    period: '',
  }));
}

export function buildBlocksForSection(
  sectionId: InvestorDetailSectionId,
  detail: InvestorDetailDto | null,
  investments: InvestorInvestmentDto[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundDistributionGroupTabRow[],
  nav: FundNavTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestorDetailKpiCards,
  periodLabel: string,
): InvestorDetailBlock[] {
  const distributionRows = distributionAmountRows(distributions);
  const fundExposure = buildFundExposureTable(
    investments,
    commitments,
    unfunded,
    capitalInvestments,
    distributionRows,
    capitalActivities,
    distributionTable,
  );
  switch (sectionId) {
    case 'overview':
      return [];
    case 'fund-exposure':
      return [fundExposure];
    case 'capital-account':
      return [buildCapitalAccountGrid(kpi)];
    case 'performance':
      return [buildPerformanceKpiRow(kpi)];
    case 'investments':
      return investments.length
        ? [buildUnderlyingInvestmentsTable(investments)]
        : [
            tableBlock({
              id: 'underlying-investments',
              title: 'Underlying Assets',
              columns: [{ key: 'message', label: 'Status', type: 'text', align: 'left' }],
              rows: [{ message: 'No underlying assets available.' }],
              collapsible: true,
              defaultExpanded: true,
            }),
          ];
    case 'capital-activities':
      return [buildCapitalActivitiesTable(capitalActivities, periodLabel)];
    case 'distributions':
      return [buildDistributionsTable(distributionTable, periodLabel)];
    case 'irrs':
      return [buildIrrsTable(irr, periodLabel)];
    case 'documents':
      return [buildDocumentsList(detail)];
    case 'risk-compliance':
      return [buildRiskComplianceGrid()];
    case 'communications':
      return [buildCommunicationsTable()];
    default:
      return [fundExposure];
  }
}

export interface InvestorDetailFlatBlock {
  sectionId: string;
  block: InvestorDetailBlock;
  isSectionStart: boolean;
}

export function buildFlatInvestorBlocks(
  detail: InvestorDetailDto | null,
  investments: InvestorInvestmentDto[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundDistributionGroupTabRow[],
  nav: FundNavTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestorDetailKpiCards,
  periodLabel: string,
): InvestorDetailFlatBlock[] {
  const sections = buildAllSectionBlocks(
    detail,
    investments,
    commitments,
    unfunded,
    capitalInvestments,
    distributions,
    nav,
    capitalActivities,
    distributionTable,
    irr,
    kpi,
    periodLabel,
  );

  const flat: InvestorDetailFlatBlock[] = [];
  for (const section of sections) {
    if (!section.blocks.length) {
      continue;
    }
    section.blocks.forEach((block, index) => {
      flat.push({
        sectionId: section.sectionId,
        block,
        isSectionStart: index === 0,
      });
    });
  }
  return flat;
}

export function buildAllSectionBlocks(
  detail: InvestorDetailDto | null,
  investments: InvestorInvestmentDto[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundDistributionGroupTabRow[],
  nav: FundNavTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestorDetailKpiCards,
  periodLabel: string,
): InvestorDetailSectionBlock[] {
  return INVESTOR_DETAIL_SIDEBAR_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: item.id,
      blocks: buildBlocksForSection(
        item.id as InvestorDetailSectionId,
        detail,
        investments,
        commitments,
        unfunded,
        capitalInvestments,
        distributions,
        nav,
        capitalActivities,
        distributionTable,
        irr,
        kpi,
        periodLabel,
      ),
    })),
  );
}

export interface InvestorDetailKpiCards {
  totalCommitment: number;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number;
  unfunded: number;
  releasedCapital: number;
  fundsCount: number;
}

export function kpiCardsFromListRow(row: InvestorTableRow | null): InvestorDetailKpiCards {
  if (!row) {
    return {
      totalCommitment: 0,
      netInvestedCapital: 0,
      netDistributed: 0,
      reservedUncalled: 0,
      unfunded: 0,
      releasedCapital: 0,
      fundsCount: 0,
    };
  }

  return {
    totalCommitment: row.commitment,
    netInvestedCapital: row.netInvestedCapital,
    netDistributed: row.netDistributed,
    reservedUncalled: row.reservedUncalled,
    unfunded: row.unfunded,
    releasedCapital: row.releasedCapital ?? 0,
    fundsCount: row.fundsCount,
  };
}

function readTableTotal(totals: InvestorDetailTableRow | null | undefined, key: string): number {
  const value = totals?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Prefer fund-exposure totals for metrics the list API may omit. */
export function mergeKpiCardsWithFundExposure(
  base: InvestorDetailKpiCards,
  exposure: InvestorDetailTableBlock | null,
): InvestorDetailKpiCards {
  const totals = exposure?.totals;
  if (!totals || !(exposure?.rows?.length ?? 0)) {
    return base;
  }

  return {
    ...base,
    reservedUncalled: readTableTotal(totals, 'reserved'),
    unfunded: readTableTotal(totals, 'unfunded'),
    releasedCapital: readTableTotal(totals, 'releasedCapital'),
  };
}
