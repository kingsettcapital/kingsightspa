import {
  FundAmountTabRow,
  FundAssetTabRow,
  FundCommitmentTabRow,
  FundDetailDto,
  FundDistributionGroupTabRow,
  FundInvestorCapitalActivityTabRow,
  FundInvestorCapitalObligationTabRow,
  FundInvestorNetAssetTabRow,
  FundInvestorDistributionTableTabRow,
  FundInvestorIrrTabRow,
} from '../../../shared/models/api.models';
import { FundTableRow } from '../../../shared/utils/fund-list-row.util';
import {
  InvestorDetailBlock,
  InvestorDetailDebtFinancingBlock,
  InvestorDetailDocumentListBlock,
  InvestorDetailEntityOverviewBlock,
  InvestorDetailEsgMetricsBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailKpiRowBlock,
  InvestorDetailSectionBlock,
  InvestorDetailTableBlock,
} from '../../../investors/investor-detail/models/investor-detail-block.models';
import {
  INVESTOR_DETAIL_CELL_TONES_KEY,
  InvestorDetailColumnTone,
  InvestorDetailTableColumn,
  InvestorDetailTableRow,
} from '../../../investors/investor-detail/models/investor-detail-table.models';
import { createDetailTableBlock } from '../../../shared/utils/investor-detail-table-block.util';
import { withOptionalPeriodColumn } from '../../../shared/utils/transaction-table-period.util';
import { INVESTMENT_DETAIL_SIDEBAR_SECTIONS } from '../models/investment-detail-sidebar.config';
import {
  FUND_OVERVIEW_EMPTY,
  readFundDetailKey,
  readFundDetailNumber,
  readFundDetailString,
} from './investment-detail-api.util';

const FUND_OVERVIEW_DASH = '—';
import {
  INVESTMENT_DETAIL_DUMMY,
  investedPercentForTimeframe,
  netDistributedForTimeframe,
} from '../data/investment-detail-dummy.data';

export function readFundDetailSummaryString(detail: FundDetailDto | null, ...keys: string[]): string {
  if (!detail) {
    return '';
  }
  const top = detail as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = top[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  if (!detail.summary) {
    return '';
  }
  const record = detail.summary as unknown as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function pickOverviewLabel(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && trimmed !== '—' && trimmed !== FUND_OVERVIEW_EMPTY) {
      return trimmed;
    }
  }
  return FUND_OVERVIEW_EMPTY;
}

export type InvestmentDetailTimeframe = 'ltd' | 'quarterly' | 'daily';
export type InvestmentDetailSectionId =
  | 'overview'
  | 'capital-account'
  | 'performance'
  | 'assets'
  | 'fund-transactions'
  | 'documents'
  | 'esg-reporting'
  | 'debt-financing';

export interface InvestmentDetailKpiCards {
  totalCommitment: number;
  netInvestedCapital: number;
  netDistributed: number;
  reservedUncalled: number | null;
  releasedCapital: number;
  investedPercent: number;
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  capitalDeployed?: number | null;
}

export interface InvestmentDetailFlatBlock {
  sectionId: string;
  block: InvestorDetailBlock;
  isSectionStart: boolean;
}

function sumColumn(rows: InvestorDetailTableRow[], key: string): number {
  return rows.reduce((total, row) => {
    const value = row[key];
    return total + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
}

function averageColumn(rows: InvestorDetailTableRow[], key: string): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) {
    return null;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function buildTotalsRow(
  columns: InvestorDetailTableColumn[],
  rows: InvestorDetailTableRow[],
  labelKey = 'fundCode',
  label = 'TOTALS',
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
    if (column.type === 'percent') {
      const average = averageColumn(rows, column.key);
      totals[column.key] = average ?? '—';
      continue;
    }
    totals[column.key] = '—';
  }

  return totals;
}

export function buildTableTotalsRow(
  columns: InvestorDetailTableColumn[],
  rows: InvestorDetailTableRow[],
  labelKey = 'investorName',
  label?: string,
): InvestorDetailTableRow | null {
  if (!rows.length) {
    return null;
  }
  return buildTotalsRow(columns, rows, labelKey, label ?? `Total — ${rows.length}`);
}

function formatCurrencyCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return FUND_OVERVIEW_EMPTY;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatOverviewCurrency(value: number | null | undefined, dashWhenZero = false): string {
  if (value == null || !Number.isFinite(value)) {
    return FUND_OVERVIEW_EMPTY;
  }
  if (dashWhenZero && value === 0) {
    return FUND_OVERVIEW_EMPTY;
  }
  return formatCurrencyCompact(value);
}

function formatOverviewPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return FUND_OVERVIEW_EMPTY;
  }
  return `${value.toFixed(1)}%`;
}

