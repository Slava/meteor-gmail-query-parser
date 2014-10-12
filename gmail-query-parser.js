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
  var valStackTopLevel = [ [] ];
  var i = 0;

  var processOp = function (op) {
    if (op === 'or' || op === 'and') {
      var r = valStack.pop();
      var l = valStack.pop();

      if (op === 'or') {
        if (l.or) {
          l.or = l.or.concat(r);
          return l;
        }
        if (r.or) {
          r.or.unshift(l);
          return r;
        }
        return {or:[l, r]};
      } else {
        if (_.isArray(l)) {
          l = l.concat(r);
          return l;
        }
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
    var canAnd = false;
    var valStack = last(valStackTopLevel);

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
        while (last(stack) && last(stack) !== 'openParen') {
          var op = stack.pop();
          valStack.push(processOp(op));
        }

        if (! last(stack) || last(stack) !== 'openParen')
          throw generateParseError(queryString, i, 'no matching open paren');

        // get the open paren out
        stack.pop();
        // the current valStack should now have only one element, otherwise
        // something went wrong
        if (valStack.length !== 1)
          throw generateParseError(queryString, i, 'not enough operators in this sub expr');

        var val = last(valStack);
        valStackTopLevel.pop();
        valStack = last(valStackTopLevel);
        if (! valStack)
          throw generateParseError(queryString, i, 'not enought stacks for exprs?');
        valStack.push(val);

        canAnd = true;
      } else if (matchedRegexName === 'openParen') {
        stack.push('openParen');
        valStackTopLevel.push([]);
        valStack = last(valStackTopLevel);
      } else if (matchedRegexName === 'whitespace') {
        // no-op
      } else if (matchedRegexName === 'or') {
        while (last(stack) && opRank(last(stack)) >= opRank('or')) {
          var op = stack.pop();
          valStack.push(processOp(op));
        }
        stack.push('or');
      } else if (matchedRegexName === 'isChat') {
        stack.push('isChat');
        canAnd = true;
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

      valStack.push(word);
      canAnd = true;
      onlyWord = false;
    }

    if (canAnd) {
      // try to insert 'and' between two rules
      while (last(stack) && opRank(last(stack)) >= opRank('and')) {
        var op = stack.pop();
        valStack.push(processOp(op));
      }
      // check if two items on top of the stack are rules
      if (last(valStack) && last(valStack, 1))
        stack.push('and');
    }

    i += match.length;
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

var last = function (arr, n) {
  n = n || 0;
  return arr.length ? arr[arr.length - 1 - n] : null;
};

