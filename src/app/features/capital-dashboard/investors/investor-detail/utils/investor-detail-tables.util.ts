import {
  DynamicFieldDto,
  FundAmountTabRow,
  FundCommitmentTabRow,
  FundDistributionGroupTabRow,
  FundNavTabRow,
  InvestorCapitalActivityTabRow,
  InvestorCapitalObligationTabRow,
  InvestorNetAssetTabRow,
  InvestorDetailDto,
  InvestorDistributionTableTabRow,
  InvestorFundHoldingTabRow,
  InvestorInvestmentDto,
  InvestorIrrTabRow,
  InvestorUnderlyingInvestmentTabRow,
} from '../../../shared/models/api.models';
import { formatByFormatType, toFieldLabel } from '../../../shared/utils/dynamic-sections.util';
import { InvestorTableRow } from '../../../shared/utils/investor-list-row.util';
import { createDetailTableBlock } from '../../../shared/utils/investor-detail-table-block.util';
import { withOptionalPeriodColumn } from '../../../shared/utils/transaction-table-period.util';
import { INVESTOR_DETAIL_SIDEBAR_SECTIONS } from '../models/investor-detail-sidebar.config';
import {
  InvestorDetailBlock,
  InvestorDetailDocumentListBlock,
  InvestorDetailEntityOverviewBlock,
  InvestorDetailFieldGridBlock,
  InvestorDetailFundMembership,
  InvestorDetailKpiRowBlock,
  InvestorDetailSectionBlock,
  InvestorDetailTableBlock,
} from '../models/investor-detail-block.models';
import {
  fundMembershipFromInvestorDetail,
  InvestorDetailKpiCards,
  kpiCardsFromInvestorDetail,
  readInvestorDetailNumber,
  readInvestorDetailString,
} from './investor-detail-api.util';
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
  labelKey = 'fundCode',
  label?: string,
): InvestorDetailTableRow | null {
  if (!rows.length) {
    return null;
  }
  return buildTotalsRow(columns, rows, labelKey, label ?? `Total — ${rows.length}`);
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

export function readInvestmentFundName(investment: InvestorInvestmentDto): string {
  const record = investment as InvestorInvestmentDto & Record<string, unknown>;
  for (const key of ['fund_name', 'fundName', 'FundName', 'name', 'Name']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return investment.fundName?.trim() ?? '';
}

export function readInvestmentFundKey(investment: InvestorInvestmentDto): number {
  const record = investment as InvestorInvestmentDto & Record<string, unknown>;
  const fromRecord = record['fund_key'] ?? record['fundKey'] ?? record['FundKey'];
  if (typeof fromRecord === 'number' && Number.isFinite(fromRecord) && fromRecord > 0) {
    return fromRecord;
  }
  return investment.fundKey;
}

export function readInvestmentString(investment: InvestorInvestmentDto, ...keys: string[]): string {
  const record = investment as InvestorInvestmentDto & Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function readDetailSummaryString(detail: InvestorDetailDto | null, ...keys: string[]): string {
  return readInvestorDetailString(detail, ...keys);
}

function readContactInformationString(detail: InvestorDetailDto | null, ...keys: string[]): string {
  if (!detail?.contactInformation?.length) {
    return '';
  }

  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const field of detail.contactInformation) {
    const fieldKey = field.key?.trim().toLowerCase();
    if (!fieldKey || !normalizedKeys.has(fieldKey)) {
      continue;
    }
    const formatted = formatByFormatType(field.value, field.formatType);
    if (typeof formatted === 'string' && formatted.trim()) {
      return formatted.trim();
    }
  }

  return '';
}

function readInvestorProfileString(detail: InvestorDetailDto | null, ...keys: string[]): string {
  return readInvestorDetailString(detail, ...keys) || readContactInformationString(detail, ...keys);
}

export function formatInvestorAddress(detail: InvestorDetailDto | null, fallback = ''): string {
  const trimmedFallback = fallback.trim();
  if (trimmedFallback) {
    return trimmedFallback;
  }

  const line1 = readInvestorProfileString(detail, 'address_line1', 'addressLine1', 'AddressLine1');
  const line2 = readInvestorProfileString(detail, 'address_line2', 'addressLine2', 'AddressLine2');
  const city = readInvestorProfileString(detail, 'city', 'City');
  const provinceCode = readInvestorProfileString(
    detail,
    'province_code',
    'provinceCode',
    'ProvinceCode',
  );
  const province = readInvestorProfileString(detail, 'province', 'Province');
  const region = provinceCode || province;
  const parts: string[] = [];

  if (line1) {
    parts.push(line1);
  }
  if (line2) {
    parts.push(line2);
  }

  const cityLine = [city, region].filter(Boolean).join(', ');
  if (cityLine) {
    parts.push(cityLine);
  }

  return parts.join('\n');
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+/.test(value.trim());
}

function parseContactNameLine(value: string): { name: string; inlineEmail: string } {
  const parts = value
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const emailPart = parts.find(isEmailLike) ?? '';
    const namePart = parts.find((part) => !isEmailLike(part)) ?? parts[0];
    return { name: namePart, inlineEmail: emailPart };
  }

  if (isEmailLike(value)) {
    return { name: '', inlineEmail: value };
  }

  return { name: value, inlineEmail: '' };
}

function readInvestorContactEmail(detail: InvestorDetailDto | null): string {
  return readInvestorProfileString(
    detail,
    'contact_email',
    'contactEmail',
    'ContactEmail',
    'email',
    'Email',
  );
}

function resolveInvestorContactDisplay(
  detail: InvestorDetailDto | null,
  overview: InvestorOverviewInput,
): { name: string; email: string } {
  const emailFromProfile = readInvestorContactEmail(detail);

  const fromOverview = overview.contactName?.trim();
  if (fromOverview && fromOverview !== '—') {
    const parsed = parseContactNameLine(fromOverview);
    const email = emailFromProfile || parsed.inlineEmail;
    if (!parsed.name && email) {
      return { name: '—', email };
    }
    return { name: parsed.name || fromOverview, email };
  }

  const contact = readInvestorDetailString(detail, 'contact', 'Contact');
  if (contact) {
    const lines = contact
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length > 1) {
      const emailLine = lines.find(isEmailLike) ?? '';
      const nameLine = lines.find((line) => !isEmailLike(line)) ?? lines[0];
      return {
        name: nameLine,
        email: emailFromProfile || emailLine,
      };
    }

    const parsed = parseContactNameLine(contact);
    if (parsed.inlineEmail && !parsed.name) {
      return { name: '—', email: emailFromProfile || parsed.inlineEmail };
    }
    if (parsed.inlineEmail || parsed.name) {
      return {
        name: parsed.name || contact,
        email: emailFromProfile || parsed.inlineEmail,
      };
    }
  }

  const first = readInvestorProfileString(
    detail,
    'contact_first_name',
    'contactFirstName',
    'ContactFirstName',
  );
  const last = readInvestorProfileString(
    detail,
    'contact_last_name',
    'contactLastName',
    'ContactLastName',
  );
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return { name: joined || '—', email: emailFromProfile };
}

