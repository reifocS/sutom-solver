import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { AiOutlineEnter } from "react-icons/ai";
import { MdOutlineKeyboardBackspace, MdOutlineReplay } from "react-icons/md";
import { RiEyeCloseLine, RiEyeLine as EyeOpen } from "react-icons/ri";

import {
  getPattern,
  getPossibleWords,
  PatternArray,
  withScore,
} from "../utils/words";
import Link from "next/link";

let GREY = 0;
let RED = 2;
let YELLOW = 1;

const colorMap = {
  0: "#0077C7",
  1: "#FFBD00",
  2: "#E7002A",
  [-1]: "",
  undefined: "black",
};

const colorMapKeyboard = {
  0: "rgb(112, 112, 112)",
  1: "#FFBD00",
  2: "#E7002A",
  [-1]: "",
  undefined: "black",
};

type RowProps = {
  word: string;
  length: Array<any>;
  patterns: PatternArray;
  firstLetter: string;
};

type ButtonProps = {
  buttonKey: string;
  children: React.ReactChild;
  onKey: (s: string) => void;
  color?: string;
};

function Button({ buttonKey, children, onKey, color }: ButtonProps) {
  return (
    <button
      className="button"
      style={{
        backgroundColor: color ? color : "black",
      }}
      onClick={() => {
        onKey(buttonKey);
      }}
    >
      {children}
    </button>
  );
}

type KeyboardProps = {
  onKey: (s: string) => void;
  bestColors: Map<string, number>;
};

type KeyboardRowProps = {
  onKey: (s: string) => void;
  letters: string;
  isLast: boolean;
  bestColors: Map<string, number>;
};

function KeyboardRow({ letters, isLast, onKey, bestColors }: KeyboardRowProps) {
  let buttons = [];
  if (isLast) {
    buttons.push(
      <Button onKey={onKey} key="backspace" buttonKey="Backspace">
        <MdOutlineKeyboardBackspace />
      </Button>
    );
  }
  for (let letter of letters.split("")) {
    buttons.push(
      <Button
        onKey={onKey}
        key={letter}
        buttonKey={letter}
        color={colorMapKeyboard[bestColors.get(letter)]}
      >
        {letter}
      </Button>
    );
  }
  if (isLast) {
    buttons.push(
      <Button onKey={onKey} key="enter" buttonKey="Enter">
        <AiOutlineEnter />
      </Button>
    );
  }
  return <div>{buttons}</div>;
}

function Keyboard({ onKey, bestColors }: KeyboardProps) {
  return (
    <div className="keyboard" id="keyboard">
      <KeyboardRow
        letters="azertyuiop"
        onKey={onKey}
        isLast={false}
        bestColors={bestColors}
      />
      <KeyboardRow
        letters="qsdfghjklm"
        onKey={onKey}
        isLast={false}
        bestColors={bestColors}
      />
      <KeyboardRow
        letters="wxcvbn"
        onKey={onKey}
        isLast={true}
        bestColors={bestColors}
      />
    </div>
  );
}

function Cell({ letter, color }: CellProps) {
  return (
    <div
      className="cell"
      style={{
        backgroundColor: colorMap[color ?? -1],
      }}
    >
      {letter}
    </div>
  );
}

function Row({ word, length, patterns }: RowProps) {
  return (
    <div
      style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}
    >
      {length.map((_, i) => {
        return <Cell key={i} letter={word[i]} color={patterns[i]} />;
      })}
    </div>
  );
}

type CellProps = {
  letter?: string;
  color?: 0 | 1 | 2;
};

type StateHistory = Array<{
  currentAttempt: string;
  pattern: PatternArray;
}>;

