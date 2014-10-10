// XXX: check global?
GMailQuery = {};

var lexemRegexStrings = {
  openParen: '\\(',
  closeParen: '\\)',
  exclude: '-',
  or: 'OR',
  from: 'from:',
  to: 'to:',
  subject: 'subject:',
  label: 'label:',
  cc: 'cc:',
  bcc: 'bcc:',
  after: 'after:',
  before: 'before:',
  older: 'older:',
  newer: 'newer:',
  isChat: 'is:chat',
  whitespace: '\\s+'
};
var lexemRegexs = {};
var quotedWordRegex = /^("[^"]*")/;
var wordRegex = /(^\w+)/;

var prepareRegexs = _.once(function () {
  _.each(lexemRegexStrings, function (str, name) {
    lexemRegexs[name] = new RegExp('^(' + str + ')');
  });
});

GMailQuery.parse = function (queryString) {
  prepareRegexs();

  var onlyWord = false;
  var stack = [];
  var valStack = [];
  var i = 0;
  var lastWasSepRule = false;

  var processOp = function (op) {
    if (op === 'or' || op === 'and') {
      var r = valStack.pop();
      var l = valStack.pop();

      if (op === 'or') {
        if (r.or) {
          r.or = r.or.concat(l);
          return r;
        }
        return {or:[l, r]};
      } else {
        if (_.isArray(r)) {
          r.unshift(l);
          return r;
        }
        return [l, r];
      }
    } else {
      var r = valStack.pop();
      var res = {};
      res[op] = r;
      return res;
    }
  };

  var opRank = function (op) {
    if (op === 'openParen')
      return -1;
    if (op === 'and')
      return 1;
    if (op === 'or')
      return 2;
    return 3;
  };

  while (i < queryString.length) {
    var rest = queryString.substr(i);
    var match = null;
    var isSepRule = false;

    if (! onlyWord) {
      var matchedRegexName = null;
      // find the first regex that matches the prefix
      var matchedRegex = _.find(lexemRegexs, function (regex, name) {
        if (regex.test(rest)) {
          matchedRegexName = name;
          return true;
        }
      });

      // if found a match, split it, otherwise continue
      if (matchedRegexName)
        match = matchedRegex.exec(rest)[1];

      if (matchedRegexName === 'closeParen') {
        while (stack.length && stack[stack.length - 1] !== 'openParen') {
          var op = stack.pop();
          valStack.push(processOp(op));
        }
        if (! stack.length || stack[stack.length - 1] !== 'openParen')
          throw generateParseError(queryString, i, 'no matching open paren');
        // get the open paren out
        stack.pop();

        isSepRule = true;
      } else if (matchedRegexName === 'openParen') {
        isSepRule = true;
        stack.push('openParen');
      } else if (matchedRegexName === 'whitespace') {
        isSepRule = lastWasSepRule;
        lastWasSepRule = false;
        // no-op
      } else if (matchedRegexName === 'or') {
        while (stack.length && opRank(stack[stack.length - 1]) > opRank('or')) {
          var op = stack.pop();
          valStack.push(processOp(op));
        }
        stack.push('or');
      } else if (matchedRegexName === 'isChat') {
        isSepRule = true;
        stack.push('isChat');
      } else if (matchedRegexName) {
        // some unary operator
        stack.push(matchedRegexName);
        onlyWord = true;
      }
    }

    if (! match) {
      var word = null;
      if (quotedWordRegex.test(rest)) {
        match = quotedWordRegex.exec(rest)[1];
        word = match.substring(1, match.length - 1);
      } else if (wordRegex.test(rest)) {
        match = word = wordRegex.exec(rest)[1];
      } else {
        throw generateParseError(queryString,
                                 i,
                                 onlyWord ? 'expected a word' : null);
      }

      isSepRule = true;

      valStack.push(word);
      onlyWord = false;
    }

    if (lastWasSepRule && isSepRule) {
      while (stack.length && opRank(stack[stack.length - 1]) > opRank('and')) {
        var op = stack.pop();
        valStack.push(processOp(op));
      }
      stack.push('and');
    }

    // hack: don't put "and"s inside of paren expr
    if (matchedRegexName === 'openParen')
      isSepRule = false;

    i += match.length;
    lastWasSepRule = isSepRule;
  }

  while (stack.length) {
    var op = stack.pop();
    if (op === 'openParen')
      throw generateParseError(queryString,
                               queryString.indexOf('('),
                               'no matching close paren');

    valStack.push(processOp(op));
  }

  if (valStack.length !== 1)
    throw generateParseError(queryString, 0, 'unknown :(');

  return valStack[0];
};

var generateParseError = function (s, i, reason) {
  var paddedString = '    ' + s;
  var paddedAnchor = new Array(5 + i).join(' ') + '^';
  return new Error((i+1) + ': Could not parse the query string: '
                   + (reason || 'unexpected token') + '\n'
                   + paddedString + '\n' + paddedAnchor);
};