function resolveInvestmentFundName(
  investment: InvestorInvestmentDto,
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
): string {
  const direct = readInvestmentFundName(investment);
  if (direct) {
    return direct;
  }

  const fundKey = readInvestmentFundKey(investment);
  const fundCode = readInvestmentFundCode(investment);
  const lookupKeys = new Set(
    [fundCode, String(fundKey)].map((value) => value.trim()).filter(Boolean),
  );

  for (const row of [...distributionTable, ...capitalActivities]) {
    const rowCode = row.fundCode?.trim() ?? '';
    const rowName = row.fundName?.trim() ?? '';
    if (!rowName || rowName === '—') {
      continue;
    }
    if (lookupKeys.has(rowCode) || lookupKeys.has(normalizeFundName(rowName))) {
      return rowName;
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

  add(String(readInvestmentFundKey(investment)));
  add(resolveInvestmentFundName(investment, capitalActivities, distributionTable));
  add(readInvestmentFundCode(investment));

  const fundName = normalizeFundName(
    resolveInvestmentFundName(investment, capitalActivities, distributionTable),
  );
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
  const fundName = normalizeFundName(readInvestmentFundName(investment));
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

const OVERVIEW_EMPTY = '--';

function formatOverviewText(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && trimmed !== '—') {
      return trimmed;
    }
  }
  return OVERVIEW_EMPTY;
}

function formatOverviewCurrency(value: number | null | undefined, dashWhenZero = false): string {
  if (value == null || !Number.isFinite(value)) {
    return OVERVIEW_EMPTY;
  }
  if (dashWhenZero && value === 0) {
    return OVERVIEW_EMPTY;
  }
  return formatCurrencyCompact(value);
}

function formatCapitalDeployedPercent(kpi: InvestorDetailKpiCards): string {
  const raw = kpi.capitalDeployed;
  if (raw != null && Number.isFinite(raw)) {
    if (raw > 0 && raw <= 1) {
      return `${Math.round(raw * 100)}%`;
    }
    if (raw > 1 && raw <= 100) {
      return `${Math.round(raw)}%`;
    }
  }

  if (kpi.totalCommitment > 0) {
    const pct = Math.min(100, (kpi.netInvestedCapital / kpi.totalCommitment) * 100);
    if (Number.isFinite(pct)) {
      return `${Math.round(pct)}%`;
    }
  }

  return OVERVIEW_EMPTY;
}

function overviewFieldTone(value: string): 'default' | 'muted' | undefined {
  return value === OVERVIEW_EMPTY ? 'muted' : 'default';
}

const INVESTOR_OVERVIEW_FUNDS_PER_COLUMN = 5;
const INVESTOR_OVERVIEW_FUND_COLUMNS = 2;
const INVESTOR_OVERVIEW_VISIBLE_FUNDS =
  INVESTOR_OVERVIEW_FUNDS_PER_COLUMN * INVESTOR_OVERVIEW_FUND_COLUMNS;

interface FundExposureFund {
  fundCode: string;
  fundName: string;
}

function collectExposureFunds(
  capitalInvestments: FundCommitmentTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
): FundExposureFund[] {
  const map = new Map<string, FundExposureFund>();
  const add = (fundCode: string | undefined, fundName: string | undefined): void => {
    const code = fundCode?.trim();
    if (!code) {
      return;
    }
    const existing = map.get(code);
    const name = fundName?.trim() || existing?.fundName || code;
    map.set(code, { fundCode: code, fundName: name });
  };

  for (const row of distributionTable) {
    add(row.fundCode, row.fundName);
  }
  for (const row of capitalActivities) {
    add(row.fundCode, row.fundName);
  }
  for (const row of capitalInvestments) {
    add(row.fundCode, row.fundCode);
  }

  return [...map.values()].sort((a, b) => a.fundName.localeCompare(b.fundName));
}

function findDistributionRowByCode(
  fundCode: string,
  distributionTable: InvestorDistributionTableTabRow[],
): InvestorDistributionTableTabRow | undefined {
  const code = fundCode.trim();
  return distributionTable.find((row) => row.fundCode?.trim() === code);
}

function buildInvestorFundMembership(
  fundHoldings: InvestorFundHoldingTabRow[],
): InvestorDetailFundMembership {
  const funds = fundHoldings
    .filter((row) => row.fundKey > 0 && row.fundName.trim())
    .map((row) => ({ fundKey: row.fundKey, name: row.fundName.trim() }));
  return {
    count: funds.length,
    items: funds.slice(0, INVESTOR_OVERVIEW_VISIBLE_FUNDS),
    moreCount: Math.max(0, funds.length - INVESTOR_OVERVIEW_VISIBLE_FUNDS),
  };
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
  return createDetailTableBlock(config);
}

export function formatFundHoldingsDateKeyLabel(dateKey: number | null | undefined): string {
  if (dateKey == null || !Number.isFinite(dateKey)) {
    return OVERVIEW_EMPTY;
  }
  const str = String(Math.trunc(dateKey));
  if (str.length !== 8) {
    return str;
  }
  const year = Number(str.slice(0, 4));
  const month = Number(str.slice(4, 6));
  const day = Number(str.slice(6, 8));
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return str;
  }
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildFundHoldingsTable(
  rows: InvestorFundHoldingTabRow[],
  dateKey: number | null,
): InvestorDetailTableBlock {
  const columns: InvestorDetailTableColumn[] = [
    { key: 'fund', label: 'Fund', type: 'link', align: 'left', sortBy: 'fund' },
    { key: 'commitment', label: 'Commitment', type: 'amount', align: 'right', sortBy: 'commitment' },
    {
      key: 'netInvestedCapital',
      label: 'Net Invested Capital',
      type: 'amount',
      align: 'right',
      sortBy: 'netInvestedCapital',
    },
    {
      key: 'netDistributed',
      label: 'Net Distributed',
      type: 'amount',
      align: 'right',
      tone: 'positive',
      sortBy: 'netDistributed',
    },
    { key: 'reserved', label: 'Reserved', type: 'amount', align: 'right', sortBy: 'reserved' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', tone: 'warning', sortBy: 'unfunded' },
    {
      key: 'releasedCapital',
      label: 'Released Capital',
      type: 'amount',
      align: 'right',
      sortBy: 'releasedCapital',
    },
  ];

  const tableRows: InvestorDetailTableRow[] = rows.map((row) => ({
    fund: row.fundName || OVERVIEW_EMPTY,
    fundKey: row.fundKey,
    commitment: row.commitment,
    netInvestedCapital: row.netInvestedCapital,
    netDistributed: row.netDistributed,
    reserved: row.reservedUncalled,
    unfunded: row.unfunded,
    releasedCapital: row.releasedCapital,
  }));

  const asOfLabel = formatFundHoldingsDateKeyLabel(dateKey);

  return tableBlock({
    id: 'fund-exposure',
    title:
      asOfLabel !== OVERVIEW_EMPTY
        ? `Fund Holdings Summary as of ${asOfLabel}`
        : 'Fund Holdings Summary',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows) : null,
    variant: 'fund-holdings',
  });
}

/** @deprecated Use buildFundHoldingsTable with fund-holdings API data. */
export function buildFundExposureTable(
  capitalInvestments: FundCommitmentTabRow[],
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
): InvestorDetailTableBlock {
  const investedMap = investedByFundCode(capitalInvestments);
  const calledMap = calledByFundCode(capitalActivities);
  const funds = collectExposureFunds(capitalInvestments, capitalActivities, distributionTable);

  const columns: InvestorDetailTableColumn[] = [
    { key: 'fund', label: 'Fund', type: 'link', align: 'left', sortBy: 'fund' },
    { key: 'commitment', label: 'Commitment', type: 'amount', align: 'right', sortBy: 'commitment' },
    { key: 'netInvestedCapital', label: 'Net Invested Capital', type: 'amount', align: 'right', sortBy: 'netInvestedCapital' },
    { key: 'netDistributed', label: 'Net Distributed', type: 'amount', align: 'right', sortBy: 'netDistributed' },
    { key: 'reserved', label: 'Reserved', type: 'amount', align: 'right', sortBy: 'reserved' },
    { key: 'unfunded', label: 'Unfunded', type: 'amount', align: 'right', sortBy: 'unfunded' },
    { key: 'releasedCapital', label: 'Released Capital', type: 'amount', align: 'right', sortBy: 'releasedCapital' },
  ];

  const rows: InvestorDetailTableRow[] = funds.map((fund) => {
    const keys = [fund.fundCode, normalizeFundName(fund.fundName)];
    const distributionRow = findDistributionRowByCode(fund.fundCode, distributionTable);
    const hasDistribution = !!distributionRow;
    const hasInvestment = keys.some((key) => investedMap.has(key));

    const commitment = hasDistribution ? distributionRow!.committed : OVERVIEW_EMPTY;
    const unfundedAmount = hasDistribution ? distributionRow!.unfunded : OVERVIEW_EMPTY;
    const netInvestedCapital = hasInvestment ? lookupAmount(investedMap, ...keys) : OVERVIEW_EMPTY;
    const netDistributed = hasDistribution
      ? netDistributedAmount(distributionRow, 0)
      : OVERVIEW_EMPTY;
    const called = lookupAmount(calledMap, ...keys);
    const releasedCapital = hasDistribution ? distributionRow!.released : OVERVIEW_EMPTY;

    const reserved = hasDistribution ? distributionRow!.reserved : OVERVIEW_EMPTY;

    // let reserved: number | string = OVERVIEW_EMPTY;
    if (typeof commitment === 'number') {
      const netInvested = typeof netInvestedCapital === 'number' ? netInvestedCapital : 0;
      const unfunded = typeof unfundedAmount === 'number' ? unfundedAmount : 0;
      // reserved = called > 0 ? commitment - called : commitment - netInvested - unfunded;
    }

    return {
      fund: fund.fundName || OVERVIEW_EMPTY,
      fundKey: 0,
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
  });
}

function formatCurrencyCompactOrDash(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return formatCurrencyCompact(value);
}

function deploymentPercent(invested: number, commitment: number): number {
  if (commitment <= 0) {
    return 0;
  }
  return Math.min(100, (invested / commitment) * 100);
}

function deploymentRemainingLabel(remaining: number): string {
  if (remaining <= 0) {
    return 'fully deployed';
  }
  return `${formatCurrencyCompact(remaining)} remaining`;
}

export function pickDisplayLabel(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed || trimmed === '—' || trimmed === 'Investor') {
      continue;
    }
    return trimmed;
  }
  return '';
}

