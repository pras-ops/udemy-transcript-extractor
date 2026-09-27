import { describe, it, expect } from 'vitest';
import { fixTechnicalTerms, listCorrections, TERM_RULES } from './tech-terms';

describe('fixTechnicalTerms', () => {
  it('repairs the terms auto-captions get wrong', () => {
    expect(fixTechnicalTerms('open your Jupiter notebook')).toBe('open your Jupyter Notebook');
    expect(fixTechnicalTerms('we import numb pie as np')).toBe('we import NumPy as np');
    expect(fixTechnicalTerms('connect to my sequel')).toBe('connect to MySQL');
    expect(fixTechnicalTerms('push it to get hub')).toBe('push it to GitHub');
  });

  it('is idempotent, so correct text survives a second pass', () => {
    const once = fixTechnicalTerms('open your Jupiter notebook and import numb pie');
    expect(fixTechnicalTerms(once)).toBe(once);
    expect(once).toBe('open your Jupyter Notebook and import NumPy');
  });

  it('leaves already-canonical spellings alone', () => {
    for (const text of ['NumPy', 'PyTorch', 'MySQL', 'Node.js', 'scikit-learn']) {
      expect(fixTechnicalTerms(text)).toBe(text);
    }
  });

  it('prefers the longest phrase, so a specific rule beats a general one', () => {
    // "my sequel" has to be consumed before anything can claim "sequel".
    expect(fixTechnicalTerms('my sequel workbench')).toBe('MySQL workbench');
    // Likewise the two-word Jupyter rule before the one-word one.
    expect(fixTechnicalTerms('Jupiter notebook')).toBe('Jupyter Notebook');
  });

  it('never touches ambiguous words on their own', () => {
    // The whole reason these are only ever corrected inside a longer phrase:
    // a wrong correction puts words in the lecturer's mouth.
    expect(fixTechnicalTerms('the sequel was worse than the original')).toBe(
      'the sequel was worse than the original',
    );
    expect(fixTechnicalTerms('Jason will present next week')).toBe('Jason will present next week');
    expect(fixTechnicalTerms('I am going to go home')).toBe('I am going to go home');
  });

  it('respects word boundaries', () => {
    expect(fixTechnicalTerms('a rapid prototype')).toBe('a rapid prototype');
    expect(fixTechnicalTerms('she ate a pizza')).toBe('she ate a pizza');
  });

  it('tolerates hyphenation and extra spacing between spoken words', () => {
    expect(fixTechnicalTerms('a depth-first search')).toBe('a depth-first search');
    expect(fixTechnicalTerms('a depth first search')).toBe('a depth-first search');
    expect(fixTechnicalTerms('type  script')).toBe('TypeScript');
  });

  it('keeps complexity notation readable', () => {
    expect(fixTechnicalTerms('this runs in oh of n squared time')).toBe(
      'this runs in O(n^2) time',
    );
    expect(fixTechnicalTerms('lookup is o of one')).toBe('lookup is O(1)');
  });

  it('leaves code and URLs alone', () => {
    // A transcript quotes identifiers verbatim, and the reader intends to copy
    // and run them. Rewriting the capitalisation inside one silently breaks it.
    expect(fixTechnicalTerms('type javascript:void(0) in the bar')).toBe(
      'type javascript:void(0) in the bar',
    );
    expect(fixTechnicalTerms('call numpy.array on it')).toBe('call numpy.array on it');
    expect(fixTechnicalTerms('the mysql=true flag')).toBe('the mysql=true flag');
    expect(fixTechnicalTerms('see docs/numpy/index')).toBe('see docs/numpy/index');
  });

  it('still corrects a term at the end of a sentence', () => {
    // A trailing period is prose, not a member access.
    expect(fixTechnicalTerms('we import numb pie.')).toBe('we import NumPy.');
    expect(fixTechnicalTerms('open Jupiter notebook, then run it')).toBe(
      'open Jupyter Notebook, then run it',
    );
  });

  it('handles empty input', () => {
    expect(fixTechnicalTerms('')).toBe('');
  });

  it('does not disturb timestamps', () => {
    expect(fixTechnicalTerms('[00:12] import numb pie')).toBe('[00:12] import NumPy');
  });
});

describe('listCorrections', () => {
  it('reports what changed, so a reader can audit a rule that fired', () => {
    const corrections = listCorrections('Jupiter notebook, then numb pie');
    expect(corrections.find((c) => c.to === 'Jupyter Notebook')).toBeDefined();
    expect(corrections.find((c) => c.to === 'NumPy')).toBeDefined();
  });

  it('counts repeats', () => {
    const corrections = listCorrections('numb pie here, numb pie there');
    expect(corrections.find((c) => c.to === 'NumPy')?.count).toBe(2);
  });

  it('reports nothing for text that is already correct', () => {
    expect(listCorrections('NumPy and PyTorch and MySQL')).toEqual([]);
  });

  it('reports nothing for text with no technical terms', () => {
    expect(listCorrections('the quick brown fox')).toEqual([]);
  });
});

describe('TERM_RULES', () => {
  it('has no duplicate heard phrases, which would make one rule dead', () => {
    const heard = TERM_RULES.map((r) => r.heard);
    expect(new Set(heard).size).toBe(heard.length);
  });

  it('is lower-cased throughout, since matching is case-insensitive', () => {
    for (const rule of TERM_RULES) {
      expect(rule.heard).toBe(rule.heard.toLowerCase());
    }
  });

  it('every rule actually fires on its own heard phrase', () => {
    // Guards against a rule whose phrase can never match because a longer rule
    // always swallows it first.
    for (const rule of TERM_RULES) {
      expect(fixTechnicalTerms(rule.heard)).not.toBe(rule.heard);
    }
  });
});
