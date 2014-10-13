GMail Query Parser
===

This is a little package that is part of the series of GMail related Meteor
packages.

GMail has its own little [query
syntax](https://support.google.com/mail/answer/7190?hl=en) that was designed to
be an easy way for power users to filter their GMail inbox.

This package provides one method `GMailQuery.parse` and one class
`GMailQuery.Matcher`.

By feeding the query string such as `'from:me to:(bob@example.com OR
bob@corp.com)' -kittens "Serious Business"` to find all the emails sent to Bob
that talk only about serious business and w/o kittens and get back a structured
parsed object that looks something like this:

```javascript
[{from:"me"}, {to:{or:["bob@example.com", "bob@corp.com"]}}, {exclude:"kittens"}, "Serious Business"]
```

Later this structured form of query can be used by other software to filter out
messages those came from the GMail API.

Or you can use the `GMailQuery.Matcher` class that provides the `matches`
method for this exact reason.

Supported syntax:
---

Most common operators are supported as well as groupings and logical
conjuctions:

- `from:`, `to:`
- `cc:`, `bcc:`
- `subject:`, `label:`, `after:`, `before:`, `older:`, `newer:`, `is:chat`
- `(`, `)`
- `OR`

Tests:
---

Tinytest:

```
meteor test-packages ./
```

