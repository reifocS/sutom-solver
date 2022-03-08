import React, { useState, useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { getPattern, getPossibleWords, PatternArray, withScore } from "./words";
import { Link } from "react-router-dom";
import { onlyWords } from "./parseDict";
import wordlist from "./wordlist";

const length = onlyWords.length;

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
  firstLetter: string;
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
  const [wordToGuess, setWordToGuess] = useState(
    onlyWords[Math.floor(Math.random() * length)]
  );
  const [loading, setLoading] = useState(false);
  const [possibleWords, setPossibleWords] = useState<[string, unknown][]>([]);
  const [history, setHistory] = useState<Array<any>>([]);
  const [currentAttempt, setCurrentAttempt] = useState(wordToGuess[0]);

  let wordLength: string[] = [];
  for (let i = 0; i < wordToGuess.length; ++i) {
    wordLength.push("");
  }

  useEffect(() => {
    const firstLetter = wordToGuess[0].toUpperCase();
    const length = wordToGuess.length;
    const key = `${firstLetter}-${length}`;
    (async () => {
      setLoading(true);
      const { data } = await import(`./precomputed/${key}.json`);
      setPossibleWords(data);
      setLoading(false);
    })();
  }, [wordToGuess]);

  function check() {
    if (currentAttempt.length < wordLength.length) {
      throw new Error("How?");
    }

    if (!wordlist.Dictionnaire.includes(currentAttempt.toUpperCase())) {
      alert("Mot non valide");
      return;
    }

    let possibles =
      history.length === 0 ? wordlist.Dictionnaire : possibleWords.map((v) => v[0]);
    const pattern = getPattern(currentAttempt, wordToGuess);
    const possibilities = getPossibleWords(
      currentAttempt.toUpperCase(),
      pattern,
      possibles
    );
    const possibilitiesWithScore = withScore(possibilities);
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
  }

  async function handleKey(key: string) {
    let letter = key.toLowerCase();
    if (letter === "enter") {
      if (currentAttempt.length < 5) {
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

  return (
    <div>
      <nav
        style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          paddingBottom: "1rem",
        }}
      >
        <Link to="/">Solver</Link>{" "}
      </nav>
      <div className="App">
        <div>
          <h1>SUTOM solver interactive</h1>
          <p>Play SUTOM using information theory</p>
          <div className="controls">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                reset();
              }}
            >
              reset
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
            {loading && <p>Searching...</p>}
            <List
              height={200}
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
      </div>
    </div>
  );
}