export interface InvestorOverviewInput {
  investorName: string;
  investorType: string;
  relationship: string;
  contactName: string;
  status: string;
  address?: string;
}

function buildInvestorOverviewBlock(
  detail: InvestorDetailDto | null,
  _fundHoldings: InvestorFundHoldingTabRow[],
  _capitalInvestments: InvestorUnderlyingInvestmentTabRow[],
  _capitalActivities: InvestorCapitalActivityTabRow[],
  _distributionTable: InvestorDistributionTableTabRow[],
  _kpi: InvestorDetailKpiCards,
  overview: InvestorOverviewInput,
): InvestorDetailEntityOverviewBlock {
  const investorType = formatOverviewText(
    overview.investorType,
    readInvestorDetailString(detail, 'investor_type', 'investor_type_name', 'investorType', 'InvestorType'),
    detail?.summary?.investorType,
  );
  const status =
    overview.status?.trim() ||
    readInvestorDetailString(detail, 'status', 'Status') ||
    detail?.summary?.status?.trim() ||
    OVERVIEW_EMPTY;

  const statusTone = status.toLowerCase() === 'active' ? 'default' : 'muted';
  const address = formatOverviewText(overview.address, formatInvestorAddress(detail));
  const relationship = formatOverviewText(
    overview.relationship,
    readInvestorDetailString(detail, 'relationship', 'relationship_name', 'relationshipName', 'Relationship'),
    detail?.summary?.relationshipName,
  );
  const contactDisplay = resolveInvestorContactDisplay(detail, overview);
  const contactNameRaw = formatOverviewText(contactDisplay.name);
  const contactName =
    contactNameRaw === OVERVIEW_EMPTY || contactNameRaw === '—' ? '' : contactNameRaw;
  const contactEmail = contactDisplay.email.trim();
  const contactAddress = address === OVERVIEW_EMPTY ? '' : address.trim();
  const contactLines = [contactName, contactEmail, contactAddress].filter(Boolean);
  const contactValue = contactLines.length ? contactLines.join('\n') : OVERVIEW_EMPTY;

  return {
    kind: 'entity-overview',
    id: 'investor-overview',
    title: 'Investor Overview',
    variant: 'investor',
    collapsible: true,
    defaultExpanded: true,
    columns: [
      {
        title: '',
        fields: [
          {
            label: 'Investor Type',
            value: investorType,
            tone: investorType === OVERVIEW_EMPTY ? 'muted' : 'default',
          },
          {
            label: 'Status',
            value: status,
            tone: statusTone,
          },
          {
            label: 'Relationship',
            value: relationship,
            tone: relationship === OVERVIEW_EMPTY ? 'muted' : 'default',
          },
          {
            label: 'Contact',
            value: contactValue,
            tone: contactValue === OVERVIEW_EMPTY ? 'muted' : 'default',
            multiline: contactLines.length > 1,
          },
        ],
      },
    ],
  };
}

