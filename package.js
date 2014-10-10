Package.describe({
  summary: " \* Fill me in! *\ ",
  version: "1.0.0",
  git: " \* Fill me in! *\ "
});

Package.onUse(function(api) {
  api.versionsFrom('METEOR@0.9.3.1');
  api.addFiles('gmail-query-parser.js');
  api.use('underscore');
  api.export('GMailQuery');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('gmail-query-parser');
  api.addFiles('gmail-query-parser-tests.js');
});
