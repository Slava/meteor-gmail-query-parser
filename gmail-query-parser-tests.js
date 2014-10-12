
Tinytest.add('gmail-query-parser - general', function (test) {
  var t = function (q, exp, desc) {
    test.equal(GMailQuery.parse(q), exp, desc);
  };

  t("asdf", "asdf");
  t("asdf jkl", ["asdf", "jkl"]);
  t('(from:slava OR from:peter)  kittens "Uber promotion" -puppets', [{or:[{from:"slava"}, {from:"peter"}]}, "kittens", "Uber promotion", {exclude: "puppets"}]);
  t('from:slava OR from:peter bla', [{or:[{from:"slava"}, {from:"peter"}]}, "bla"]);
  t('from:slava OR from:peter OR bla', {or:[{from:"slava"}, {from:"peter"}, "bla"]});
  t('from:amy (dinner OR movie)', [{from:"amy"}, {or: ["dinner", "movie"]}]);
  t('subject:(dinner movie)', {subject:["dinner", "movie"]});
  t('subject:(dinner movie OR stuff)', {subject:["dinner", {or:["movie", "stuff"]}]});
  t('subject:(dinner OR movie stuff)', {subject:[{or:["dinner", "movie"]}, "stuff"]});
  t('dinner movie OR girls houses', ["dinner", {or:["movie", "girls"]}, "houses"]);
  t('things OR "not things" OR projects OR "pension"', {or: ["things", "not things", "projects", "pension"]});
  t('(things OR "not things" OR projects OR "pension") OR from:me', {or: ["things", "not things", "projects", "pension", {from: "me"}]});
  t('d  (from:hey  ney) f', ["d", {from:"hey"}, "ney", "f"], 'flatten AND rules');
  t('from:A OR B C', [{or:[{from:"A"}, "B"]}, "C"], 'tricky OR/AND parsing');
  t('from:A B', [{from:"A"}, "B"], 'tricky AND parsing');
  t('((((A OR B))))', {or:["A", "B"]}, 'parens');
  t('((((A OR B) (B OR C))) (C OR D))', [{or:["A", "B"]}, {or:["B", "C"]}, {or:["C", "D"]}], 'parens');
});

