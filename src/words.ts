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

export function withScore(possibleWords = WORDLIST.Dictionnaire) {
    console.log(possibleWords)
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
  /*
  Object.values(obj).forEach((v) => {
    let sum = 0;
    for (const val of Object.values(v)) {
        sum += val as number;
    }
    console.log(sum)
  })
  */

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
  return inOrder;
}
//console.log(withScore( WORDLIST.Dictionnaire.filter(m => m.startsWith("A") && m.length === 6)))