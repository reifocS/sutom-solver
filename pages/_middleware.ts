import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import LRU from "lru-cache";
import {
  getPattern,
  getPossibleWords,
  PatternArray,
  withScore,
} from "../utils/words";

const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 5,
});

let wordWithFreq = null;
let onlyWords = null;

const ALLWORDS = new Set(Object.keys(wordWithFreq));

function initGame() {
  const gameId = "id" + Math.random().toString(16).slice(2);
  const wordToGuess = onlyWords[Math.floor(Math.random() * onlyWords.length)];
  cache.set(gameId, { wordToGuess, history: [] });
  return NextResponse.json({
    firstLetter: wordToGuess[0],
    length: wordToGuess.length,
  }).cookie("sutom-solver", gameId, {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: "lax",
  });
}

// TODO cache possibilities too?
async function computePossiblesFromHistory(
  wordToGuess: string,
  history: { word: string; pattern: PatternArray }[]
) {
  // Get openers
  const firstLetter = wordToGuess[0].toUpperCase();
  const length = wordToGuess.length;
  const key = `${firstLetter}-${length}`;
  const { data } = await import(`../public/precomputed/${key}.json`);
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

export default async function middleware(
  req: NextRequest
): Promise<NextResponse> {
  const cookieFromRequest = req.cookies["sutom-solver"];
  const cached = cache.get(cookieFromRequest);
  const wordToGuess = cached?.wordToGuess;
  if (wordWithFreq === null) {
    wordWithFreq = await import("../public/withfreq.json");
    onlyWords = Object.keys(wordWithFreq).filter(
      (mot) =>
        mot.length >= 6 &&
        mot.length <= 9 &&
        (wordWithFreq as any)[mot] > 3.02e-6 &&
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
  }
  if (req.nextUrl.pathname === "/init") {
    if (cookieFromRequest && wordToGuess) {
      return NextResponse.json({
        firstLetter: wordToGuess[0],
        length: wordToGuess.length,
      });
    } else {
      return initGame();
    }
  }

  if (req.nextUrl.pathname === "/reset") {
    const url = req.nextUrl.clone();
    url.pathname = `/interactive`;
    const res = NextResponse.rewrite(url);
    res.clearCookie("sutom-solver");
    // clear cache
    cache.set(cookieFromRequest, undefined);
    return res;
  }

  if (req.nextUrl.pathname === "/possibles") {
    if (!wordToGuess) {
      const url = req.nextUrl.clone();
      url.pathname = "/init";
      return NextResponse.redirect(url);
    }
    const possibilities = await computePossiblesFromHistory(
      wordToGuess,
      cached.history
    );
    return NextResponse.json({
      possibilities,
    });
  }
  if (req.nextUrl.pathname === "/check") {
    if (!wordToGuess) {
      const url = req.nextUrl.clone();
      url.pathname = "/init";
      return NextResponse.redirect(url);
    }
    const word = req.nextUrl.searchParams
      .get("word")
      .toUpperCase()
      .slice(0, wordToGuess.length);
    if (word === "$") {
      return NextResponse.json({ history: cached.history ?? [] });
    }

    console.log(word, wordToGuess);
    if (wordToGuess !== word) {
      if (!ALLWORDS.has(word)) {
        return NextResponse.json({
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
    return NextResponse.json({ history: cached.history });
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