function formatMultiple(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return FUND_OVERVIEW_EMPTY;
  }
  if (value === 0) {
    return FUND_OVERVIEW_EMPTY;
  }
  return `${value.toFixed(2)}x`;
}

function formatPercentValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return FUND_OVERVIEW_EMPTY;
  }
  return `${value.toFixed(1)}%`;
}

function formatOverviewCurrencyDisplay(value: number | null | undefined, dashWhenZero = false): string {
  if (value == null || !Number.isFinite(value)) {
    return FUND_OVERVIEW_DASH;
  }
  if (dashWhenZero && value === 0) {
    return FUND_OVERVIEW_DASH;
  }
  return formatCurrencyCompact(value);
}

function formatOverviewPercentDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return FUND_OVERVIEW_DASH;
  }
  return `${value.toFixed(1)}%`;
}

function formatPerformanceMultipleDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return FUND_OVERVIEW_EMPTY;
  }
  return `${value.toFixed(2)}X`;
}

function formatApiMultiple(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return FUND_OVERVIEW_EMPTY;
  }
  return `${value.toFixed(2)}x`;
}

function formatReservedUncalledDisplay(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return FUND_OVERVIEW_DASH;
  }
  if (value === 0) {
    return FUND_OVERVIEW_DASH;
  }
  return formatCurrencyCompact(value);
}

function deploymentBarRightLabel(
  deployedPct: number,
  reservedUncalled: number | null | undefined,
  totalCommitment: number,
  netInvestedCapital: number,
): string {
  if (reservedUncalled != null && Number.isFinite(reservedUncalled) && reservedUncalled !== 0) {
    const amount = formatCurrencyCompact(reservedUncalled);
    return reservedUncalled > 0 ? `${amount} remaining` : `${amount} reserved`;
  }

  if (deployedPct >= 100) {
    return 'Fully deployed';
  }

  const fallbackRemaining = Math.max(0, totalCommitment - netInvestedCapital);
  if (fallbackRemaining > 0) {
    return `${formatCurrencyCompact(fallbackRemaining)} remaining`;
  }

  return 'Fully deployed';
}

function overviewDisplayTone(value: string): 'default' | 'muted' | undefined {
  return value === FUND_OVERVIEW_DASH ? 'muted' : 'default';
}

function pickOverviewDisplayLabel(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && trimmed !== '—' && trimmed !== FUND_OVERVIEW_EMPTY && trimmed !== FUND_OVERVIEW_DASH) {
      return trimmed;
    }
  }
  return FUND_OVERVIEW_DASH;
}

function overviewFieldTone(value: string): 'default' | 'muted' | undefined {
  return value === FUND_OVERVIEW_EMPTY ? 'muted' : 'default';
}

function tableBlock(config: Omit<InvestorDetailTableBlock, 'kind'>): InvestorDetailTableBlock {
  return createDetailTableBlock(config);
}

function occupancyTone(value: number | null | undefined): InvestorDetailColumnTone {
  if (value == null || !Number.isFinite(value)) {
    return 'muted';
  }
  return value >= 90 ? 'positive' : 'warning';
}

export function kpiCardsFromListRow(
  row: FundTableRow | null,
  timeframe: InvestmentDetailTimeframe,
): InvestmentDetailKpiCards {
  const dummy = INVESTMENT_DETAIL_DUMMY;
  const commitment = row?.commitment ?? dummy.totalCommitment;
  const netInvested =
    timeframe === 'ltd'
      ? row?.netInvestedCapital ?? dummy.netInvestedCapitalLtd
      : row?.netInvestedCapital ?? dummy.netInvestedCapitalAdjusted;
  const distributed =
    timeframe === 'ltd'
      ? row?.netDistributed ?? dummy.netDistributed.ltd
      : netDistributedForTimeframe(timeframe);
  const reserved = row?.reservedUncalled ?? dummy.reservedUncalled;
  const investedPct =
    commitment > 0
      ? (netInvested / commitment) * 100
      : investedPercentForTimeframe(timeframe);

  return {
    totalCommitment: commitment,
    netInvestedCapital: netInvested,
    netDistributed: distributed,
    reservedUncalled: reserved,
    releasedCapital: row?.releasedCapital ?? 0,
    investedPercent: investedPct,
    tvpi: null,
    dpi: null,
    rvpi: null,
    capitalDeployed: null,
  };
}

