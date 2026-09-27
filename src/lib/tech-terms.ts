/**
 * Repairs the technical vocabulary auto-captions reliably mangle.
 *
 * Speech recognition is trained on general English, so it renders programming
 * terms as the nearest everyday words: "Jupiter notebook", "numb pie",
 * "my sequel". For a general-audience video that is a cosmetic flaw. For the
 * courses this extension is actually used on it is the opposite — the mangled
 * words are the subject of the lecture, and they are also exactly the words a
 * reader will later search for.
 *
 * This is a lookup table, not a model. Same reasoning as the static embedder:
 * a table loads instantly, behaves identically on every machine, and can be
 * read and corrected by a human. Nothing here can invent a term the lecturer
 * did not say.
 *
 * ## What is deliberately absent
 *
 * Ambiguous single words are excluded, because a wrong "correction" is worse
 * than no correction: it puts words in the lecturer's mouth and the reader has
 * no way to tell. "Jason" is a person's name as often as it is JSON; "sequel"
 * is an ordinary English word; "dom", "rust", "go" and "swift" are all common
 * words before they are technologies. Those appear here only inside a longer
 * phrase that resolves the ambiguity ("my sequel" -> MySQL), never alone.
 */

export interface TermRule {
  /** The phrase as speech recognition tends to render it, lower-cased. */
  heard: string;
  /** The canonical spelling. */
  canonical: string;
}

/**
 * Ordered by specificity at match time, not here — `buildMatcher` sorts by
 * length so "my sequel" is consumed before any rule that mentions "sequel".
 */
