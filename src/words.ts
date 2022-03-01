import WORDLIST from "./wordlist";

export type PatternArray = Array<Pattern>;

type Pattern = 0 | 1 | 2;

export function checkConformity(
  source: string,
  target: string,
  patterns: PatternArray
) {
  if (source.length !== target.length) {
    return false;
  }
  if (source.length !== patterns.length) {
    return false;
  }
  let targetCountLetters: Record<string, number> = {};
  let sourceCountLetters: Record<string, number> = {};

  for (let i = 0; i < target.length; ++i) {
    let targetChar = target[i];
    let sourceChar = source[i];
    let pattern = patterns[i];
    if (targetCountLetters.hasOwnProperty(targetChar)) {
      targetCountLetters[targetChar]++;
    } else {
      targetCountLetters[targetChar] = 1;
    }
    if (pattern !== 0) {
      if (sourceCountLetters.hasOwnProperty(sourceChar)) {
        sourceCountLetters[sourceChar]++;
      } else {
        sourceCountLetters[sourceChar] = 1;
      }
    }
  }
  for (let i = 0; i < patterns.length; ++i) {
    const pattern = patterns[i];
    const sourceLetter = source[i];
    const targetLetter = target[i];
    switch (+pattern) {
      case 0:
        if (
          sourceCountLetters[sourceLetter] !== targetCountLetters[sourceLetter]
        ) {
          return false;
        }
        break;
      case 2:
        if (sourceLetter !== targetLetter) {
          return false;
        }
        break;
      case 1:
        if (!targetCountLetters[sourceLetter]) {
          return false;
        }
        if (sourceLetter === targetLetter) {
          return false;
        }
        if (
          sourceCountLetters[sourceLetter] > targetCountLetters[sourceLetter]
        ) {
          return false;
        }
        break;
      default:
        throw new Error("unrecognized pattern " + pattern);
    }
  }
  return true;
}

export function getPossibleWords(
  source: string,
  patterns: PatternArray,
  possibles: Array<string>
) {
  console.log("possibleWord");
  let poss: Array<string> = [];
  possibles.forEach((word) => {
    if (checkConformity(source, word, patterns)) poss.push(word);
  });
  return poss;
}

function getPattern(source: string, target: string): PatternArray {
  let patterns: PatternArray = [];
  source = source.toUpperCase();
  target = target.toUpperCase();

  let charMap: Record<string, number> = {};

  for (let i = 0; i < target.length; ++i) {
    let char = target[i];
    if (charMap.hasOwnProperty(char)) {
      charMap[char]++;
    } else {
      charMap[char] = 1;
    }
  }

  for (let position = 0; position < target.length; position++) {
    let toFind = target[position];
    let proposed = source[position];

    if (toFind === proposed) {
      charMap[toFind]--;
    }
  }

  for (let position = 0; position < target.length; position++) {
    let toFind = target[position];
    let proposed = source[position];

    let result: Pattern | undefined = undefined;

    if (toFind === proposed) {
      result = 2;
    } else if (target.includes(proposed)) {
      if (charMap[proposed] > 0) {
        result = 1;
        charMap[proposed]--;
      } else {
        result = 0;
      }
    } else {
      result = 0;
    }

    patterns.push(result);
  }

  return patterns;
}

function patternToBase3(pattern: PatternArray) {
  let result = 0;
  const size = pattern.length;
  for (let i = size - 1; i >= 0; --i) {
    let num = pattern[i];
    result += num * Math.pow(3, size - (i + 1));
  }
  return result;
}

const cache: Record<string, [string, unknown][]> = {};

export function withScore(possibleWords = WORDLIST.Dictionnaire, key?: string) {
  console.log(possibleWords.length);
  if (key && cache[key]) {
    return cache[key];
  }
  const obj: Record<string, any> = {};
  //const patterns = getAllPatterns(size);
  const nbOfWords = possibleWords.length;

  for (const source of possibleWords) {
    // the possible patterns of this word with nb of occurences
    obj[source] = {};
    for (const target of possibleWords) {
      const pattern = getPattern(source, target);
      const toBase3 = patternToBase3(pattern);
      if (obj[source][toBase3] !== undefined) {
        obj[source][toBase3] += 1;
      } else {
        obj[source][toBase3] = 1;
      }
    }
  }

  const result: any = {};
  Object.entries(obj).forEach(([k, v]) => {
    let sum = 0;
    for (const val of Object.values(v)) {
      const px = (val as number) / nbOfWords;
      sum += px * Math.log2(1 / px);
    }
    result[k] = sum;
  });

  const inOrder = Object.entries(result).sort(function (a: any, b: any) {
    return b[1] - a[1];
  });

  if (key) {
    cache[key] = inOrder;
  }
  return inOrder;
}

export const withScorePromise = (
  possibleWords = WORDLIST.Dictionnaire,
  key?: string
) =>
  new Promise<[string, unknown][]>((resolve) =>
    setTimeout(() => resolve(withScore(possibleWords, key)), 1)
  );