export function kpiCardsFromFundDetail(detail: FundDetailDto | null): InvestmentDetailKpiCards {
  const totalCommitment =
    readFundDetailNumber(detail, 'total_commitment', 'totalCommitment') ?? 0;
  const netInvestedCapital =
    readFundDetailNumber(detail, 'net_invested_capital', 'netInvestedCapital') ?? 0;
  const netDistributed =
    readFundDetailNumber(detail, 'net_distributed', 'netDistributed') ?? 0;
  const reservedUncalled =
    readFundDetailNumber(detail, 'reserved_uncalled', 'reservedUncalled');
  const releasedCapital =
    readFundDetailNumber(detail, 'released_capital', 'releasedCapital') ?? 0;
  const capitalDeployed =
    readFundDetailNumber(detail, 'capital_deployed', 'capitalDeployed');

  let investedPct = 0;
  if (totalCommitment > 0 && netInvestedCapital > 0) {
    investedPct = Math.min(100, Math.max(0, (netInvestedCapital / totalCommitment) * 100));
  } else if (totalCommitment > 0 && capitalDeployed != null && capitalDeployed > 0) {
    investedPct = Math.min(100, Math.max(0, (capitalDeployed / totalCommitment) * 100));
  }

  const tvpi = readFundDetailNumber(detail, 'tvpi', 'TVPI');
  const dpi = readFundDetailNumber(detail, 'dpi', 'DPI');
  const rvpi = readFundDetailNumber(detail, 'rvpi', 'RVPI');

  return {
    totalCommitment,
    netInvestedCapital,
    netDistributed,
    reservedUncalled,
    releasedCapital,
    investedPercent: investedPct,
    tvpi,
    dpi,
    rvpi,
    capitalDeployed,
  };
}

export interface FundOverviewInput {
  fundName: string;
  fundType: string;
  strategy: string;
  fundId: number | string;
  startDate?: string;
  status?: string;
}

function formatOverviewDate(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return FUND_OVERVIEW_DASH;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed.slice(0, 10);
  }
  return parsed.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function readOverviewStartDate(detail: FundDetailDto | null, overviewStartDate?: string): string {
  const raw =
    overviewStartDate?.trim() ||
    readFundDetailString(detail, 'start_date', 'startDate');
  return formatOverviewDate(raw || null);
}

function readOverviewStatus(detail: FundDetailDto | null, overviewStatus?: string): string {
  return pickOverviewDisplayLabel(
    overviewStatus,
    readFundDetailString(detail, 'status'),
    detail?.summary?.status,
  );
}

