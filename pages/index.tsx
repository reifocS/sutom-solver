import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import Link from "next/link";
import { wordWithFreq } from "../utils/parseDict";
import {
  getPossibleWords,
  PatternArray,
  withScore,
  withScoreNonBlockingUpdatingAsGoing,
} from "../utils/words";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { AiOutlineEnter } from "react-icons/ai";

const colorMap = {
  0: "#0077C7",
  1: "#FFBD00",
  2: "#E7002A",
  [-1]: "#667",
};

type ProgressBarProps = {
  actual: string;
};
function inPercent(prog: string) {
  if (!prog) return 0;
  let [curr, max] = prog.split("/");
  let actual = Number(curr);
  let maxi = Number(max);
  return (maxi - (maxi - actual)) / maxi;
}

export function ProgressBar(props: ProgressBarProps) {
  const { actual } = props;
  const percent = inPercent(actual) * 100;
  return <progress value={percent.toString()} max="100" />;
}

type RowProps = {
  word: string;
  length: Array<any>;
  patterns: PatternArray;
};

type ButtonProps = {
  buttonKey: string;
  children: React.ReactChild;
  onKey: (s: string) => void;
};

function Button({ buttonKey, children, onKey }: ButtonProps) {
  return (
    <button
      className="button"
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
};

type KeyboardRowProps = {
  onKey: (s: string) => void;
  letters: string;
  isLast: boolean;
};

function KeyboardRow({ letters, isLast, onKey }: KeyboardRowProps) {
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
      <Button onKey={onKey} key={letter} buttonKey={letter}>
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

function Keyboard({ onKey }: KeyboardProps) {
  return (
    <div className="keyboard" id="keyboard">
      <KeyboardRow letters="azertyuiop" onKey={onKey} isLast={false} />
      <KeyboardRow letters="qsdfghjklm" onKey={onKey} isLast={false} />
      <KeyboardRow letters="wxcvbn" onKey={onKey} isLast={true} />
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

export default function App() {
  const [patterns, setPatterns] = useState<PatternArray>([]);
  const [currentAttempt, setCurrentAttempt] = useState("");
  const [possibleWords, setPossibleWords] = useState<Array<[string, unknown]>>(
    []
  );
  const [length, setLength] = useState([0, 0, 0, 0, 0, 0]);
  const [history, setHistory] = useState<Array<any>>([]);
  const [firstLetter, setFirstLetter] = useState("");
  const [openerLength, setOpenerLength] = useState(6);
  const [loading, setLoading] = useState("");

  const [openers, setOpeners] = useState<Array<[string, unknown]>>([]);

  const WORDLIST = React.useMemo(() => {
    return Object.keys(wordWithFreq);
  }, []);

  function check() {
    if (currentAttempt.length < 5 || patterns.length < length.length) {
      throw new Error("How?");
    }
    let possibles = possibleWords.map(([k]) => k);
    // first guess
    if (history.length === 0) {
      possibles = WORDLIST.filter(
        (m) =>
          m.startsWith(currentAttempt[0].toUpperCase()) &&
          m.length === length.length
      );
    }
    const possibilities = getPossibleWords(
      currentAttempt.toUpperCase(),
      patterns,
      possibles
    );
    const possibilitiesWithScore = withScore(possibilities, wordWithFreq);
    setPossibleWords(possibilitiesWithScore);
    let newHistory = [
      ...history,
      {
        currentAttempt,
        patterns,
      },
    ];
    setHistory(newHistory);
    setCurrentAttempt("");
    setPatterns([]);
  }

  async function bestFirstGuess(letter: string, length: number) {
    /*const possibilitiesWithoutScore = WORDLIST.filter(
      (m) => m.startsWith(letter.toUpperCase()) && m.length === length
    );

    withScoreNonBlockingUpdatingAsGoing(
      setOpeners,
      possibilitiesWithoutScore,
      (status: string) => setLoading(status)
    );*/
    const key = `${letter.toUpperCase()}-${length}`;
    const { data } = await import(`../public/precomputed/${key}.json`);
    setOpeners(data);
  }

  async function handleKey(key: string) {
    let letter = key.toLowerCase();
    if (letter === "enter") {
      if (currentAttempt.length < 5 || patterns.length < length.length) {
        return;
      }
      check();
    } else if (letter === "backspace") {
      if (patterns.length > 0) {
        setPatterns(patterns.slice(0, patterns.length - 1));
      } else {
        setCurrentAttempt(currentAttempt.slice(0, currentAttempt.length - 1));
      }
    } else if (letter === "+" && history.length === 0 && length.length < 9) {
      setLength((prev) => [...prev, 0]);
    } else if (letter === "-" && history.length === 0 && length.length > 6) {
      if (currentAttempt.length >= length.length) {
        setCurrentAttempt((prev) => prev.slice(0, -1));
      }
      if (patterns.length >= length.length) {
        setPatterns((prev) => prev.slice(0, -1));
      }
      setLength((prev) => prev.slice(0, -1));
    } else if (/^[a-z]$/.test(letter)) {
      if (currentAttempt.length < length.length) {
        setCurrentAttempt(currentAttempt + letter);
      } else {
        if (patterns.length < length.length) {
          switch (letter) {
            case "g":
              setPatterns((prev) => [...prev, 2]);
              break;
            case "n":
              setPatterns((prev) => [...prev, 0]);
              break;
            case "y":
              setPatterns((prev) => [...prev, 1]);
              break;
            default:
              break;
          }
        }
      }
    }
  }
  function handleKeyDown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    handleKey(e.key);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const RowVirtualized = ({ index, style }: { index: number; style: any }) => (
    <div className={index % 2 ? "ListItemOdd" : "ListItemEven"} style={style}>
      {`${possibleWords[index]}`}
    </div>
  );

  const RowVirtualizedOpeners = ({
    index,
    style,
  }: {
    index: number;
    style: any;
  }) => (
    <div className={index % 2 ? "ListItemOdd" : "ListItemEven"} style={style}>
      {`${openers[index]}`}
    </div>
  );

  return (
    <div>
      <nav>
        <Link href={"/interactive"}>Interactive version</Link>{" "}
      </nav>
      <div className="App">
        <div>
          <h1>SUTOM helper</h1>
          <p>Assistance to solve the french version of wordle</p>
          <div className="controls">
            <button
              disabled={history.length > 0 || length.length === 9}
              onClick={() => {
                setLength((prev) => [...prev, 0]);
              }}
            >
              + letter
            </button>
            <button
              disabled={history.length > 0 || length.length === 6}
              onClick={() => {
                if (currentAttempt.length >= length.length) {
                  setCurrentAttempt((prev) => prev.slice(0, -1));
                }
                if (patterns.length >= length.length) {
                  setPatterns((prev) => prev.slice(0, -1));
                }
                setLength((prev) => prev.slice(0, -1));
              }}
            >
              - letter
            </button>
            <button
              disabled={
                currentAttempt.length < 5 || patterns.length < length.length
              }
              onClick={() => {
                check();
              }}
            >
              check
            </button>
            <button
              onClick={() => {
                setHistory([]);
                setCurrentAttempt("");
                setPatterns([]);
                setPossibleWords([]);
              }}
            >
              reset
            </button>
          </div>
          <br />
          {history.map(({ currentAttempt, patterns }, index) => (
            <Row
              key={index}
              word={currentAttempt.toUpperCase()}
              length={length}
              patterns={patterns}
            />
          ))}
          <Row
            key={"current"}
            word={currentAttempt.toUpperCase()}
            length={length}
            patterns={patterns}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <small>
              <code>&quot;y&quot;</code> for wrong place,
              <code>&quot;g&quot;</code> for good and <code>&quot;n&quot;</code>{" "}
              for not present
            </small>
            <p>Possible words:</p>
            <List
              height={225}
              className="List"
              itemCount={possibleWords.length}
              itemSize={35}
              width={300}
            >
              {RowVirtualized}
            </List>
          </div>
          <Keyboard onKey={handleKey} />
        </div>
        <div className="openers">
          <h1>Find best opener</h1>
          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (firstLetter && openerLength) {
                  bestFirstGuess(firstLetter, openerLength);
                }
              }}
            >
              <input
                onChange={(e) => {
                  setFirstLetter(e.target.value);
                }}
                type="text"
                name="first letter"
                placeholder="first letter"
                autoComplete="off"
                value={firstLetter}
                maxLength={1}
                style={{
                  width: 40,
                }}
                pattern="[A-Za-z]"
                title="First letter of the word to guess"
              />
              <input
                onChange={(e) => {
                  setOpenerLength(+e.target.value);
                }}
                type="number"
                name="lenght"
                min={6}
                max={9}
                value={openerLength}
                title="Number of letters of the word to guess"
              />
              <button
                type="submit"
                disabled={
                  loading !== "" &&
                  loading.split("/")[0] !== loading.split("/")[1]
                }
              >
                Find openers
              </button>
            </form>
          </div>
          {loading && (
            <div className="progressbar">
              <ProgressBar actual={loading} />
              {loading}
            </div>
          )}
          <List
            height={400}
            className="List"
            itemCount={openers.length}
            itemSize={35}
            width={300}
          >
            {RowVirtualizedOpeners}
          </List>
        </div>
      </div>
    </div>
  );
}
