import { createSelector } from '@ngrx/store';

import { capitalDashboardFeature } from './capital-dashboard.reducer';

const { selectInvestors, selectFunds, selectAssets, selectActiveTab } = capitalDashboardFeature;

export const selectInvestorsList = createSelector(selectInvestors, (s) => s.list);
export const selectInvestorsDetail = createSelector(selectInvestors, (s) => s.detail);
export const selectInvestorsDetailSelectedKey = createSelector(selectInvestorsDetail, (d) => d.selectedKey);

export { selectInvestors };

export const selectFundsList = createSelector(selectFunds, (s) => s.list);
export const selectFundsDetail = createSelector(selectFunds, (s) => s.detail);
export const selectFundsDetailSelectedKey = createSelector(selectFundsDetail, (d) => d.selectedKey);

export const selectAssetsList = createSelector(selectAssets, (s) => s.list);
export const selectAssetsDetail = createSelector(selectAssets, (s) => s.detail);

export { selectActiveTab, selectFunds };