function buildFundOverviewBlock(
  detail: FundDetailDto | null,
  overview: FundOverviewInput,
  kpi: InvestmentDetailKpiCards,
): InvestorDetailEntityOverviewBlock {
  const fundName = pickOverviewDisplayLabel(
    overview.fundName,
    readFundDetailString(detail, 'fund_name', 'fundName'),
    detail?.summary?.fundName,
  );
  const fundId =
    readFundDetailKey(detail) ??
    (typeof overview.fundId === 'number' ? overview.fundId : null);
  const fundType = pickOverviewDisplayLabel(
    overview.fundType,
    readFundDetailString(detail, 'fund_type', 'fundType', 'FundType'),
    detail?.summary?.fundType,
  );
  const strategy = pickOverviewDisplayLabel(
    overview.strategy,
    readFundDetailString(detail, 'strategy', 'fund_strategy_name', 'fundStrategyName'),
  );
  const startDate = readOverviewStartDate(detail, overview.startDate);
  const status = readOverviewStatus(detail, overview.status);

  const tvpi = kpi.tvpi;
  const dpi = kpi.dpi;
  const rvpi = kpi.rvpi;

  const deployedPct =
    kpi.investedPercent > 0
      ? Math.min(100, Math.max(0, kpi.investedPercent))
      : kpi.totalCommitment > 0 && kpi.netInvestedCapital > 0
        ? Math.min(100, (kpi.netInvestedCapital / kpi.totalCommitment) * 100)
        : 0;

  const reservedLabel = formatReservedUncalledDisplay(kpi.reservedUncalled);
  const releasedLabel = formatOverviewCurrencyDisplay(kpi.releasedCapital, true);

  return {
    kind: 'entity-overview',
    id: 'fund-overview',
    title: 'Fund Overview',
    variant: 'fund',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        title: '',
        fields: [
          // { label: 'Fund Name', value: fundName },
          // {
          //   label: 'Fund ID',
          //   value: fundId != null ? String(fundId) : FUND_OVERVIEW_DASH,
          // },
          { label: 'Fund Type', value: fundType },
          { label: 'Strategy', value: strategy },
          { label: 'Start Date', value: startDate },
          { label: 'Status', value: status },
        ],
      },
      {
        title: 'Capital Structure',
        fields: [
          {
            label: 'Total Commitment',
            value: formatOverviewCurrencyDisplay(kpi.totalCommitment),
          },
          {
            label: 'Net Invested Capital',
            value: formatOverviewCurrencyDisplay(kpi.netInvestedCapital),
          },
          {
            label: 'Reserved / Uncalled',
            value: reservedLabel,
            tone: overviewDisplayTone(reservedLabel),
          },
          {
            label: 'Net Distributed',
            value: formatOverviewCurrencyDisplay(kpi.netDistributed),
          },
          {
            label: 'Released Capital',
            value: releasedLabel,
            tone: overviewDisplayTone(releasedLabel),
          },
        ],
      },
    ],
    performanceMiniKpis: [
      { label: 'TVPI', value: formatPerformanceMultipleDisplay(tvpi) },
      { label: 'DPI', value: formatPerformanceMultipleDisplay(dpi) },
      { label: 'Invested', value: formatOverviewPercentDisplay(deployedPct) },
      { label: 'Reserved', value: reservedLabel },
    ],
    deploymentBar: {
      label: 'Deployment',
      percent: deployedPct,
      leftLabel:
        kpi.netInvestedCapital > 0
          ? `${formatCurrencyCompact(kpi.netInvestedCapital)} invested`
          : `${FUND_OVERVIEW_DASH} invested`,
      rightLabel: deploymentBarRightLabel(
        deployedPct,
        kpi.reservedUncalled,
        kpi.totalCommitment,
        kpi.netInvestedCapital,
      ),
    },
    deploymentBarPlacement: 'performance-column',
  };
}

function buildCapitalAccountGrid(kpi: InvestmentDetailKpiCards): InvestorDetailFieldGridBlock {
  const totalValue = kpi.netInvestedCapital + kpi.netDistributed;
  const tvpi = formatApiMultiple(kpi.tvpi);
  const releasedCapital = formatOverviewCurrency(kpi.releasedCapital, true);
  const reserved =
    kpi.reservedUncalled == null || !Number.isFinite(kpi.reservedUncalled)
      ? FUND_OVERVIEW_EMPTY
      : kpi.reservedUncalled === 0
        ? FUND_OVERVIEW_EMPTY
        : formatCurrencyCompact(kpi.reservedUncalled);
  const investedPct = formatOverviewPercent(kpi.investedPercent);

  return {
    kind: 'field-grid',
    id: 'capital-account',
    title: 'Capital Account',
    layout: 'paired-rows',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        fields: [
          {
            label: 'Total Commitment (LTD)',
            value: formatOverviewCurrency(kpi.totalCommitment),
          },
          {
            label: 'Net Invested Capital',
            value: formatOverviewCurrency(kpi.netInvestedCapital),
          },
          { label: 'Reserved / Uncalled', value: reserved, tone: overviewFieldTone(reserved) },
          { label: '% Invested', value: investedPct, tone: overviewFieldTone(investedPct) },
        ],
      },
      {
        fields: [
          {
            label: 'Net Distributed (LTD)',
            value: formatOverviewCurrency(kpi.netDistributed),
          },
          {
            label: 'Released Capital',
            value: releasedCapital,
            tone: overviewFieldTone(releasedCapital),
          },
          {
            label: 'Total Value (Invested+Dist.)',
            value: formatOverviewCurrency(totalValue),
          },
          { label: 'TVPI', value: tvpi, tone: overviewFieldTone(tvpi) },
        ],
      },
    ],
  };
}

