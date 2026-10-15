// backgroundCheck.web.ts — the COMPUTER (web) version of backgroundCheck.ts.
// Browsers can't run tasks when the tab is closed, so this does nothing.
// While the tab is open, HeatContext still checks the heat every 15 minutes.

export const HEAT_TASK = 'cooldrift-heat-check';

export async function registerBackgroundCheck() {}
