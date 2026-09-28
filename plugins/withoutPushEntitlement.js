// Free (Personal Team) Apple accounts can't sign the push notifications capability, which
// expo-notifications adds by default. Splits only uses local notifications (the rest timer), so
// the entitlement isn't needed on a free or paid account; keep it until remote push is added.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