function buildPerformanceKpiRow(kpi: InvestmentDetailKpiCards): InvestorDetailKpiRowBlock {
  return {
    kind: 'kpi-row',
    id: 'performance-metrics',
    title: 'Performance Metrics',
    collapsible: true,
    defaultExpanded: true,
    display: 'performance',
    cards: [
      {
        label: 'TVPI',
        value: formatApiMultiple(kpi.tvpi),
        hint: 'Total value / paid-in',
      },
      {
        label: 'DPI',
        value: formatApiMultiple(kpi.dpi),
        hint: 'Distributions / paid-in',
      },
      {
        label: 'RVPI',
        value: formatApiMultiple(kpi.rvpi),
        hint: 'Net invested / paid-in',
      },
      {
        label: 'Deploy Rate',
        value: formatOverviewPercent(kpi.investedPercent),
        hint: 'of total commitment',
      },
    ],
  };
}

function mapAssetsTable(
  assets: FundAssetTabRow[],
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  },
): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'propertyName', label: 'Property Name', type: 'text', align: 'left' },
    { key: 'city', label: 'City', type: 'text', align: 'left', tone: 'muted' },
    { key: 'province', label: 'Province', type: 'text', align: 'left', tone: 'muted' },
    { key: 'geography', label: 'Geography', type: 'text', align: 'left', tone: 'muted' },
    { key: 'assetType', label: 'Asset Type', type: 'text', align: 'left', tone: 'muted' },
    { key: 'assetSubType', label: 'Asset Sub Type', type: 'text', align: 'left', tone: 'muted' },
    { key: 'investmentType', label: 'Investment Type', type: 'text', align: 'left', tone: 'muted' },
    { key: 'propertyStatus', label: 'Property Status', type: 'status', align: 'left' },
    { key: 'propertyDisposition', label: 'Disposition', type: 'text', align: 'right', tone: 'muted' },
    { key: 'propertyAcquisition', label: 'Acquisition', type: 'text', align: 'right', tone: 'muted' },
    { key: 'glaSf', label: 'GLA (SF)', type: 'number', align: 'right', tone: 'muted' },
    { key: 'occupancyPct', label: 'Occupancy %', type: 'percent', align: 'right', tone: 'muted' },
    { key: 'marketValue', label: 'Market Value', type: 'amount', align: 'right' },
    { key: 'capRate', label: 'Cap Rate', type: 'percent', align: 'right', tone: 'muted' },
    { key: 'status', label: 'Status', type: 'status', align: 'left' },
  ];

  const rows: InvestorDetailTableRow[] = assets.map((asset) => ({
    propertyName: asset.assetName,
    city: asset.city,
    province: asset.province,
    geography: asset.geography,
    assetType: asset.assetType,
    assetSubType: asset.assetSubType,
    investmentType: asset.investmentType,
    propertyStatus: asset.propertyStatus,
    propertyDisposition: asset.propertyDisposition,
    propertyAcquisition: asset.propertyAcquisition,
    glaSf: asset.glaSf,
    occupancyPct: asset.occupancyPct,
    marketValue: asset.marketValue,
    capRate: asset.capRate,
    status: asset.status,
  }));

  const totalCount = pagination.totalCount;

  return {
    kind: 'table',
    id: 'underlying-assets',
    title: 'Asset Holdings',
    subtitle: totalCount > 0 ? `${totalCount} asset${totalCount === 1 ? '' : 's'}` : undefined,
    columns,
    rows,
    totals: null,
    collapsible: true,
    defaultExpanded: true,
    showToolbar: false,
    variant: 'underlying-investments',
    pagination,
  };
}

function fundToolbarTableBlock(
  config: Omit<InvestorDetailTableBlock, 'kind' | 'variant' | 'showToolbar' | 'collapsible' | 'defaultExpanded'>,
): InvestorDetailTableBlock {
  return tableBlock({
    ...config,
    variant: 'transactions',
    showToolbar: true,
  });
}