function buildCapitalAccountGrid(kpi: InvestorDetailKpiCards): InvestorDetailFieldGridBlock {
  const totalValue = kpi.netInvestedCapital + kpi.netDistributed;
  const releasedCapital = formatOverviewCurrency(kpi.releasedCapital, true);
  const tvpi = OVERVIEW_EMPTY;
  const deployedPct = formatCapitalDeployedPercent(kpi);

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
          { label: 'Total Commitment (LTD)', value: formatCurrencyCompact(kpi.totalCommitment) },
          { label: 'Net Invested Capital (LTD)', value: formatCurrencyCompact(kpi.netInvestedCapital) },
          { label: 'Reserved / Uncalled', value: formatCurrencyCompact(kpi.reservedUncalled) },
          { label: '% Deployed', value: deployedPct, tone: overviewFieldTone(deployedPct) },
        ],
      },
      {
        fields: [
          { label: 'Net Distributed (LTD)', value: formatCurrencyCompact(kpi.netDistributed) },
          {
            label: 'Released Capital',
            value: releasedCapital,
            tone: overviewFieldTone(releasedCapital),
          },
          { label: 'Total Value (Invested+Dist.)', value: formatCurrencyCompact(totalValue) },
          {
            label: 'Investment Multiple (TVPI)',
            value: tvpi,
            tone: overviewFieldTone(tvpi),
          },
        ],
      },
    ],
  };
}

