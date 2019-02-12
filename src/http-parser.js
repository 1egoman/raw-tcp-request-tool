//
// POST / HTTP/1.1
// Host: localhost:5678
// User-Agent: curl/7.47.0
// Content-Length: 9
// Content-Type: application/x-www-form-urlencoded
//
// body here

const WHITESPACE = {
  match: /^[\n\t ]+/,
  enter: (match, state) => state,
};

const TOKENS_BY_STATE = {
  [null]: [
    WHITESPACE,
    {
      match: /^(GET|POST|PUT|PATCH|DELETE|OPTIONS)/,
      enter: (match, state) => {
        state.method = match[0];

        state.type = 'URL';
        return state;
      },
    },
  ],
  URL: [
    WHITESPACE,
    {
      match: /^([^ ]+)/,
      enter: (match, state) => {
        state.url = match[0];

        // FIXME: validate url?

        state.type = 'HTTP_VERSION';
        return state;
      },
    },
  ],
  HTTP_VERSION: [
    WHITESPACE,
    {
      match: /^HTTP\/(1.[01]|2|2.0)/,
      enter: (match, state) => {
        state.httpVersion = match[1];

        state.type = 'HEADER_NEWLINE_PREFIX';
        return state;
      },
    },
  ],
  HEADER_NEWLINE_PREFIX: [
    {
      match: /^\n/,
      enter: (match, state) => {
        state.type = 'HEADER_START';
        return state;
      },
    },
  ],
  HEADER_START: [
    {
      match: /^\n/,
      enter: (match, state) => {
        state.headers = state.headers || {}; // If no headers were specified

        state.type = 'BODY';
        return state;
      },
    },
    {
      match: /^([^:]+)/, // FIXME: are zero length headers a thing?
      enter: (match, state) => {
        // FIXME: ensure that header doesn't contain a newline
        state.inProgressHeader = {
          name: match[0],
        };

        state.type = 'HEADER_SEPERATOR';
        return state;
      },
    },
  ],
  HEADER_SEPERATOR: [
    WHITESPACE,
    {
      match: /^:/,
      enter: (match, state) => {
        state.type = 'HEADER_VALUE';
        return state;
      },
    },
  ],
  HEADER_VALUE: [
    {
      match: /^[ ]*([^\n]+)\n/, // FIXME: are zero length header values a thing?
      enter: (match, state) => {
        // FIXME: ensure that header doesn't contain a newline
        state.inProgressHeader.value = match[1];

        state.headers = state.headers || {};
        state.headers[state.inProgressHeader.name] = state.inProgressHeader.value;
        delete state.inProgressHeader;

        // Parse more headers
        state.type = 'HEADER_START';
        return state;
      },
    },
  ],
  BODY: [
    {
      match: /^.*$/,
      enter: (match, state) => {
        state.body = match[0];
        state.type = 'BODY';
        return state;
      },
    },
  ],
}

class HTTPParsingError extends Error {
  constructor(message, row, col, charLength) {
    super(`${message} (at ${row}:${col})`);
    this.row = row;
    this.col = col;
    this.charLength = charLength;
  }
}

function httpParser(input) {
  let state = { type: null };
  let row = 0, col = 0;

  let text = input;
  while (text.length > 0) {
    const tokens = TOKENS_BY_STATE[state.type];

    let result;

    for (let index = 0; index < tokens.length; index += 1) {
      const tok = tokens[index];
      result = tok.match.exec(text);
      if (result) {
        state = tok.enter(result, state);

        // Remove matched chars from text
        const matchLength = result[0].length;

        row += matchLength;
        const linesTraversed = text.slice(matchLength).split('').filter(t => t === '\n').length
        col += linesTraversed;

        text = text.slice(matchLength);
        break;
      }
    }

    // If a match was successful, then start the loop over again.
    if (result) {
      result = null;
      continue;
    }

    throw new HTTPParsingError(`Text '${text.slice(0, 10).replace('\n', '\\n')}...' was not matched!`, row, col, 0);
  }

  return state;
}

const input = `GET /foo HTTP/1.1a
Content-Type: application/json
Content-Length: 9

foo`;

console.log('INPUT START');
console.log(input);
console.log('INPUT END');
console.log();

const final = httpParser(input);
console.log('FINAL', final)
