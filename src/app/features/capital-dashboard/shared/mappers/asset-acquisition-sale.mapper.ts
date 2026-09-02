import {
  AssetAcquisitionDto,
  AssetAcquisitionSaleDto,
  AssetSaleDto,
} from '../models/api.models';

export interface AssetAcquisitionRow {
  fundKey: number | null;
  fundCode: string;
  fundName: string;
  assetKey: number | null;
  assetCode: string;
  assetName: string;
  acquisitionDate: string | null;
  atAcquisitionDebt: number | null;
  atAcquisitionEquity: number | null;
  atAcquisitionTotalAssetValue: number | null;
  atAcquisitionPurchaseCosts: number | null;
  atAcquisitionLtv: number | null;
}

export interface AssetSaleRow {
  fundKey: number | null;
  fundCode: string;
  fundName: string;
  assetKey: number | null;
  assetCode: string;
  assetName: string;
  saleDate: string | null;
  atSaleDebt: number | null;
  atSaleEquity: number | null;
  atSaleTotalAssetValue: number | null;
  atSaleSellingCosts: number | null;
  atSaleLtv: number | null;
  atSaleNoi: number | null;
}

export interface AssetAcquisitionSaleRow {
  acquisition: AssetAcquisitionRow | null;
  sale: AssetSaleRow | null;
}

function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function readString(source: object, snake: string, camel: string): string {
  const value = asRecord(source)[snake] ?? asRecord(source)[camel];
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(source: object, snake: string, camel: string): number | null {
  const value = asRecord(source)[snake] ?? asRecord(source)[camel];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value.trim();
  }
  return new Date(parsed).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function mapAcquisition(dto: AssetAcquisitionDto | null | undefined): AssetAcquisitionRow | null {
  if (!dto) {
    return null;
  }
  return {
    fundKey: readNumber(dto, 'fund_key', 'fundKey'),
    fundCode: readString(dto, 'fund_code', 'fundCode'),
    fundName: readString(dto, 'fund_name', 'fundName'),
    assetKey: readNumber(dto, 'asset_key', 'assetKey'),
    assetCode: readString(dto, 'asset_code', 'assetCode'),
    assetName: readString(dto, 'asset_name', 'assetName'),
    acquisitionDate: formatDate(asRecord(dto)['acquisition_date'] ?? asRecord(dto)['acquisitionDate']),
    atAcquisitionDebt: readNumber(dto, 'at_acquisition_debt', 'atAcquisitionDebt'),
    atAcquisitionEquity: readNumber(dto, 'at_acquisition_equity', 'atAcquisitionEquity'),
    atAcquisitionTotalAssetValue: readNumber(
      dto,
      'at_acquisition_total_asset_value',
      'atAcquisitionTotalAssetValue',
    ),
    atAcquisitionPurchaseCosts: readNumber(
      dto,
      'at_acquisition_purchase_costs',
      'atAcquisitionPurchaseCosts',
    ),
    atAcquisitionLtv: readNumber(dto, 'at_acquisition_ltv', 'atAcquisitionLtv'),
  };
}

function mapSale(dto: AssetSaleDto | null | undefined): AssetSaleRow | null {
  if (!dto) {
    return null;
  }
  return {
    fundKey: readNumber(dto, 'fund_key', 'fundKey'),
    fundCode: readString(dto, 'fund_code', 'fundCode'),
    fundName: readString(dto, 'fund_name', 'fundName'),
    assetKey: readNumber(dto, 'asset_key', 'assetKey'),
    assetCode: readString(dto, 'asset_code', 'assetCode'),
    assetName: readString(dto, 'asset_name', 'assetName'),
    saleDate: formatDate(asRecord(dto)['sale_date'] ?? asRecord(dto)['saleDate']),
    atSaleDebt: readNumber(dto, 'at_sale_debt', 'atSaleDebt'),
    atSaleEquity: readNumber(dto, 'at_sale_equity', 'atSaleEquity'),
    atSaleTotalAssetValue: readNumber(dto, 'at_sale_total_asset_value', 'atSaleTotalAssetValue'),
    atSaleSellingCosts: readNumber(dto, 'at_sale_selling_costs', 'atSaleSellingCosts'),
    atSaleLtv: readNumber(dto, 'at_sale_ltv', 'atSaleLtv'),
    atSaleNoi: readNumber(dto, 'at_sale_noi', 'atSaleNoi'),
  };
}

export function mapAssetAcquisitionSaleToRow(
  dto: AssetAcquisitionSaleDto | null | undefined,
): AssetAcquisitionSaleRow | null {
  if (!dto) {
    return null;
  }
  const record = asRecord(dto);
  return {
    acquisition: mapAcquisition(
      (record['acquisition'] as AssetAcquisitionDto | null | undefined) ?? dto.acquisition,
    ),
    sale: mapSale((record['sale'] as AssetSaleDto | null | undefined) ?? dto.sale),
  };
}
