import {
  DynamicFieldDto,
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundDistributionGroupTabRow,
  FundNavTabRow,
  InvestorDetailDto,
  InvestorInvestmentDto,
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
): InvestorDetailTableBlock {
  const commitmentMap = amountByFundCode(commitments);
  const unfundedMap = amountByFundCode(unfunded);
  const investedMap = investedByFundCode(capitalInvestments);
  const distributedMap = amountByFundCode(distributions);

  const columns: InvestorDetailTableColumn[] = [
    { key: 'fund', label: 'Fund', type: 'text', align: 'left' },
    { key: 'since', label: 'Since', type: 'date', align: 'left', tone: 'muted' },
    { key: 'commitment', label: 'Commitment', type: 'amount', align: 'right' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', tone: 'warning' },
    { key: 'netInvested', label: 'Net Invested', type: 'amount', align: 'right' },
    { key: 'distributed', label: 'Distributed', type: 'amount', align: 'right', tone: 'positive' },
  ];

  const rows: InvestorDetailTableRow[] = investments.map((investment) => {
    const fundCode = String(investment.fundKey);
    return {
      fund: investment.fundName ?? '—',
      since: '—',
      commitment: commitmentMap.get(fundCode) ?? investment.investedAmount ?? 0,
      unfunded: unfundedMap.get(fundCode) ?? 0,
      netInvested: investedMap.get(fundCode) ?? investment.investedAmount ?? 0,
      distributed: distributedMap.get(fundCode) ?? 0,
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
          { label: 'Total Commitment (LTD)', value: formatCurrencyCompact(kpi.totalCommitment) },
          { label: 'Net Invested Capital (LTD)', value: formatCurrencyCompact(kpi.netInvestedCapital) },
          { label: 'Reserved / Uncalled', value: formatCurrencyCompact(kpi.reservedUncalled) },
          { label: '% Deployed', value: `${deployedPct.toFixed(1)}%` },
        ],
      },
      {
        fields: [
          { label: 'Net Distributed (LTD)', value: formatCurrencyCompact(kpi.netDistributed) },
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
    { key: 'property', label: 'Property', type: 'text', align: 'left' },
    { key: 'type', label: 'Type', type: 'text', align: 'left', tone: 'muted' },
    { key: 'city', label: 'City', type: 'text', align: 'left', tone: 'muted' },
    { key: 'fund', label: 'Fund', type: 'text', align: 'left', tone: 'muted' },
    { key: 'gla', label: 'GLA (sf)', type: 'number', align: 'right' },
    { key: 'occupancy', label: 'Occupancy', type: 'percent', align: 'right' },
    { key: 'marketValue', label: 'Market Value', type: 'amount', align: 'right' },
    { key: 'capRate', label: 'Cap Rate', type: 'percent', align: 'right', tone: 'muted' },
    { key: 'status', label: 'Status', type: 'status', align: 'left' },
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
    title: 'Underlying Investments',
    subtitle: `${rows.length} propert${rows.length === 1 ? 'y' : 'ies'} across ${investments.length} fund${investments.length === 1 ? '' : 's'}`,
    columns,
    rows,
    collapsible: false,
    defaultExpanded: true,
    variant: 'investments',
  });
}

function buildTransactionsTable(
  investments: InvestorInvestmentDto[],
  commitments: FundAmountTabRow[],
  unfunded: FundAmountTabRow[],
  capitalInvestments: FundCommitmentTabRow[],
  distributions: FundDistributionGroupTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const commitmentMap = amountByFundCode(commitments);
  const unfundedMap = amountByFundCode(unfunded);
  const calledMap = investedByFundCode(capitalInvestments);
  const distributionMap = distributionByFundAndType(distributions);

  const columns: InvestorDetailTableColumn[] = [
    { key: 'fundCode', label: 'Fund Code', type: 'link', align: 'left' },
    { key: 'fundName', label: 'Fund Name', type: 'text', align: 'left' },
    { key: 'committed', label: 'Committed', type: 'amount', align: 'right' },
    { key: 'called', label: 'Called', type: 'amount', align: 'right' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', tone: 'warning' },
    { key: 'cashDist', label: `Cash Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive' },
    { key: 'gainDist', label: `Gain Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive' },
    { key: 'prefReturn', label: `Pref. Return (${periodLabel})`, type: 'amount', align: 'right', tone: 'info' },
    { key: 'transferIn', label: 'Transfer In', type: 'amount', align: 'right', tone: 'positive' },
    { key: 'transferOut', label: 'Transfer Out', type: 'amount', align: 'right', tone: 'negative' },
    { key: 'released', label: 'Released', type: 'amount', align: 'right' },
  ];

  const findDistAmount = (typeMap: Map<string, number> | undefined, ...patterns: string[]): number => {
    if (!typeMap) {
      return 0;
    }
    let total = 0;
    for (const [type, amount] of typeMap.entries()) {
      if (patterns.some((pattern) => type.includes(pattern))) {
        total += amount;
      }
    }
    return total;
  };

  const rows: InvestorDetailTableRow[] = investments.map((investment) => {
    const fundCode = String(investment.fundKey);
    const typeMap = distributionMap.get(fundCode);
    return {
      fundCode,
      fundName: investment.fundName ?? '—',
      committed: commitmentMap.get(fundCode) ?? 0,
      called: calledMap.get(fundCode) ?? 0,
      unfunded: unfundedMap.get(fundCode) ?? 0,
      cashDist: findDistAmount(typeMap, 'cash'),
      gainDist: findDistAmount(typeMap, 'gain'),
      prefReturn: findDistAmount(typeMap, 'pref', 'preferred'),
      transferIn: findDistAmount(typeMap, 'transfer in'),
      transferOut: findDistAmount(typeMap, 'transfer out'),
      released: 0,
    };
  });

  return tableBlock({
    id: 'transactions',
    title: 'Transactions by Fund',
    subtitle: 'Capital account activity across all fund subscriptions ·',
    subtitleAccent: periodLabel,
    columns,
    rows,
    totals: rows.length ? buildTotalsRow(columns, rows, 'fundCode', `Total — ${rows.length}`) : null,
    collapsible: false,
    defaultExpanded: true,
    variant: 'transactions',
    showToolbar: true,
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
    { key: 'date', label: 'Date', type: 'date', align: 'left', tone: 'muted' },
    { key: 'description', label: 'Description', type: 'text', align: 'left' },
    { key: 'status', label: 'Status', type: 'status', align: 'right' },
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
  | 'transactions'
  | 'documents'
  | 'risk-compliance'
  | 'communications';

function distributionAmountRows(groups: FundDistributionGroupTabRow[]): FundAmountTabRow[] {
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
              title: 'Underlying Investments',
              columns: [{ key: 'message', label: 'Status', type: 'text', align: 'left' }],
              rows: [{ message: 'No underlying investments available.' }],
              collapsible: true,
              defaultExpanded: true,
            }),
          ];
    case 'transactions':
      return investments.length
        ? [
            buildTransactionsTable(
              investments,
              commitments,
              unfunded,
              capitalInvestments,
              distributions,
              periodLabel,
            ),
          ]
        : [
            tableBlock({
              id: 'transactions',
              title: 'Transactions by Fund',
              columns: [{ key: 'message', label: 'Status', type: 'text', align: 'left' }],
              rows: [{ message: 'No transactions available.' }],
              collapsible: true,
              defaultExpanded: true,
            }),
          ];
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
      releasedCapital: 0,
      fundsCount: 0,
    };
  }

  return {
    totalCommitment: row.commitment,
    netInvestedCapital: row.netInvestedCapital,
    netDistributed: row.netDistributed,
    reservedUncalled: row.reservedUncalled,
    releasedCapital: row.releasedCapital ?? 0,
    fundsCount: row.fundsCount,
  };
}