function buildPerformanceKpiRow(kpi: InvestorDetailKpiCards): InvestorDetailKpiRowBlock {
  return {
    kind: 'kpi-row',
    id: 'performance-metrics',
    title: 'Performance Metrics',
    collapsible: true,
    defaultExpanded: true,
    cards: [
      { label: 'TVPI', value: OVERVIEW_EMPTY, variant: 'navy' },
      { label: 'DPI', value: OVERVIEW_EMPTY, variant: 'blue' },
      { label: 'RVPI', value: OVERVIEW_EMPTY, variant: 'blue-light' },
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

export function buildCapitalInvestmentsTable(
  rows: InvestorUnderlyingInvestmentTabRow[],
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
    { key: 'propertyName', label: 'Property Name', type: 'text', align: 'left', sortBy: 'propertyName' },
    { key: 'city', label: 'City', type: 'text', align: 'left', tone: 'muted', sortBy: 'city' },
    { key: 'province', label: 'Province', type: 'text', align: 'left', tone: 'muted', sortBy: 'province' },
    { key: 'geography', label: 'Geography', type: 'text', align: 'left', tone: 'muted', sortBy: 'geography' },
    { key: 'assetType', label: 'Asset Type', type: 'text', align: 'left', tone: 'muted', sortBy: 'assetType' },
    { key: 'assetSubType', label: 'Asset Sub Type', type: 'text', align: 'left', tone: 'muted', sortBy: 'assetSubType' },
    { key: 'investmentType', label: 'Investment Type', type: 'text', align: 'left', tone: 'muted', sortBy: 'investmentType' },
  ];

  const tableRows: InvestorDetailTableRow[] = rows.map((row) => ({
    propertyName: row.propertyName,
    city: row.city,
    province: row.province,
    geography: row.geography,
    assetType: row.assetType,
    assetSubType: row.assetSubType,
    investmentType: row.investmentType,
  }));

  const totalCount = pagination.totalCount;
  const subtitle =
    totalCount > 0 ? `${totalCount} asset${totalCount === 1 ? '' : 's'}` : undefined;

  return tableBlock({
    id: 'underlying-investments',
    title: 'Asset Holdings',
    subtitle,
    columns,
    rows: tableRows,
    totals: null,
    variant: 'underlying-investments',
    pagination,
  });
}

const TRANSACTION_FUND_COLUMN: InvestorDetailTableColumn = {
  key: 'fundCode',
  label: 'Fund',
  type: 'transaction-fund',
  align: 'left',
  sortBy: 'fund_code',
};

function investorTransactionColumns(
  columns: InvestorDetailTableColumn[],
  rows: InvestorDetailTableRow[],
  insertAfterKey: string,
): InvestorDetailTableColumn[] {
  return withOptionalPeriodColumn(columns, rows, insertAfterKey);
}

function fundToolbarTableBlock(
  config: Omit<InvestorDetailTableBlock, 'kind' | 'variant' | 'showToolbar' | 'collapsible' | 'defaultExpanded'>,
): InvestorDetailTableBlock {
  return tableBlock({
    ...config,
    collapsible: true,
    defaultExpanded: true,
    variant: 'transactions',
    showToolbar: true,
  });
}

function capitalActivityRowsToTableRows(rows: InvestorCapitalActivityTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    fundCode: row.fundCode,
    fundName: row.fundName,
    period: row.period,
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

function irrRowsToTableRows(rows: InvestorIrrTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    fundCode: row.fundCode,
    fundName: row.fundName,
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
  rows: InvestorCapitalObligationTabRow[],
): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    fundKey: row.fundKey,
    fundCode: row.fundCode,
    fundName: row.fundName,
    period: row.period,
    commitment: row.commitment,
    unfundedAmount: row.unfundedAmount,
    reserved: row.reserved,
    releasedCapital: row.releasedCapital,
  }));
}

