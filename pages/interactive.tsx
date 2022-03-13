import React, { useState, useEffect, useRef } from "react";
import { FixedSizeList as List } from "react-window";
import { AiOutlineEnter } from "react-icons/ai";
import { MdOutlineKeyboardBackspace, MdOutlineReplay } from "react-icons/md";
import { RiEyeCloseLine, RiEyeLine as EyeOpen } from "react-icons/ri";
import toast, { Toaster } from "react-hot-toast";
import {
  PatternArray,
} from "../utils/words";
import Link from "next/link";
import { useQuery } from "react-query";
import axios from "axios";

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

type ServerErrorResponse = {
  error: "api_error" | "unknown_word";
};

type ServerSuccessResponse = {
  history: {
    word: string;
    pattern: PatternArray;
  }[];
};

type ServerResponse = ServerErrorResponse & ServerSuccessResponse;

type CheckOptions = {
  signal?: AbortSignal;
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
        color={colorMapKeyboard[bestColors.get(letter.toUpperCase())]}
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
  if (!word) return <></>;
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
  word: string;
  pattern: PatternArray;
}>;

function useSecretInfo() {
  return useQuery(
    "firstLetter",
    async () => {
      const { data } = await axios.get(`/init`);
      return data;
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    }
  );
}

function useGameHistory(word: string, id: number) {
  return useQuery<ServerResponse, string>(
    ["gamestate", id],
    async () => {
      const res = await fetch(
        `/check?word=${
          word != null && word.length > 1 ? encodeURIComponent(word) : "$"
        }`
      );
      const json = await res.json();
      if (json.error) {
        throw new Error();
      }
      return json;
    },
    {
      refetchOnWindowFocus: false,
      enabled: false,
      retry: false,
      onError: () => {
        toast.error("Invalid word", { id: "toast", duration: 1000 });
      },
      onSuccess: (data) => {
        if (data.history && data.history.length > 0) {
          const lastRound = data.history[data.history.length - 1];
          if (lastRound.pattern.every((v) => v === 2)) {
            toast.success("Congrats!", { id: "toast", duration: 4000 });
          }
        }
      },
    }
  );
}

function usePossibilities(id: number) {
  return useQuery<{ possibilities: Array<[string, number]> }, string>(
    ["possibilities", id],
    async () => {
      const res = await fetch("possibles");
      const json = await res.json();
      if (json.error) {
        throw new Error();
      }
      return json;
    },
    {
      refetchOnWindowFocus: false,
      enabled: false,
      retry: false,
      onError: () => {
        toast.error("Oops", { id: "toast", duration: 1000 });
      },
    }
  );
}
export default function App() {
  const [currentAttempt, setCurrentAttempt] = useState("");
  const [spoilerOn, showSpoiler] = useState(false);
  const { data, refetch, status } = useSecretInfo();
  const [gameId, setGameId] = useState(1);
  const { data: gameHistory, refetch: refetchGameHistory } = useGameHistory(
    currentAttempt,
    gameId
  );
  const { data: possibles, refetch: getPossibilites } = usePossibilities(1);
  const firstLetter = data?.firstLetter;
  const length = data?.length || 0;

  const history = gameHistory?.history ?? [];
  const possibilities = possibles?.possibilities ?? [];
  useEffect(() => {
    if (firstLetter) {
      setCurrentAttempt(firstLetter);
      getPossibilites();
    }
  }, [firstLetter]);

  useEffect(() => {
    refetchGameHistory();
  }, []);

  let wordLength: string[] = [];
  for (let i = 0; i < length; ++i) {
    wordLength.push("");
  }

  async function check() {
    if (currentAttempt.length < wordLength.length) {
      throw new Error("How?");
    }
    await refetchGameHistory();
    setCurrentAttempt(firstLetter);
    showSpoiler(false);
    getPossibilites();
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

  async function reset() {
    await axios.get("/reset");
    await refetch();
    setGameId((prev) => prev + 1);
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const RowVirtualized = ({ index, style }: { index: number; style: any }) => {
    const [word, score] = possibilities[index];
    //const niceDisplay = Math.round(+(score as number) * 1000) / 1000;
    return (
      <div className={index % 2 ? "ListItemOdd" : "ListItemEven"} style={style}>
        {`${word}: ${score}`}
      </div>
    );
  };

  function calculateBestColors(history?: StateHistory) {
    if (!history) return new Map();
    let map = new Map();
    for (let { word: attempt, pattern } of history) {
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

  if (status === "loading") {
    return <p>loading...</p>;
  }
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
          {history.map(({ word, pattern }, index) => (
            <Row
              key={index}
              firstLetter={firstLetter}
              word={word.toUpperCase()}
              length={wordLength}
              patterns={pattern}
            />
          ))}
          <Row
            key={"current"}
            firstLetter={firstLetter}
            word={currentAttempt?.toUpperCase()}
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
                itemCount={possibilities?.length}
                itemSize={35}
                width={300}
              >
                {RowVirtualized}
              </List>
            )}
          </div>
        </div>
      </div>
      <Keyboard onKey={handleKey} bestColors={bestColors} />
      {/[debug]/.test(location.search) && (
        <pre>{JSON.stringify(gameHistory, null, 2)}</pre>
      )}
      <Toaster />
    </div>
  );
}