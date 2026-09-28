// Sentry's bundle phase uploads source maps on every build and fails without an org and auth
// token. Debug (dev client) builds load JavaScript from Metro, so there's nothing to upload:
// skip it there. Release builds stay strict, so a release can't ship without source maps.
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const MARK = '# splits: skip Sentry upload in Debug';
const LINES = `
${MARK}
if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SENTRY_DISABLE_AUTO_UPLOAD=true
fi
`;

module.exports = function withSentryDebugSkip(config) {
  return withDangerousMod(config, [
    'ios',
    (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, '.xcode.env');
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!current.includes(MARK)) fs.writeFileSync(file, current + LINES);
      return c;
    },
  ]);
};