function netAssetRowsToTableRows(rows: InvestorNetAssetTabRow[]): InvestorDetailTableRow[] {
  return rows.map((row) => ({
    fundKey: row.fundKey,
    fundCode: row.fundCode,
    fundName: row.fundName,
    period: row.period,
    nav: row.nav,
  }));
}

export function buildCapitalActivitiesTable(
  rows: InvestorCapitalActivityTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = capitalActivityRowsToTableRows(rows);
  const columns = investorTransactionColumns(
    [
    TRANSACTION_FUND_COLUMN,
    { key: 'called', label: 'Called', type: 'amount', align: 'right', sortBy: 'called' },
    { key: 'transferIn', label: 'Transfer In', type: 'amount', align: 'right', sortBy: 'transfer_in' },
    { key: 'transferOut', label: 'Transfer Out', type: 'amount', align: 'right', tone: 'negative', sortBy: 'transfer_out' },
    { key: 'redemption', label: 'Redemption', type: 'amount', align: 'right', sortBy: 'redemption' },
    ],
    tableRows,
    'fundCode',
  );

  return fundToolbarTableBlock({
    id: 'capital-activities',
    title: 'Capital Activities',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'fundCode', `Total — ${tableRows.length}`) : null,
  });
}

export function buildDistributionsTable(
  rows: InvestorDistributionTableTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = distributionTableRowsToTableRows(rows);
  const columns = investorTransactionColumns(
    [
    TRANSACTION_FUND_COLUMN,
    { key: 'prefReturn', label: 'Preferred Return', type: 'amount', align: 'right', tone: 'info', sortBy: 'preferred_return' },
    { key: 'cashDist', label: 'Cash Distribution', type: 'amount', align: 'right', tone: 'positive', sortBy: 'cash_dist' },
    { key: 'gainDist', label: 'Gain Distribution', type: 'amount', align: 'right', tone: 'positive', sortBy: 'gain_dist' },
    { key: 'returnOfCapital', label: 'Return of Capital', type: 'amount', align: 'right', sortBy: 'return_of_capital' },
    ],
    tableRows,
    'fundCode',
  );

  return fundToolbarTableBlock({
    id: 'distributions',
    title: 'Distributions',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'fundCode', `Total — ${tableRows.length}`) : null,
  });
}