const TRANSACTION_INVESTOR_COLUMN: InvestorDetailTableColumn = {
  key: 'investorName',
  label: 'Investor Name',
  type: 'transaction-investor',
  align: 'left',
  sortBy: 'investor_name',
};

function fundTransactionInvestorColumns(
  columns: InvestorDetailTableColumn[],
  rows: InvestorDetailTableRow[],
): InvestorDetailTableColumn[] {
  return withOptionalPeriodColumn([TRANSACTION_INVESTOR_COLUMN, ...columns], rows, 'investorName');
}

function capitalActivityRowsToTableRows(rows: FundInvestorCapitalActivityTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    type: row.type,
    period: row.period,
    called: row.called,
    transferIn: row.transferIn,
    transferOut: row.transferOut,
    redemption: row.redemption,
  }));
}

function distributionTableRowsToTableRows(rows: FundInvestorDistributionTableTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    type: row.type,
    period: row.period,
    prefReturn: row.preferredReturn,
    committed: row.committed,
    unfunded: row.unfunded,
    cashDist: row.cashDist,
    gainDist: row.gainDist,
    returnOfCapital: row.returnOfCapital,
    released: row.released,
  }));
}

function irrRowsToTableRows(rows: FundInvestorIrrTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    type: row.type,
    period: row.period,
    irr1Year: row.irr1Year,
    irr3Year: row.irr3Year,
    irr5Year: row.irr5Year,
    irr7Year: row.irr7Year,
    irr10Year: row.irr10Year,
    irrLtd: row.irrLtd,
  }));
}

function capitalObligationRowsToTableRows(
  rows: FundInvestorCapitalObligationTabRow[],
): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    period: row.period,
    commitment: row.commitment,
    unfundedAmount: row.unfundedAmount,
    reserved: row.reserved,
    releasedCapital: row.releasedCapital,
  }));
}

function netAssetRowsToTableRows(rows: FundInvestorNetAssetTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    investorCode: row.investorCode,
    investorName: row.investorName,
    period: row.period,
    nav: row.nav,
  }));
}

export function buildCapitalActivitiesTable(
  rows: FundInvestorCapitalActivityTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = capitalActivityRowsToTableRows(rows);
  const columns = fundTransactionInvestorColumns(
    [
    { key: 'called', label: 'Called', type: 'amount', align: 'right', sortBy: 'called' },
    { key: 'transferIn', label: 'Transfer In', type: 'amount', align: 'right', sortBy: 'transfer_in' },
    { key: 'transferOut', label: 'Transfer Out', type: 'amount', align: 'right', tone: 'negative', sortBy: 'transfer_out' },
    { key: 'redemption', label: 'Redemption', type: 'amount', align: 'right', sortBy: 'redemption' },
    ],
    tableRows,
  );

  return fundToolbarTableBlock({
    id: 'capital-activities',
    title: 'Capital Activities',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'investorName', `Total — ${tableRows.length}`) : null,
  });
}