export const TERM_RULES: TermRule[] = [
  // Python data stack. The most common courses this runs on, and the terms
  // recognisers get wrong most often.
  { heard: 'jupiter notebook', canonical: 'Jupyter Notebook' },
  { heard: 'jupiter note book', canonical: 'Jupyter Notebook' },
  { heard: 'jupiter lab', canonical: 'JupyterLab' },
  { heard: 'jupiter', canonical: 'Jupyter' },
  { heard: 'numb pie', canonical: 'NumPy' },
  { heard: 'num pie', canonical: 'NumPy' },
  { heard: 'numpy', canonical: 'NumPy' },
  { heard: 'sci pie', canonical: 'SciPy' },
  { heard: 'scipy', canonical: 'SciPy' },
  { heard: 'matplot lib', canonical: 'Matplotlib' },
  { heard: 'mat plot lib', canonical: 'Matplotlib' },
  { heard: 'matplotlib', canonical: 'Matplotlib' },
  { heard: 'psychic learn', canonical: 'scikit-learn' },
  { heard: 'sci kit learn', canonical: 'scikit-learn' },
  { heard: 'scikit learn', canonical: 'scikit-learn' },
  { heard: 'pie torch', canonical: 'PyTorch' },
  { heard: 'pytorch', canonical: 'PyTorch' },
  { heard: 'tensor flow', canonical: 'TensorFlow' },
  { heard: 'tensorflow', canonical: 'TensorFlow' },
  { heard: 'pie charm', canonical: 'PyCharm' },
  { heard: 'pycharm', canonical: 'PyCharm' },
  { heard: 'i python', canonical: 'IPython' },
  { heard: 'anna conda', canonical: 'Anaconda' },

  // Languages and runtimes.
  { heard: 'java script', canonical: 'JavaScript' },
  { heard: 'javascript', canonical: 'JavaScript' },
  { heard: 'type script', canonical: 'TypeScript' },
  { heard: 'typescript', canonical: 'TypeScript' },
  { heard: 'note js', canonical: 'Node.js' },
  { heard: 'node js', canonical: 'Node.js' },
  { heard: 'nodejs', canonical: 'Node.js' },
  { heard: 'dino js', canonical: 'Deno' },
  { heard: 'c sharp', canonical: 'C#' },
  { heard: 'see sharp', canonical: 'C#' },
  { heard: 'c plus plus', canonical: 'C++' },
  { heard: 'see plus plus', canonical: 'C++' },
  { heard: 'dot net', canonical: '.NET' },
  { heard: 'golang', canonical: 'Go' },

  // Databases. "sequel" alone is an English word and stays untouched.
  { heard: 'my sequel', canonical: 'MySQL' },
  { heard: 'mysql', canonical: 'MySQL' },
  { heard: 'no sequel', canonical: 'NoSQL' },
  { heard: 'nosql', canonical: 'NoSQL' },
  { heard: 'post gres', canonical: 'PostgreSQL' },
  { heard: 'postgres sequel', canonical: 'PostgreSQL' },
  { heard: 'postgresql', canonical: 'PostgreSQL' },
  { heard: 'sequel light', canonical: 'SQLite' },
  { heard: 'sqlite', canonical: 'SQLite' },
  { heard: 'mongo db', canonical: 'MongoDB' },
  { heard: 'mongodb', canonical: 'MongoDB' },
  { heard: 'sequel query', canonical: 'SQL query' },
  { heard: 'sequel server', canonical: 'SQL Server' },
  { heard: 'sequel statement', canonical: 'SQL statement' },

  // Web and tooling.
  { heard: 'get hub', canonical: 'GitHub' },
  { heard: 'github', canonical: 'GitHub' },
  { heard: 'get lab', canonical: 'GitLab' },
  { heard: 'j query', canonical: 'jQuery' },
  { heard: 'jquery', canonical: 'jQuery' },
  { heard: 'react js', canonical: 'React' },
  { heard: 'view js', canonical: 'Vue' },
  { heard: 'vue js', canonical: 'Vue' },
  { heard: 'angular js', canonical: 'AngularJS' },
  { heard: 'next js', canonical: 'Next.js' },
  { heard: 'tail wind', canonical: 'Tailwind' },
  { heard: 'boot strap', canonical: 'Bootstrap' },
  { heard: 'vs code', canonical: 'VS Code' },
  { heard: 'visual studio code', canonical: 'VS Code' },
  { heard: 'cube ernetes', canonical: 'Kubernetes' },
  { heard: 'kubernetes', canonical: 'Kubernetes' },
  { heard: 'red is', canonical: 'Redis' },
  { heard: 'engine x', canonical: 'nginx' },
  { heard: 'web pack', canonical: 'webpack' },

  // Acronyms spoken letter by letter.
  { heard: 'jason file', canonical: 'JSON file' },
  { heard: 'jason object', canonical: 'JSON object' },
  { heard: 'jason data', canonical: 'JSON data' },
  { heard: 'jason format', canonical: 'JSON format' },
  { heard: 'rest a p i', canonical: 'REST API' },
  { heard: 'rest api', canonical: 'REST API' },
  { heard: 'a p i', canonical: 'API' },
  { heard: 'u r l', canonical: 'URL' },
  { heard: 'h t m l', canonical: 'HTML' },
  { heard: 'c s s', canonical: 'CSS' },
  { heard: 'i d e', canonical: 'IDE' },
  { heard: 'c l i', canonical: 'CLI' },
  { heard: 'o o p', canonical: 'OOP' },

  // Data structures and algorithms — the vocabulary of the courses this is
  // most used on.
  { heard: 'big o notation', canonical: 'Big-O notation' },
  { heard: 'oh of n', canonical: 'O(n)' },
  { heard: 'o of n', canonical: 'O(n)' },
  { heard: 'oh of one', canonical: 'O(1)' },
  { heard: 'o of one', canonical: 'O(1)' },
  { heard: 'oh of log n', canonical: 'O(log n)' },
  { heard: 'o of log n', canonical: 'O(log n)' },
  { heard: 'oh of n squared', canonical: 'O(n^2)' },
  { heard: 'o of n squared', canonical: 'O(n^2)' },
  { heard: 'depth first search', canonical: 'depth-first search' },
  { heard: 'breadth first search', canonical: 'breadth-first search' },
];