export function buildIrrsTable(
  rows: InvestorIrrTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = irrRowsToTableRows(rows);
  const columns = investorTransactionColumns(
    [
    TRANSACTION_FUND_COLUMN,
    { key: 'irr1Year', label: '1Y IRR', type: 'percent', align: 'right', sortBy: 'irr_1_year_pct' },
    { key: 'irr3Year', label: '3Y IRR', type: 'percent', align: 'right', sortBy: 'irr_3_year_pct' },
    { key: 'irr5Year', label: '5Y IRR', type: 'percent', align: 'right', sortBy: 'irr_5_year_pct' },
    { key: 'irr10Year', label: '10Y IRR', type: 'percent', align: 'right', sortBy: 'irr_10_year_pct' },
    { key: 'irrLtd', label: 'ITD IRR', type: 'percent', align: 'right', tone: 'info', sortBy: 'irr_ltd_pct' },
    ],
    tableRows,
    'fundCode',
  );

  return fundToolbarTableBlock({
    id: 'irrs',
    title: 'Performance',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: null,
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
  rows: InvestorCapitalObligationTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = capitalObligationRowsToTableRows(rows);
  const columns = investorTransactionColumns(
    [TRANSACTION_FUND_COLUMN, ...CAPITAL_OBLIGATION_AMOUNT_COLUMNS],
    tableRows,
    'fundCode',
  );

  return fundToolbarTableBlock({
    id: 'capital-obligations',
    title: 'Capital Obligations',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: tableRows.length ? buildTotalsRow(columns, tableRows, 'fundCode', `Total — ${tableRows.length}`) : null,
  });
}

export function buildNetAssetsTable(
  rows: InvestorNetAssetTabRow[],
  periodLabel: string,
): InvestorDetailTableBlock {
  const tableRows = netAssetRowsToTableRows(rows);
  const columns = investorTransactionColumns(
    [
      TRANSACTION_FUND_COLUMN,
      { key: 'nav', label: 'NAV', type: 'amount', align: 'right', sortBy: 'nav' },
    ],
    tableRows,
    'fundCode',
  );

  return fundToolbarTableBlock({
    id: 'net-assets',
    title: 'Net Asset Value',
    subtitle: '',
    subtitleAccent: '',
    columns,
    rows: tableRows,
    totals: null,
  });
}

function buildDocumentsList(detail: InvestorDetailDto | null): InvestorDetailDocumentListBlock {
  const count = detail?.summary?.documentsCount ?? 0;
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
    collapsible: true,
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
  | 'fund-holdings-summary'
  | 'investor-transactions'
  | 'underlying-assets'
  | 'documents';

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
  fundHoldings: InvestorFundHoldingTabRow[],
  fundHoldingsDateKey: number | null,
  capitalInvestments: InvestorUnderlyingInvestmentTabRow[],
  capitalInvestmentsPagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  },
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestorDetailKpiCards,
  periodLabel: string,
  overview?: InvestorOverviewInput,
): InvestorDetailBlock[] {
  const fundExposure = buildFundHoldingsTable(fundHoldings, fundHoldingsDateKey);
  switch (sectionId) {
    case 'overview': {
      const overviewInput: InvestorOverviewInput = overview ?? {
        investorName: '—',
        investorType: '—',
        relationship: '—',
        contactName: '—',
        status: 'Active',
        address: '',
      };
      return [
        buildInvestorOverviewBlock(
          detail,
          fundHoldings,
          capitalInvestments,
          capitalActivities,
          distributionTable,
          kpi,
          overviewInput,
        ),
      ];
    }
    case 'fund-holdings-summary':
      return [fundExposure];
    case 'underlying-assets':
      return [buildCapitalInvestmentsTable(capitalInvestments, capitalInvestmentsPagination)];
    case 'investor-transactions':
      return [
        {
          kind: 'transaction-hub',
          id: 'investor-transactions',
          title: 'Investor Transactions',
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
    default:
      return [];
  }
}

export interface InvestorDetailFlatBlock {
  sectionId: string;
  block: InvestorDetailBlock;
  isSectionStart: boolean;
}

export function buildFlatInvestorBlocks(
  detail: InvestorDetailDto | null,
  fundHoldings: InvestorFundHoldingTabRow[],
  fundHoldingsDateKey: number | null,
  capitalInvestments: InvestorUnderlyingInvestmentTabRow[],
  capitalInvestmentsPagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  },
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestorDetailKpiCards,
  periodLabel: string,
  overview?: InvestorOverviewInput,
): InvestorDetailFlatBlock[] {
  const sections = buildAllSectionBlocks(
    detail,
    fundHoldings,
    fundHoldingsDateKey,
    capitalInvestments,
    capitalInvestmentsPagination,
    capitalActivities,
    distributionTable,
    irr,
    kpi,
    periodLabel,
    overview,
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
  fundHoldings: InvestorFundHoldingTabRow[],
  fundHoldingsDateKey: number | null,
  capitalInvestments: InvestorUnderlyingInvestmentTabRow[],
  capitalInvestmentsPagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  },
  capitalActivities: InvestorCapitalActivityTabRow[],
  distributionTable: InvestorDistributionTableTabRow[],
  irr: InvestorIrrTabRow[],
  kpi: InvestorDetailKpiCards,
  periodLabel: string,
  overview?: InvestorOverviewInput,
): InvestorDetailSectionBlock[] {
  return INVESTOR_DETAIL_SIDEBAR_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      sectionId: item.id,
      blocks: buildBlocksForSection(
        item.id as InvestorDetailSectionId,
        detail,
        fundHoldings,
        fundHoldingsDateKey,
        capitalInvestments,
        capitalInvestmentsPagination,
        capitalActivities,
        distributionTable,
        irr,
        kpi,
        periodLabel,
        overview,
      ),
    })),
  );
}