/*
function processLargeArrayAsync(
  array: Array<any>,
  fn: any,
  resolve: (value: unknown) => void,
  chunk = 50
) {
  let index = 0;
  function doChunk() {
    let cnt = chunk;
    while (cnt-- && index < array.length) {
      fn(array[index], index, array);
      ++index;
    }
    if (index < array.length) {
      setTimeout(doChunk, 1);
    }
    if (index === array.length) {
      resolve(1);
    }
  }
  doChunk();
}
*/
/*
export async function withScoreNonBlocking(
  possibleWords = WORDLIST.Dictionnaire,
  key?: string
) {
  const obj: Record<string, any> = {};
  const nbOfWords = possibleWords.length;

  const promise = new Promise(function (resolve) {
    processLargeArrayAsync(
      possibleWords,
      (source: string, _: number, array: string[]) => {
        // the possible patterns of this word with nb of occurences
        obj[source] = {};
        for (const target of array) {
          const pattern = getPattern(source, target);
          const toBase3 = patternToBase3(pattern);
          if (obj[source][toBase3] !== undefined) {
            obj[source][toBase3] += 1;
          } else {
            obj[source][toBase3] = 1;
          }
        }
      },
      resolve
    );
  });
  await promise;
  const result: any = {};
  Object.entries(obj).forEach(([k, v]) => {
    let sum = 0;
    for (const val of Object.values(v)) {
      const px = (val as number) / nbOfWords;
      sum += px * Math.log2(1 / px);
    }
    result[k] = sum;
  });

  const inOrder = Object.entries(result).sort(function (a: any, b: any) {
    return b[1] - a[1];
  });

  if (key) {
    cache[key] = inOrder;
  }
  return inOrder;
}
*/

// Separate the big work into async smaller works, so the main thread is not blocked.
function processWithoutBlockingAndUpdateUI(
  array: Array<any>,
  fn: (source: string, index: number) => void,
  obj: Array<[string, number]>,
  setState: (value: any) => void,
  maxTimePerChunk = 300
) {
  function now() {
    return new Date().getTime();
  }
  let index = 0;
  function doChunk() {
    let startTime = now();
    while (index < array.length && now() - startTime <= maxTimePerChunk) {
      fn(array[index], index);
      ++index;
    }
    if (index < array.length) {
      setTimeout(doChunk, 1);
    }
    setState(obj);
  }
  doChunk();
}

// O(log(n)
// binary search and splice seems to be the fastest implementation possible,
// another solution would be to use a btree instead of an array
// we profit from the fact that the given array is sorted since we built it from scratch
function sortedIndex(array: Array<[string, number]>, value: [string, number]) {
  let low = 0;
  let high = array.length;

  while (low < high) {
    let mid = (low + high) >>> 1;
    if (array[mid][1] > value[1]) low = mid + 1;
    else high = mid;
  }
  return low;
}
function insert(array: Array<[string, number]>, value: [string, number]) {
  const index = sortedIndex(array, value);
  array.splice(index, 0, value);
}

export async function withScoreNonBlockingUpdatingAsGoing(
  setState: React.Dispatch<React.SetStateAction<[string, unknown][]>>,
  possibleWords = WORDLIST.Dictionnaire,
  displayStatus: (status: string) => void
) {
  const wordsWithScore: Array<[string, number]> = [];
  const length = possibleWords.length;

  // Gets called for each word, we will then compare this word agaisnt every other word
  // so it's quite heavy O(n^2) where n is the length of possible words.

  function updater(source: string, index: number) {
    const patterns: Record<string, number> = {};

    // Update UI to show progess
    displayStatus(`${index + 1}/${length}`);

    for (const target of possibleWords) {
      const pattern = getPattern(source, target);
      const toBase3 = patternToBase3(pattern);
      if (patterns[toBase3] !== undefined) {
        patterns[toBase3] += 1;
      } else {
        patterns[toBase3] = 1;
      }
    }
    let sum = 0;

    // TODO optimize this iteration, maybe we can remove it.
    for (const val of Object.values(patterns)) {
      const px = val / length;
      sum += px * Math.log2(1 / px);
    }
    insert(wordsWithScore, [source, sum]);
  }

  processWithoutBlockingAndUpdateUI(
    possibleWords,
    updater,
    wordsWithScore,
    setState
  );
}

/*
async function benchMark() {
  let startTime, endTime;

  startTime = performance.now();

  await withScoreNonBlocking(
    WORDLIST.Dictionnaire.filter((m) => m.startsWith("A") && m.length === 6)
  );

  endTime = performance.now();

  console.log(
    `Call to withScoreNonBlocking took ${endTime - startTime} milliseconds`
  );

  startTime = performance.now();

  withScore(
    WORDLIST.Dictionnaire.filter((m) => m.startsWith("A") && m.length === 6)
  );

  endTime = performance.now();

  console.log(`Call to withScore took ${endTime - startTime} milliseconds`);
}
*/
