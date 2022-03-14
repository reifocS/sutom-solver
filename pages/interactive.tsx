import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { AiOutlineEnter } from "react-icons/ai";
import { MdOutlineKeyboardBackspace, MdOutlineReplay } from "react-icons/md";
import { RiEyeCloseLine, RiEyeLine as EyeOpen } from "react-icons/ri";
import { wordWithFreq, onlyWords } from "../utils/parseDict";
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
  pattern: PatternArray;
  firstLetter: string;
  solved: boolean;
  foundIndex?: Map<number, string>;
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

function Cell({ letter, color, index, solved, foundIndex }: CellProps) {
  const bgColor = colorMap[color];
  let content;
  let displayFound = false;
  if (foundIndex && foundIndex.has(index)) {
    displayFound = true;
  }
  if (letter) {
    content = letter;
  } else if (displayFound) {
    content = foundIndex.get(index);
  } else {
    content = <div style={{ opacity: 0 }}>X</div>;
  }
  return (
    <div
      className={"cell" + (solved ? " solved" : "") + (letter ? " filled" : "")}
    >
      <div
        className="surface"
        style={{
          transitionDelay: index * 100 + "ms",
        }}
      >
        <div
          className="front"
          style={{
            backgroundColor: "black",
            borderColor: letter ? "#667" : "",
          }}
        >
          {content}
        </div>
        <div
          className="back"
          style={{
            backgroundColor: bgColor,
            borderColor: bgColor,
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

function Row({ word, length, pattern, solved, foundIndex }: RowProps) {
  return (
    <div>
      {length.map((_, i) => {
        return (
          <Cell
            key={i}
            letter={word[i]}
            color={pattern[i]}
            solved={solved}
            index={i}
            foundIndex={foundIndex}
          />
        );
      })}
    </div>
  );
}

type CellProps = {
  letter?: string;
  color?: 0 | 1 | 2;
  index: number;
  solved: boolean;
  foundIndex?: Map<number, string>;
};

type StateHistory = Array<Attempt>;

type Attempt = {
  currentAttempt: string;
  pattern: PatternArray;
};

type GridProps = {
  history: StateHistory;
  currentAttempt: string;
  firstLetter: string;
  wordLength: any[];
  gameId: number;
  foundIndex: Map<number, string>;
};

function Grid({
  history,
  currentAttempt,
  firstLetter,
  wordLength,
  gameId,
  foundIndex,
}: GridProps) {
  let rows = [];
  for (let i = 0; i < 6; i++) {
    if (i < history.length) {
      rows.push(
        <Row
          key={`${gameId}-${i}`}
          pattern={history[i].pattern}
          word={history[i].currentAttempt}
          solved={true}
          length={wordLength}
          firstLetter={firstLetter}
        />
      );
    } else if (i === history.length) {
      rows.push(
        <Row
          key={`${gameId}-${i}`}
          firstLetter={firstLetter}
          word={currentAttempt.toUpperCase()}
          length={wordLength}
          solved={false}
          foundIndex={foundIndex}
          pattern={[]}
        />
      );
    } else {
      rows.push(
        <Row
          key={`${gameId}-${i}`}
          firstLetter={firstLetter}
          word={firstLetter}
          length={wordLength}
          solved={false}
          pattern={[]}
        />
      );
    }
  }
  return <div id="grid">{rows}</div>;
}

export default function App() {
  const length = onlyWords.length;
  const [wordToGuess, setWordToGuess] = useState(
    () => onlyWords[Math.floor(Math.random() * length)]
  );
  const [loading, setLoading] = useState(false);
  const [possibleWords, setPossibleWords] = useState<[string, unknown][]>([]);
  const [history, setHistory] = useState<StateHistory>([]);
  const [currentAttempt, setCurrentAttempt] = useState(wordToGuess[0]);
  const [spoilerOn, showSpoiler] = useState(false);
  const [gameId, setGameId] = useState(() => new Date().getTime());
  const [tamponFirst, setTamponFirst] = useState(true);

  let wordLength: string[] = [];
  const ALLWORDS = React.useMemo(() => {
    return new Set(Object.keys(wordWithFreq));
  }, [wordWithFreq]);
  for (let i = 0; i < wordToGuess.length; ++i) {
    wordLength.push("");
  }

  useEffect(() => {
    const firstLetter = wordToGuess[0];
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
    setTamponFirst(true);
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
      if (
        currentAttempt.length === 1 &&
        letter.toUpperCase() === wordToGuess[0].toUpperCase() &&
        tamponFirst
      ) {
        setTamponFirst(false);
        return;
      }
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
    setTamponFirst(true);
    setGameId(new Date().getTime());
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
        map.set(key.toLowerCase(), getBetterColor(color, bestColor));
      }
    }

    return map;
  }

  function calculateFoundIndex(history: StateHistory): Map<number, string> {
    const found = new Map<number, string>();
    for (let { currentAttempt: attempt, pattern } of history) {
      for (let i = 0; i < attempt.length; i++) {
        let key = pattern[i];
        if (key === 2) {
          found.set(i, attempt[i]);
        }
      }
    }
    return found;
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

  const foundIndex = calculateFoundIndex(history);
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
          <Grid
            history={history}
            foundIndex={foundIndex}
            currentAttempt={currentAttempt}
            firstLetter={wordToGuess[0]}
            wordLength={wordLength}
            gameId={gameId}
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