/** Regex-special characters that may appear inside a `heard` phrase. */
const ESCAPE = /[.*+?^${}()|[\]\\]/g;

function escapeRegExp(value: string): string {
  return value.replace(ESCAPE, '\\$&');
}

interface CompiledRule {
  pattern: RegExp;
  canonical: string;
}

/**
 * Guards that keep the table out of code.
 *
 * This corrects *spoken prose*. A transcript also quotes identifiers and URLs
 * verbatim — `javascript:void(0)`, `numpy.array`, `json(` — and rewriting the
 * capitalisation inside one of those silently breaks something the reader
 * intends to copy and run.
 *
 * `NOT_AFTER_CODE` blocks a match glued to the right of a path or member
 * separator. `NOT_BEFORE_CODE` blocks one that is followed by a scheme colon,
 * an opening paren, an assignment, or a separator that continues into another
 * identifier. A trailing `.` followed by whitespace or end of input is an
 * ordinary sentence period and stays eligible, so "we import numb pie." is
 * still corrected.
 */
const NOT_AFTER_CODE = '(?<![./])';
const NOT_BEFORE_CODE = '(?!(?:[./]\\w)|[:(=])';

/**
 * Compile the table once.
 *
 * Longest phrase first: "postgres sequel" has to be consumed before "sequel
 * server" gets a chance at part of it, and "jupiter notebook" before
 * "jupiter". Sorting by length is what makes the table order-independent, so
 * rules can be added above without thinking about precedence.
 *
 * `\b` on both sides keeps corrections inside word boundaries, so "api" never
 * matches inside "rapid" and "go" never matches inside "going".
 */
function compile(rules: TermRule[]): CompiledRule[] {
  return [...rules]
    .sort((a, b) => b.heard.length - a.heard.length)
    .map((rule) => ({
      // Spoken phrases can arrive hyphenated or with extra spacing, so the
      // separator between words is matched loosely rather than as one space.
      pattern: new RegExp(
        `${NOT_AFTER_CODE}\\b${rule.heard.split(' ').map(escapeRegExp).join('[\\s-]+')}\\b${NOT_BEFORE_CODE}`,
        'gi',
      ),
      canonical: rule.canonical,
    }));
}

let compiled: CompiledRule[] | null = null;

function matcher(): CompiledRule[] {
  if (compiled === null) compiled = compile(TERM_RULES);
  return compiled;
}

/**
 * Rewrite recognised technical terms to their canonical spelling.
 *
 * Idempotent: text that is already correct passes through unchanged, because
 * each rule also matches its own canonical form case-insensitively.
 *
 * A replacement is a plain function rather than a string so a canonical
 * containing `$` could never be read as a capture-group reference.
 */
export function fixTechnicalTerms(text: string): string {
  if (!text) return text;
  let out = text;
  for (const { pattern, canonical } of matcher()) {
    out = out.replace(pattern, () => canonical);
  }
  return out;
}

export interface TermCorrection {
  from: string;
  to: string;
  count: number;
}

/**
 * Report what `fixTechnicalTerms` would change, without changing it.
 *
 * Exists so the correction is auditable — a reader who disagrees with a rule
 * can see it fired rather than wondering whether the lecturer said "Jupiter".
 */
export function listCorrections(text: string): TermCorrection[] {
  const found = new Map<string, TermCorrection>();
  let remaining = text;

  for (const { pattern, canonical } of matcher()) {
    const matches = remaining.match(pattern);
    if (!matches) continue;

    for (const match of matches) {
      // A rule whose canonical form is already present changed nothing.
      if (match === canonical) continue;
      const key = `${match.toLowerCase()}->${canonical}`;
      const existing = found.get(key);
      if (existing) existing.count += 1;
      else found.set(key, { from: match, to: canonical, count: 1 });
    }

    // Consume the match so a shorter rule cannot also claim part of it.
    remaining = remaining.replace(pattern, () => canonical);
  }

  return [...found.values()].sort((a, b) => b.count - a.count);
}
