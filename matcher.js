GMailQuery.Matcher = function (query) {
  this.query = query;
  this.parsedQuery = GMailQuery.parse(query);
};

// XXX doesn't work with a raw document, only with GMail.Message instances from
// slava:gmail package
GMailQuery.Matcher.prototype.matches = function (doc) {
  var self = this;
  return matches(doc, self.parsedQuery);
};

var matches = function (doc, q) {
  // match the contents against exact string
  if (_.isString(q)) {
    return matchStrings(doc.text, q);
  }

  // a passable function that runs subquery over doc
  var bindMatches = _.bind(matches, null, doc);

  // AND
  if (_.isArray(q)) {
    return _.all(q, bindMatches);
  }

  // OR
  if (q.or) {
    return _.any(q.or, bindMatches);
  }

  // is:chat
  if (_.has(q, 'isChat')) {
    // XXX do it properly, right now there is now easy way to determine if a
    // message is a chat or not
    return doc.from && !doc.to;
  }

  var field = _.find([
    'from', 'to', 'cc', 'bcc', 'subject', 'label', 'after', 'before',
    'older', 'newer', 'exclude'], _.bind(_.has, null, q));

  if (! field)
    throw new Error('unsupported query: ' + JSON.stringify(q));
  if (field === 'label')
    throw new Error('label is not currently supported');

  // used in mappings for OR'd or AND'd queries
  var subqMatcher = function (subq) {
    var m = {};
    m[field] = subq;
    return matches(doc, m);
  };

  // It is something like from:(slava OR niklas)
  if (_.isArray(q[field])) {
    return _.all(q[field], subqMatcher);
  }

  // from:(slava niklas)
  if (q[field].or) {
    return _.any(q[field].or, subqMatcher);
  }

  if (field === 'exclude') {
    return !matchStrings(doc.text, q[field]);
  }

  // it is a plain field such as from:"tony xiao"
  if (! _.contains(['after', 'before', 'older', 'newer'], field)) {
    return matchStrings(doc[field], q[field]);
  }

  // it is one of those date-related things
  return matchDates(doc.date,
                    q[field], _.contains(['before', 'newer'], field));
};

// XXX is not as advanced as Google's match with typos correction and
// similar strings
var matchStrings = function (text, q) {
  if (! text) return false;
  text = text.toLowerCase();
  return text.indexOf(q.toLowerCase()) !== -1;
};

var matchDates = function (d, q, inverse) {
  if (! d) return false;
  d = new Date(d);
  q = new Date(q);

  return !inverse ? q < d : d < q;
};