export default function App({ onlyWords, wordWithFreq }) {
  const length = onlyWords.length;
  const [wordToGuess, setWordToGuess] = useState(
    () => onlyWords[Math.floor(Math.random() * length)]
  );
  const [loading, setLoading] = useState(false);
  const [possibleWords, setPossibleWords] = useState<[string, unknown][]>([]);
  const [history, setHistory] = useState<StateHistory>([]);
  const [currentAttempt, setCurrentAttempt] = useState(wordToGuess[0]);
  const [spoilerOn, showSpoiler] = useState(false);

  let wordLength: string[] = [];
  const ALLWORDS = React.useMemo(() => {
    return new Set(Object.keys(wordWithFreq));
  }, [wordWithFreq]);
  for (let i = 0; i < wordToGuess.length; ++i) {
    wordLength.push("");
  }

  useEffect(() => {
    const firstLetter = wordToGuess[0].toUpperCase();
    const length = wordToGuess.length;
    const key = `${firstLetter}-${length}`;
    (async () => {
      setLoading(true);
      const { data } = await import(`../public/precomputed/${key}.json`);
      setPossibleWords(data);
      setLoading(false);
    })();
  }, [wordToGuess]);

  function check() {
    if (currentAttempt.length < wordLength.length) {
      throw new Error("How?");
    }

    if (!ALLWORDS.has(currentAttempt.toUpperCase())) {
      console.log(onlyWords);
      alert("Mot non valide");
      return;
    }

    let possibles =
      history.length === 0 ? onlyWords : possibleWords.map((v) => v[0]);
    const pattern = getPattern(currentAttempt, wordToGuess);
    const possibilities = getPossibleWords(
      currentAttempt.toUpperCase(),
      pattern,
      possibles
    );
    const possibilitiesWithScore = withScore(possibilities, wordWithFreq);
    setPossibleWords(possibilitiesWithScore);
    let newHistory = [
      ...history,
      {
        currentAttempt,
        pattern,
      },
    ];
    setHistory(newHistory);
    setCurrentAttempt(wordToGuess[0]);
    showSpoiler(false);
  }

  async function handleKey(key: string) {
    let letter = key.toLowerCase();
    if (letter === "enter") {
      if (currentAttempt.length < wordLength.length) {
        return;
      }
      check();
    } else if (letter === "backspace") {
      if (currentAttempt.length === 1) return;
      setCurrentAttempt(currentAttempt.slice(0, currentAttempt.length - 1));
    } else if (/^[a-z]$/.test(letter)) {
      if (currentAttempt.length < wordLength.length) {
        setCurrentAttempt(currentAttempt + letter);
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    handleKey(e.key);
  }

  function reset() {
    const word = onlyWords[Math.floor(Math.random() * length)];
    setWordToGuess(word);
    setCurrentAttempt(word[0]);
    setHistory([]);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const RowVirtualized = ({ index, style }: { index: number; style: any }) => {
    const [word, score] = possibleWords[index];
    //const niceDisplay = Math.round(+(score as number) * 1000) / 1000;
    return (
      <div className={index % 2 ? "ListItemOdd" : "ListItemEven"} style={style}>
        {`${word}: ${score}`}
      </div>
    );
  };

  function calculateBestColors(history: StateHistory) {
    let map = new Map();
    for (let { currentAttempt: attempt, pattern } of history) {
      for (let i = 0; i < attempt.length; i++) {
        let color = pattern[i];
        let key = attempt[i];
        let bestColor = map.get(key);
        map.set(key, getBetterColor(color, bestColor));
      }
    }
    return map;
  }

  function getBetterColor(a, b) {
    if (a === RED || b === RED) {
      return RED;
    }
    if (a === YELLOW || b === YELLOW) {
      return YELLOW;
    }
    return GREY;
  }

  const bestColors = calculateBestColors(history);

  return (
    <div>
      <nav>
        <Link href="/">Solver</Link>{" "}
      </nav>
      <div className="App">
        <div>
          <h1>SUTOM solver interactive</h1>
          <p>Play SUTOM using information theory</p>
          <div className="controls">
            <button
              className="reset"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                reset();
              }}
            >
              <MdOutlineReplay />
            </button>
          </div>
          <br />
          {history.map(({ currentAttempt, pattern }, index) => (
            <Row
              key={index}
              firstLetter={wordToGuess[0]}
              word={currentAttempt.toUpperCase()}
              length={wordLength}
              patterns={pattern}
            />
          ))}
          <Row
            key={"current"}
            firstLetter={wordToGuess[0]}
            word={currentAttempt.toUpperCase()}
            length={wordLength}
            patterns={[]}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <p>Suggested words:</p>
            <button
              onMouseDown={(e) => e.preventDefault()}
              className="spoilers"
              onClick={() => showSpoiler((prev) => !prev)}
            >
              {spoilerOn ? <RiEyeCloseLine /> : <EyeOpen />}
            </button>
            {spoilerOn && (
              <List
                height={200}
                className="List"
                itemCount={possibleWords.length}
                itemSize={35}
                width={300}
              >
                {RowVirtualized}
              </List>
            )}
          </div>
          <Keyboard onKey={handleKey} bestColors={bestColors} />
          {loading && <p>Searching...</p>}
        </div>
      </div>
    </div>
  );
}

export async function getStaticProps() {
  const wordWithFreq = await import("../public/withfreq.json");
  const onlyWords = Object.keys(wordWithFreq.default).filter(
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
  return { props: { onlyWords, wordWithFreq: wordWithFreq.default } };
}
