/**
 * Fetch and convert the local search model into public/models/.
 *
 * The model is `minishlab/potion-base-8M`, a Model2Vec static embedding model:
 * a distilled lookup table rather than a network. Embedding a piece of text is
 * "tokenize, look up each token's vector, average" — no ONNX, no WebAssembly,
 * no inference runtime of any kind. That is the entire reason it was chosen
 * over a transformer: it removes the machinery, not just some of the bytes.
 *
 * The weights are a build input and are not committed. Run this once, or via
 * `npm run fetch:model`, before building the extension.
 *
 * Output (public/models/search/):
 *   embeddings.bin  raw little-endian Float32, vocabSize * dims
 *   vocab.json      token strings in id order, plus tokenizer settings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MODEL_ID = 'minishlab/potion-base-8M';
const REVISION = 'main';
const DEST = path.join(ROOT, 'public', 'models', 'search');

function humanSize(bytes) {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

async function download(file) {
  const url = `https://huggingface.co/${MODEL_ID}/resolve/${REVISION}/${file}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${file}: HTTP ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Parse a safetensors buffer.
 *
 * The format is deliberately simple: a little-endian u64 header length, that
 * many bytes of JSON describing each tensor, then the raw tensor bytes. Which
 * is why we can read it here without a dependency.
 */
function parseSafetensors(buffer) {
  const headerLength = Number(buffer.readBigUInt64LE(0));
  const header = JSON.parse(buffer.subarray(8, 8 + headerLength).toString('utf8'));
  const dataStart = 8 + headerLength;

  const name = Object.keys(header).find((key) => key !== '__metadata__');
  if (!name) throw new Error('No tensor found in model.safetensors');

  const { dtype, shape, data_offsets: offsets } = header[name];
  if (dtype !== 'F32') {
    throw new Error(`Expected an F32 tensor, got ${dtype}. Conversion would need updating.`);
  }
  if (shape.length !== 2) {
    throw new Error(`Expected a 2-D embedding table, got shape [${shape}].`);
  }

  const bytes = buffer.subarray(dataStart + offsets[0], dataStart + offsets[1]);
  return { name, shape, bytes };
}

/**
 * Pull the pieces we need out of a Hugging Face tokenizer.json.
 *
 * Only the vocabulary and a few normaliser flags matter — the WordPiece
 * algorithm itself lives in the extension.
 */
function extractTokenizer(tokenizerJson) {
  const model = tokenizerJson.model;
  if (!model?.vocab) throw new Error('tokenizer.json has no vocab');

  const vocab = new Array(Object.keys(model.vocab).length);
  for (const [token, id] of Object.entries(model.vocab)) vocab[id] = token;

  // Casing is not cosmetic here: this vocab is lowercase-only ("the" exists,
  // "The" does not), so failing to lowercase sends almost every word to [UNK]
  // and produces embeddings that are confidently meaningless.
  //
  // Two shapes have to be handled. `BertNormalizer` carries `lowercase` as a
  // *property*, while a `Sequence` carries a list containing a `Lowercase`
  // entry. Reading only one of them is how this was wrong the first time.
  const normalizer = tokenizerJson.normalizer ?? {};
  const parts = normalizer.type === 'Sequence' ? (normalizer.normalizers ?? []) : [normalizer];

  const lowercase = parts.some((n) => n?.type === 'Lowercase' || n?.lowercase === true);

  // In the HF tokenizers convention a null `strip_accents` on a BertNormalizer
  // means "follow lowercase".
  const stripAccents = parts.some((n) => {
    if (n?.type === 'StripAccents') return true;
    if (n?.strip_accents === true) return true;
    if (n?.type === 'BertNormalizer' && n.strip_accents == null) return n.lowercase === true;
    return false;
  });

  const handleChineseChars = parts.some((n) => n?.handle_chinese_chars === true);

  if (!lowercase) {
    // Loud, because the failure it prevents is silent.
    console.warn('  ! Tokenizer reports no lowercasing — verify this is correct for the model.');
  }

  return {
    vocab,
    unkToken: model.unk_token ?? '[UNK]',
    continuingPrefix: model.continuing_subword_prefix ?? '##',
    maxInputCharsPerWord: model.max_input_chars_per_word ?? 100,
    lowercase,
    stripAccents,
    handleChineseChars,
  };
}

async function main() {
  console.log(`Fetching ${MODEL_ID} ...`);
  fs.mkdirSync(DEST, { recursive: true });

  const [safetensors, tokenizerRaw, configRaw] = await Promise.all([
    download('model.safetensors'),
    download('tokenizer.json'),
    download('config.json'),
  ]);
  console.log(`  + model.safetensors (${humanSize(safetensors.length)})`);
  console.log(`  + tokenizer.json (${humanSize(tokenizerRaw.length)})`);

  const config = JSON.parse(configRaw.toString('utf8'));
  const { shape, bytes } = parseSafetensors(safetensors);
  const [vocabSize, dims] = shape;

  const tokenizer = extractTokenizer(JSON.parse(tokenizerRaw.toString('utf8')));
  if (tokenizer.vocab.length !== vocabSize) {
    throw new Error(
      `Vocab size mismatch: tokenizer has ${tokenizer.vocab.length}, embeddings have ${vocabSize}.`,
    );
  }

  fs.writeFileSync(path.join(DEST, 'embeddings.bin'), bytes);
  fs.writeFileSync(
    path.join(DEST, 'vocab.json'),
    JSON.stringify({
      modelId: MODEL_ID,
      vocabSize,
      dims,
      normalize: config.normalize !== false,
      ...tokenizer,
    }),
  );

  const total = bytes.length + fs.statSync(path.join(DEST, 'vocab.json')).size;
  console.log(`\nWrote public/models/search/ — ${vocabSize} tokens x ${dims} dims`);
  console.log(`Total ${humanSize(total)}. No inference runtime required.`);
}

main().catch((error) => {
  console.error('\nCould not prepare the search model:', error.message);
  console.error('Semantic search will be unavailable until this succeeds.');
  process.exit(1);
});
