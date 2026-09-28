// Free (Personal Team) Apple accounts can't sign the push notifications capability, which
// expo-notifications adds by default. Splits only uses local notifications (the rest timer), so
// the entitlement isn't needed. Remove this plugin once the account is paid (step 9, push).
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