export type { InvestorDetailKpiCards } from './investor-detail-api.util';

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
      capitalDeployed: null,
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
    capitalDeployed: null,
  };
}

function readTableTotal(totals: InvestorDetailTableRow | null | undefined, key: string): number {
  const value = totals?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Prefer fund-holdings totals for metrics the list API may omit. */
export function mergeKpiCardsWithFundExposure(
  base: InvestorDetailKpiCards,
  exposure: InvestorDetailTableBlock | null,
): InvestorDetailKpiCards {
  const totals = exposure?.totals;
  if (!totals || !(exposure?.rows?.length ?? 0)) {
    return base;
  }

  return {
    totalCommitment: readTableTotal(totals, 'commitment') || base.totalCommitment,
    netInvestedCapital:
      readTableTotal(totals, 'netInvestedCapital') ||
      readTableTotal(totals, 'netInvested') ||
      base.netInvestedCapital,
    netDistributed:
      readTableTotal(totals, 'netDistributed') ||
      readTableTotal(totals, 'distributed') ||
      base.netDistributed,
    reservedUncalled: readTableTotal(totals, 'reserved') || base.reservedUncalled,
    unfunded: readTableTotal(totals, 'unfunded') || base.unfunded,
    releasedCapital: readTableTotal(totals, 'releasedCapital') || base.releasedCapital,
    fundsCount: exposure?.pagination?.totalCount ?? exposure?.rows?.length ?? base.fundsCount,
    capitalDeployed: base.capitalDeployed,
  };
}
