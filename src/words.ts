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
function processLargeArrayAsyncAndUpdate(
  array: Array<any>,
  fn: any,
  obj: Record<string, any>,
  setState: (value: any) => void,
  maxTimePerChunk = 400
) {
  function now() {
    return new Date().getTime();
  }
  let index = 0;
  function doChunk() {
    let startTime = now();
    while (index < array.length && now() - startTime <= maxTimePerChunk) {
      fn(array[index], index, array);
      ++index;
    }
    if (index < array.length) {
      setTimeout(doChunk, 1);
    }
    const result: any = {};
    Object.entries(obj).forEach(([k, v]) => {
      let sum = 0;
      for (const val of Object.values(v)) {
        const px = (val as number) / array.length;
        sum += px * Math.log2(1 / px);
      }
      result[k] = sum;
    });

    const inOrder = Object.entries(result).sort(function (a: any, b: any) {
      return b[1] - a[1];
    });
    setState(inOrder);
  }
  doChunk();
}

export async function withScoreNonBlockingUpdatingAsGoing(
  setState: any,
  possibleWords = WORDLIST.Dictionnaire,
  displayStatus: (status: string) => void,
  key?: string
) {
  const obj: Record<string, any> = {};

  processLargeArrayAsyncAndUpdate(
    possibleWords,
    (source: string, index: number, array: string[]) => {
      obj[source] = {};
      displayStatus(`${index + 1}/${array.length}`);

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
    obj,
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
