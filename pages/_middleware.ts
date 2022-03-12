import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import wordWithFreq from "../public/withfreq.json";
import LRU from "lru-cache";

const cache = new LRU({
  max: 500,
  ttl: 1000 * 60 * 5,
});

const onlyWords = Object.keys(wordWithFreq).filter(
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

const ALLWORDS = new Set(Object.keys(wordWithFreq));

function initGame() {
  const gameId = "id" + Math.random().toString(16).slice(2);
  const wordToGuess = onlyWords[Math.floor(Math.random() * onlyWords.length)];
  cache.set(gameId, wordToGuess);
  return NextResponse.json({
    firstLetter: wordToGuess[0],
    length: wordToGuess.length,
  }).cookie("sutom-solver", gameId, {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: "lax",
  });
}

export default async function middleware(
  req: NextRequest
): Promise<NextResponse> {
  const cookieFromRequest = req.cookies["sutom-solver"];
  if (req.nextUrl.pathname === "/init") {
    console.log(cookieFromRequest);
    if (cookieFromRequest && cache.get(cookieFromRequest)) {
      const wordToGuess = cache.get(cookieFromRequest);
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

  /*
  if (req.nextUrl.pathname === "/check") {
    const wordToGuess = cache.get(cookieFromRequest);
    const word = req.nextUrl.searchParams.get("word").toUpperCase();
    const currentPossibilities = req.body;
    console.log(req);
    console.log(currentPossibilities);
    if (!ALLWORDS.has(word)) {
      return NextResponse.json({ error: "unknown_word" });
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
