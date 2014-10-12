if (typeof GMailQuery === 'undefined')
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

  var stack = [];
  var valStackTopLevel = [ [] ];
  var i = 0;
  var expectedExpr = null;

  var processOp = function (op) {
    if (op.type === 'or' || op.type === 'and') {
      var r = valStack.pop();
      var l = valStack.pop();

      if (! r || ! l) {
        throw generateParseError(
          queryString,
          op.start,
          'missing required arguments for operator: ' + op.token);
      }

      if (op.type === 'or') {
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
      if (! r) {
        throw generateParseError(
          queryString,
          op.start,
          'missing the required argument for operator: ' + op.token);
      }

      var res = {};
      res[op.type] = r;
      return res;
    }
  };

  var opRank = function (op) {
    if (op.type === 'openParen')
      return -1;
    if (op.type === 'and')
      return 1;
    if (op.type === 'or')
      return 2;
    return 3;
  };

  while (i < queryString.length) {
    var rest = queryString.substr(i);
    var match = null;
    var canAnd = false;
    var valStack = last(valStackTopLevel);

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

    if (matchedRegexName) {
      var operator = { type: matchedRegexName, start: i, token: match };
      if (matchedRegexName === 'closeParen') {
        while (last(stack) && last(stack).type !== 'openParen') {
          var op = stack.pop();
          valStack.push(processOp(op));
        }

        if (! last(stack) || last(stack).type !== 'openParen')
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
        stack.push(operator);
        valStackTopLevel.push([]);
        valStack = last(valStackTopLevel);
      } else if (matchedRegexName === 'whitespace') {
        // no-op
        if (expectedExpr)
          throw generateParseError(
            queryString,
          expectedExpr.start,
          'argument should be followed immediately for operator: ' + expectedExpr.token);

      } else if (matchedRegexName === 'or') {
        while (last(stack) && opRank(last(stack)) >= opRank(operator)) {
          var op = stack.pop();
          valStack.push(processOp(op));
        }
        stack.push(operator);
      } else if (matchedRegexName === 'isChat') {
        stack.push(operator);
        canAnd = true;
      } else if (matchedRegexName) {
        // some unary operator
        stack.push(operator);
        expectedExpr = operator;
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
                                 'unexpected token');
      }

      expectedExpr = null;
      valStack.push(word);
      canAnd = true;
    }

    if (canAnd) {
      // try to insert 'and' between two rules
      var operator = {type: 'and', start: i - 1, token: ''};
      while (last(stack) && opRank(last(stack)) >= opRank(operator)) {
        var op = stack.pop();
        valStack.push(processOp(op));
      }
      // check if two items on top of the stack are rules
      if (last(valStack) && last(valStack, 1))
        stack.push(operator);
    }

    i += match.length;
  }

  while (stack.length) {
    var op = stack.pop();
    if (op.type === 'openParen')
      throw generateParseError(queryString,
                               op.start,
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