export function buildDistributionsTable(
  rows: FundInvestorDistributionTableTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = distributionTableRowsToTableRows(rows);
  const columns = fundTransactionInvestorColumns(
    [
    { key: 'prefReturn', label: `Pref. Return (${periodLabel})`, type: 'amount', align: 'right', tone: 'info', sortBy: 'preferred_return' },
    { key: 'committed', label: 'Committed', type: 'amount', align: 'right', sortBy: 'committed' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', tone: 'warning', sortBy: 'unfunded' },
    { key: 'cashDist', label: `Cash Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive', sortBy: 'cash_dist' },
    { key: 'gainDist', label: `Gain Dist. (${periodLabel})`, type: 'amount', align: 'right', tone: 'positive', sortBy: 'gain_dist' },
    { key: 'returnOfCapital', label: 'Return of Capital', type: 'amount', align: 'right', sortBy: 'return_of_capital' },
    { key: 'released', label: 'Released', type: 'amount', align: 'right', sortBy: 'released' },
    ],
    tableRows,
  );

  return fundToolbarTableBlock({
    id: 'distributions',
    title: 'Distributions',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'investorName', `Total — ${tableRows.length}`) : null,
  });
}

export function buildIrrsTable(rows: FundInvestorIrrTabRow[], periodLabel: string): InvestorDetailTableBlock {
  const tableRows = irrRowsToTableRows(rows);
  const columns = fundTransactionInvestorColumns(
    [
    { key: 'irr1Year', label: '1Y IRR', type: 'percent', align: 'right', sortBy: 'irr_1_year_pct' },
    { key: 'irr3Year', label: '3Y IRR', type: 'percent', align: 'right', sortBy: 'irr_3_year_pct' },
    { key: 'irr5Year', label: '5Y IRR', type: 'percent', align: 'right', sortBy: 'irr_5_year_pct' },
    { key: 'irr7Year', label: '7Y IRR', type: 'percent', align: 'right', sortBy: 'irr_7_year_pct' },
    { key: 'irr10Year', label: '10Y IRR', type: 'percent', align: 'right', sortBy: 'irr_10_year_pct' },
    { key: 'irrLtd', label: 'ITD IRR', type: 'percent', align: 'right', tone: 'info', sortBy: 'irr_ltd_pct' },
    ],
    tableRows,
  );

  return fundToolbarTableBlock({
    id: 'irrs',
    title: 'Performance',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'investorName', `Total — ${tableRows.length}`) : null,
  });
}

const CAPITAL_OBLIGATION_AMOUNT_COLUMNS: InvestorDetailTableColumn[] = [
  { key: 'commitment', label: 'Commitment', type: 'amount', align: 'right', sortBy: 'commitment_amount' },
  {
    key: 'unfundedAmount',
    label: 'Unfunded Amount',
    type: 'amount',
    align: 'right',
    tone: 'warning',
    sortBy: 'unfunded_amount',
  },
  { key: 'reserved', label: 'Reserved', type: 'amount', align: 'right', sortBy: 'reserved_amount' },
  {
    key: 'releasedCapital',
    label: 'Released Capital',
    type: 'amount',
    align: 'right',
    sortBy: 'released_capital_amount',
  },
];

export function buildCapitalObligationsTable(
  rows: FundInvestorCapitalObligationTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = capitalObligationRowsToTableRows(rows);
  const columns = fundTransactionInvestorColumns(CAPITAL_OBLIGATION_AMOUNT_COLUMNS, tableRows);

  return fundToolbarTableBlock({
    id: 'capital-obligations',
    title: 'Capital Obligations',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'investorName', `Total — ${tableRows.length}`) : null,
  });
}

export function buildNetAssetsTable(
  rows: FundInvestorNetAssetTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = netAssetRowsToTableRows(rows);
  const columns = fundTransactionInvestorColumns(
    [{ key: 'nav', label: 'NAV', type: 'amount', align: 'right', sortBy: 'nav' }],
    tableRows,
  );

  return fundToolbarTableBlock({
    id: 'net-assets',
    title: 'Net Asset Value',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'investorName', `Total — ${tableRows.length}`) : null,
  });
}

function buildDocumentsList(detail: FundDetailDto | null): InvestorDetailDocumentListBlock {
  const count = detail?.summary?.assets ?? detail?.asset_count ?? detail?.assetCount ?? 0;
  const documents =
    count > 0
      ? INVESTMENT_DETAIL_DUMMY.documents
      : INVESTMENT_DETAIL_DUMMY.documents;

  return {
    kind: 'document-list',
    id: 'documents',
    title: 'Documents',
    subtitle: 'Financial statements, reports, and fund agreements',
    collapsible: true,
    defaultExpanded: true,
    documents: [...documents],
  };
}

function buildEsgMetricsBlock(): InvestorDetailEsgMetricsBlock {
  return {
    kind: 'esg-metrics',
    id: 'esg-reporting',
    title: 'ESG & Sustainability Reporting',
    collapsible: true,
    defaultExpanded: true,
    cards: INVESTMENT_DETAIL_DUMMY.esg.map((card) => ({ ...card })),
  };
}

function buildDebtFinancingBlock(): InvestorDetailDebtFinancingBlock {
  const debt = INVESTMENT_DETAIL_DUMMY.debt;
  return {
    kind: 'debt-financing',
    id: 'debt-financing',
    title: 'Debt & Financing',
    collapsible: true,
    defaultExpanded: true,
    metrics: [
      { label: 'Total Debt Outstanding', value: formatCurrencyCompact(debt.totalDebtOutstanding) },
      { label: 'LTV Ratio', value: formatPercentValue(debt.ltvRatio) },
      { label: 'DSCR (avg)', value: formatMultiple(debt.dscr) },
      { label: 'Weighted Avg Rate', value: formatPercentValue(debt.weightedAvgRate) },
      { label: 'Fixed Rate %', value: formatPercentValue(debt.fixedRatePercent) },
    ],
    maturitySchedule: [...debt.maturitySchedule],
  };
}

export function buildBlocksForSection(
  sectionId: InvestmentDetailSectionId,
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  assetsPagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  },
  capitalActivities: FundInvestorCapitalActivityTabRow[],
  distributionTable: FundInvestorDistributionTableTabRow[],
  irr: FundInvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
  overview?: FundOverviewInput,
): InvestorDetailBlock[] {
  switch (sectionId) {
    case 'overview':
      return [
        buildFundOverviewBlock(
          detail,
          overview ?? {
            fundName: pickOverviewLabel(detail?.summary?.fundName),
            fundType: pickOverviewLabel(
              readFundDetailSummaryString(detail, 'fund_type', 'fundType', 'FundType'),
              detail?.summary?.fundType,
            ),
            strategy: pickOverviewLabel(
              readFundDetailSummaryString(
                detail,
                'strategy',
                'fund_strategy_name',
                'fundStrategyName',
                'fund_strategy',
              ),
            ),
            fundId: readFundDetailKey(detail) ?? detail?.summary?.fundId ?? FUND_OVERVIEW_EMPTY,
          },
          detail ? kpiCardsFromFundDetail(detail) : kpi,
        ),
      ];
    case 'capital-account':
      return [buildCapitalAccountGrid(kpi)];
    case 'performance':
      return [buildPerformanceKpiRow(kpi)];
    case 'assets':
      return [mapAssetsTable(assets, assetsPagination)];
    case 'fund-transactions':
      return [
        {
          kind: 'transaction-hub',
          id: 'fund-transactions',
          title: 'Fund Transactions',
          collapsible: true,
          defaultExpanded: true,
          activeCategoryId: 'capital-activities',
          categories: [],
          columns: [],
          rows: [],
          totals: null,
          loading: false,
          periodSummary: periodLabel,
          recordCount: 0,
          pagination: {
            page: 1,
            pageSize: 25,
            totalPages: 0,
            totalCount: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          },
          fundCodeOptions: [],
        },
      ];
    case 'documents':
      return [buildDocumentsList(detail)];
    case 'esg-reporting':
      return [buildEsgMetricsBlock()];
    case 'debt-financing':
      return [buildDebtFinancingBlock()];
    default:
      return [];
  }
}

export function buildFlatInvestmentBlocks(
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  assetsPagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  },
  capitalActivities: FundInvestorCapitalActivityTabRow[],
  distributionTable: FundInvestorDistributionTableTabRow[],
  irr: FundInvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
  overview?: FundOverviewInput,
): InvestmentDetailFlatBlock[] {
  const sections = buildAllSectionBlocks(
    detail,
    assets,
    assetsPagination,
    capitalActivities,
    distributionTable,
    irr,
    kpi,
    timeframe,
    periodLabel,
    overview,
  );

  const flat: InvestmentDetailFlatBlock[] = [];
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
  detail: FundDetailDto | null,
  assets: FundAssetTabRow[],
  assetsPagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  },
  capitalActivities: FundInvestorCapitalActivityTabRow[],
  distributionTable: FundInvestorDistributionTableTabRow[],
  irr: FundInvestorIrrTabRow[],
  kpi: InvestmentDetailKpiCards,
  timeframe: InvestmentDetailTimeframe,
  periodLabel: string,
  overview?: FundOverviewInput,
): InvestorDetailSectionBlock[] {
  return INVESTMENT_DETAIL_SIDEBAR_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: item.id,
      blocks: buildBlocksForSection(
        item.id as InvestmentDetailSectionId,
        detail,
        assets,
        assetsPagination,
        capitalActivities,
        distributionTable,
        irr,
        kpi,
        timeframe,
        periodLabel,
        overview,
      ),
    })),
  );
}
