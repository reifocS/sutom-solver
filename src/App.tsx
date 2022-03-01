import React, { useState, useEffect } from "react";
import WORDLIST from "./wordlist";
import { FixedSizeList as List } from "react-window";

import { getPossibleWords, PatternArray, withScore } from "./words";

const colorMap = {
  0: "#0077C7",
  1: "#FFBD00",
  2: "#E7002A",
  [-1]: "",
};

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
      style={{
        backgroundColor: "lightgray",
        borderColor: "lightgray",
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
      <Button onKey={onKey} key="enter" buttonKey="Enter">
        Enter
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
      <Button onKey={onKey} key="backspace" buttonKey="Backspace">
        Backspace
      </Button>
    );
  }
  return <div>{buttons}</div>;
}

function Keyboard({ onKey }: KeyboardProps) {
  return (
    <div className="keyboard" id="keyboard">
      <KeyboardRow letters="qwertyuiop" onKey={onKey} isLast={false} />
      <KeyboardRow letters="asdfghjkl" onKey={onKey} isLast={false} />
      <KeyboardRow letters="zxcvbnm" onKey={onKey} isLast={true} />
    </div>
  );
}

function Cell({ letter, color }: CellProps) {
  return (
    <div
      className="cell"
      style={{
        backgroundColor: colorMap[color ?? -1],
        padding: "15px",
        border: "1px solid",
        margin: "5px",
      }}
    >
      {letter}
    </div>
  );
}

function Row({ word, length, patterns }: RowProps) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
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

  const [openers, setOpeners] = useState<Array<[string, unknown]>>([]);
  const possiblesWordsOnly = possibleWords.map(([k]) => k);

  function check() {
    if (currentAttempt.length < 5 || patterns.length < length.length) {
      return;
    }
    let possibles = possiblesWordsOnly;
    // first guess
    if (history.length === 0) {
      possibles = WORDLIST.Dictionnaire.filter(
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
    const possibilitiesWithScore = withScore(possibilities);
    setPossibleWords(possibilitiesWithScore);
  }

  function bestFirstGuess(letter: string, length: number) {
    const possibilitiesWithScore = withScore(
      WORDLIST.Dictionnaire.filter(
        (m) => m.startsWith(letter.toUpperCase()) && m.length === length
      ),
      letter.toUpperCase() + "-" + length
    );
    setOpeners(possibilitiesWithScore);
  }

  async function handleKey(key: string) {
    let letter = key.toLowerCase();
    if (letter === "enter") {
      if (currentAttempt.length < 5 || patterns.length < length.length) {
        return;
      }

      let newHistory = [
        ...history,
        {
          currentAttempt,
          patterns,
        },
      ];
      check();
      setHistory(newHistory);
      setCurrentAttempt("");
      setPatterns([]);
    } else if (letter === "backspace") {
      if (patterns.length > 0) {
        setPatterns(patterns.slice(0, patterns.length - 1));
      } else {
        setCurrentAttempt(currentAttempt.slice(0, currentAttempt.length - 1));
      }
    } else if (letter === "+" && history.length === 0) {
      setLength((prev) => [...prev, 0]);
    } else if (letter === "-" && history.length === 0) {
      if (currentAttempt.length >= length.length) {
        setCurrentAttempt((prev) => prev.slice(0, -1));
      }
      if (patterns.length >= length.length) {
        setPatterns((prev) => prev.slice(0, -1));
      }
      setLength((prev) => prev.slice(0, -1));
    } else if (/^[a-z]$/.test(letter)) {
      if (currentAttempt.length < length.length) {
        /*
        if (currentAttempt.length === 0 && history.length === 0) {
          bestFirstGuess(letter, length.length);
        }
        */
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
    <div className="App">
      <div>
        <h1>SUTOM helper</h1>
        <p>Assistance to solve the french version of wordle</p>
        <p>Type the first letter to see best opener</p>
        <div className="controls">
          <button
            disabled={history.length > 0 || length.length === 9}
            onClick={() => {
              setLength((prev) => [...prev, 0]);
              /*
            if (currentAttempt.length === 1 && history.length === 0) {
              bestFirstGuess(currentAttempt[0], length.length + 1);
            }
            */
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
              /*
            if (currentAttempt.length === 1 && history.length === 0) {
              bestFirstGuess(currentAttempt[0], length.length - 1);
            }
            */
            }}
          >
            - letter
          </button>
          <button onClick={() => check()}>check</button>
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
            <code>"y"</code> for wrong place,
            <code>"g"</code> for good and <code>"n"</code> for not present
          </small>
          <p>Possible words:</p>
          <List
            height={200}
            className="List"
            itemCount={possiblesWordsOnly.length}
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
          <input
            onChange={(e) => {
              if (e.target.value) {
                setFirstLetter(e.target.value);
              }
            }}
            type="text"
            name="first letter"
            value={firstLetter}
            maxLength={1}
            pattern="[A-Za-z]"
            title="First letter of the word to guess"
          />
          <input
            onChange={(e) => {
              if (e.target.value) {
                setOpenerLength(+e.target.value);
              }
            }}
            type="number"
            name="lenght"
            value={openerLength}
            min={6}
            max={9}
            title="Number of letters of the word to guess"
          />
          <button
            onClick={() => {
              if (firstLetter && openerLength) {
                bestFirstGuess(firstLetter, openerLength);
              }
            }}
          >
            Find openers
          </button>
        </div>
        <List
          height={200}
          className="List"
          itemCount={openers.length}
          itemSize={35}
          width={300}
        >
          {RowVirtualizedOpeners}
        </List>
      </div>
    </div>
  );
}
