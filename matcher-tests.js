
// incomplete tests for querying
Tinytest.add('gmail-query-parser - matcher', function (test) {
  var t = function (q, doc, exp, desc) {
    test.equal(new GMailQuery.Matcher(q).matches(doc), exp, desc);
  };
  var T = function (q, doc, desc) {
    t(q, doc, true, desc);
  };
  var F = function (q, doc, desc) {
    t(q, doc, false, desc);
  };

  T('from:amy', { from: 'Amy Doe <aam@example.com>' });
  T('bcc:amy', { bcc: 'amy.doe@example.com' });
  T('cc:amy', { cc: 'doe.amy@example.com' });
  F('from:amy', { from: 'Bob@example.com' });
  F('cc:amy', { cc: 'Admy@example.com' });

  T('to:david', { to: 'Davide M <ddm@example.com>' });
  T('to:david', { to: 'david q <ddm@example.com>' });
  T('to:david', { to: '<david@example.com>' });
  F('to:david', { to: '<man@example.com>' });

  T('subject:"kats FOUND"', { subject: 'this are Kats Found' });
  F('subject:"kats FOUND"', { subject: 'this are Kats not Found' });

  F('-miracle', { text: 'simple miracle' });
  T('-miracle', { text: 'mi ra cle' });

  T('to:(david michael)', { to: 'david <michael@gmail.com>' });
  T('to:(david michael)', { to: 'Michael <david@gmail.com>' });
  F('to:(david michael)', { to: 'David <david@gmail.com>' });

  T('to:(david OR michael)', { to: 'David <david@gmail.com>' });
  T('to:(david OR michael)', { to: 'Michael <david@gmail.com>' });
  T('to:(david OR michael)', { to: 'Michael <m@gmail.com>' });

  T('to:(david OR michael spiegel)', { to: 'Michael Spiegel <m@gmail.com>' });
  F('to:(david OR michael spiegel)', { to: 'Michael Davide <m@gmail.com>' });

  T('after:2004/04/16 before:2004/04/18', { date: new Date("00:01 April 16, 2004") });
  F('after:2004/04/16 before:2004/04/18', { date: new Date("00:00 April 16, 2004") });
  F('after:2004/04/16 before:2004/04/18', { date: new Date("00:00 April 18, 2004") });
  T('after:2004/04/16 before:2004/04/18', { date: new Date("23:59:59 April 17, 2004") });

  F('older:2004/04/16 newer:2004/04/18', { date: new Date("00:00 April 18, 2004") });
  T('older:2004/04/16 newer:2004/04/18', { date: new Date("23:59:59 April 17, 2004") });
});

