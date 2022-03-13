import { serialize, CookieSerializeOptions } from "cookie";
import wordWithFreq from "../../../public/withfreq.json";
import LRU from "lru-cache";
import {
  getPattern,
  getPossibleWords,
  PatternArray,
  withScore,
} from "../../../utils/words";
import { NextApiRequest, NextApiResponse } from "next";

const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 5,
});

const onlyWords = Object.keys(wordWithFreq).filter(
  (mot) =>
    mot.length >= 6 &&
    mot.length <= 9 &&
    (wordWithFreq as any)[mot] > 0.0000102 &&
    !mot.includes("!") &&
    !mot.includes(" ") &&
    !mot.includes("-") &&
    !mot.toUpperCase().startsWith("K") &&
    !mot.toUpperCase().startsWith("Q") &&
    !mot.toUpperCase().startsWith("W") &&
    !mot.toUpperCase().startsWith("X") &&
    !mot.toUpperCase().startsWith("Y") &&
    !mot.toUpperCase().startsWith("Z")
);

console.log(onlyWords.length)
const ALLWORDS = new Set(Object.keys(wordWithFreq));

function initGame(res) {
  const gameId = "id" + Math.random().toString(16).slice(2);
  const wordToGuess = onlyWords[Math.floor(Math.random() * onlyWords.length)];
  cache.set(gameId, { wordToGuess, history: [] });
  setCookie(res, "sutom-solver", gameId, {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: "lax",
  });
  res.send({ firstLetter: wordToGuess[0], length: wordToGuess.length });
}

// TODO cache possibilities
async function computePossiblesFromHistory(
  wordToGuess: string,
  history: { word: string; pattern: PatternArray }[]
) {
  // Get openers
  const firstLetter = wordToGuess[0].toUpperCase();
  const length = wordToGuess.length;
  const key = `${firstLetter}-${length}`;
  const { data } = await import(`../../../public/precomputed/${key}.json`);
  if (history.length === 0) {
    return data;
  }
  let possiblesWithScore: Array<[string, number]> = data;
  let onlyPossibles: Array<string> = possiblesWithScore.map(([k]) => k);

  for (const { word, pattern } of history) {
    onlyPossibles = getPossibleWords(word, pattern, onlyPossibles);
    possiblesWithScore = withScore(onlyPossibles, wordWithFreq);
  }
  return possiblesWithScore;
}
export const setCookie = (
  res: NextApiResponse,
  name: string,
  value: unknown,
  options: CookieSerializeOptions = {}
) => {
  const stringValue =
    typeof value === "object" ? "j:" + JSON.stringify(value) : String(value);

  if ("maxAge" in options) {
    options.expires = new Date(Date.now() + options.maxAge);
    options.maxAge /= 1000;
  }

  res.setHeader("Set-Cookie", serialize(name, stringValue, options));
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const cookieFromRequest = req.cookies["sutom-solver"];
  const cached = cache.get(cookieFromRequest);
  const wordToGuess = cached?.wordToGuess;
  const { slug } = req.query;
  const path = slug[0];

  if (path === "init") {
    if (cookieFromRequest && wordToGuess) {
      return res.send({
        firstLetter: wordToGuess[0],
        length: wordToGuess.length,
      });
    } else {
      return initGame(res);
    }
  }

  if (path === "reset") {
    res.setHeader(
      "Set-Cookie",
      "sutom-solver=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    );
    // clear cache
    cache.set(cookieFromRequest, undefined);
    return res.send({});
  }

  if (path === "possibles") {
    if (!wordToGuess) {
      return res.status(500);
    }
    const possibilities = await computePossiblesFromHistory(
      wordToGuess,
      cached.history
    );
    return res.send({
      possibilities,
    });
  }
  if (path === "check") {
    if (!wordToGuess) {
      return res.status(500);
    }
    let word = req.query.word as string;
    word = word.toUpperCase().slice(0, wordToGuess.length);
    if (word === "$") {
      return res.send({ history: cached.history ?? [] });
    }

    console.log(word, wordToGuess);
    if (wordToGuess !== word) {
      if (!ALLWORDS.has(word)) {
        return res.send({
          error: "unknown_word",
          history: cached.history,
        });
      }
    }
    const pattern = getPattern(word, wordToGuess);
    cached.history.push({
      word,
      pattern,
    });
    return res.send({ history: cached.history });
  }

  //let possibles =
  //  history.length === 0 ? onlyWords : possibleWords.map((v) => v[0]);
  //let possibles = onlyWords;
  /*const pattern = getPattern(word, wordToGuess);
    const possibilities = getPossibleWords(
      word,
      pattern,
      possibles
    );
    //const possibilitiesWithScore = withScore(possibilities, wordWithFreq);
    return NextResponse.json({ success: "valid word" });
  }*/
}
