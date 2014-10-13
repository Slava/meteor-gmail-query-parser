Package.describe({
  name: "slava:gmail-query-parser",
  summary: "Parses GMail queries.",
  version: "1.0.0",
  git: "https://github.com/Slava/meteor-gmail-query-parser"
});

Package.onUse(function(api) {
  api.versionsFrom('METEOR@0.9.3.1');
  api.addFiles(['gmail-query-parser.js', 'matcher.js']);
  api.use('underscore');
  api.export('GMailQuery');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('slava:gmail-query-parser');
  api.addFiles('gmail-query-parser-tests.js');
  api.addFiles('matcher-tests.js');
});
