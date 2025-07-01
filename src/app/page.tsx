'use client';
import { useCallback, useEffect, useRef, useState } from "react";

// import Image from "next/image";

const PUYO_COLORS = ["red", "blue", "green", "yellow", "purple"] as const;
const FIELD_ROWS = 12;
const FIELD_COLS = 6;
const PUYO_SIZE = 56;

const COLOR_MAP: Record<string, string> = {
  red: "#e74c3c",
  blue: "#3498db",
  green: "#2ecc71",
  yellow: "#f1c40f",
  purple: "#9b59b6",
};

function PuyoSVG({ color }: { color: string }) {
  return (
    <svg width={PUYO_SIZE} height={PUYO_SIZE} viewBox="0 0 56 56" fill="none">
      <ellipse cx="28" cy="32" rx="24" ry="20" fill={COLOR_MAP[color]} />
      <ellipse cx="20" cy="26" rx="6" ry="4" fill="#fff" fillOpacity="0.7" />
      <ellipse cx="36" cy="22" rx="4" ry="2.5" fill="#fff" fillOpacity="0.5" />
      <ellipse cx="32" cy="38" rx="8" ry="3" fill="#fff" fillOpacity="0.15" />
      <ellipse cx="28" cy="32" rx="24" ry="20" stroke="#fff" strokeWidth="2" fill="none" />
    </svg>
  );
}

// ぷよのペア（親と子）
type PuyoPair = {
  positions: [number, number][]; // [[row, col], [row, col]]
  colors: [string, string];
  rotation: number; // 0:上, 1:右, 2:下, 3:左
};

type Field = (string | null)[][];

function getRandomColor() {
  return PUYO_COLORS[Math.floor(Math.random() * PUYO_COLORS.length)];
}

function createEmptyField(): Field {
  return Array.from({ length: FIELD_ROWS }, () => Array(FIELD_COLS).fill(null));
}

function createPuyoPair(): PuyoPair {
  // 初期位置は上部中央
  const mid = Math.floor(FIELD_COLS / 2);
  return {
    positions: [
      [0, mid], // 親
      [1, mid], // 子（親の下に出現）
    ],
    colors: [getRandomColor(), getRandomColor()],
    rotation: 2, // 下向き
  };
}

function canMove(field: Field, positions: [number, number][]) {
  return positions.every(([r, c]) =>
    r >= 0 && r < FIELD_ROWS && c >= 0 && c < FIELD_COLS && (!field[r][c])
  );
}

function rotatePair(pair: PuyoPair, field: Field): PuyoPair {
  const [pr, pc] = pair.positions[0];
  const rot = (pair.rotation + 1) % 4;
  let offset: [number, number];
  switch (rot) {
    case 0: offset = [-1, 0]; break; // 上
    case 1: offset = [0, 1]; break; // 右
    case 2: offset = [1, 0]; break; // 下
    case 3: offset = [0, -1]; break; // 左
    default: offset = [-1, 0];
  }
  const newChild: [number, number] = [pr + offset[0], pc + offset[1]];
  if (canMove(field, [pair.positions[0], newChild])) {
    return {
      ...pair,
      positions: [pair.positions[0], newChild],
      rotation: rot,
    };
  }
  return pair;
}

function movePair(pair: PuyoPair, field: Field, dr: number, dc: number): PuyoPair {
  const newPositions = pair.positions.map(([r, c]) => [r + dr, c + dc]) as [
    [number, number],
    [number, number]
  ];
  if (canMove(field, newPositions)) {
    return {
      ...pair,
      positions: newPositions,
    };
  }
  return pair;
}

function fixPairToField(field: Field, pair: PuyoPair): Field {
  const newField = field.map((row) => [...row]);
  newField[pair.positions[0][0]][pair.positions[0][1]] = pair.colors[0];
  newField[pair.positions[1][0]][pair.positions[1][1]] = pair.colors[1];
  return newField;
}

// 連結判定・消去
function findConnected(field: Field, min: number = 4): [number, number][][] {
  const visited = Array.from({ length: FIELD_ROWS }, () => Array(FIELD_COLS).fill(false));
  const groups: [number, number][][] = [];
  for (let r = 0; r < FIELD_ROWS; r++) {
    for (let c = 0; c < FIELD_COLS; c++) {
      if (!field[r][c] || visited[r][c]) continue;
      const color = field[r][c];
      const stack = [[r, c]];
      const group: [number, number][] = [];
      while (stack.length) {
        const [cr, cc] = stack.pop()!;
        if (
          cr < 0 || cr >= FIELD_ROWS || cc < 0 || cc >= FIELD_COLS ||
          visited[cr][cc] || field[cr][cc] !== color
        ) continue;
        visited[cr][cc] = true;
        group.push([cr, cc]);
        stack.push([cr + 1, cc], [cr - 1, cc], [cr, cc + 1], [cr, cc - 1]);
      }
      if (group.length >= min) groups.push(group);
    }
  }
  return groups;
}

function eraseGroups(field: Field, groups: [number, number][][]): Field {
  const newField = field.map((row) => [...row]);
  for (const group of groups) {
    for (const [r, c] of group) {
      newField[r][c] = null;
    }
  }
  return newField;
}

function dropField(field: Field): Field {
  const newField = createEmptyField();
  for (let c = 0; c < FIELD_COLS; c++) {
    let write = FIELD_ROWS - 1;
    for (let r = FIELD_ROWS - 1; r >= 0; r--) {
      if (field[r][c]) {
        newField[write][c] = field[r][c];
        write--;
      }
    }
  }
  return newField;
}

function isGameOver(field: Field, pair: PuyoPair): boolean {
  return !canMove(field, pair.positions);
}

export default function Home() {
  const [field, setField] = useState<Field>(() => createEmptyField());
  const [pair, setPair] = useState<PuyoPair>(() => createPuyoPair());
  const [nextPair, setNextPair] = useState<PuyoPair>(() => createPuyoPair());
  const [dropping, setDropping] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const dropInterval = useRef<NodeJS.Timeout | null>(null);

  // ゲームループ
  useEffect(() => {
    if (gameOver) return;
    if (!dropping) return;
    dropInterval.current = setInterval(() => {
      setPair((curPair) => {
        const moved = movePair(curPair, field, 1, 0);
        if (moved === curPair) {
          // 着地
          setField((f) => fixPairToField(f, curPair));
          setDropping(false);
        }
        return moved;
      });
    }, 400);
    return () => {
      if (dropInterval.current) clearInterval(dropInterval.current);
    };
  }, [dropping, field, gameOver]);

  // 着地後の処理
  useEffect(() => {
    if (dropping || gameOver) return;
    // 連鎖処理
    let chain = 0;
    let tempField = field;
    function processChain() {
      const groups = findConnected(tempField);
      if (groups.length === 0) {
        setField(dropField(tempField));
        setPair(nextPair);
        setNextPair(createPuyoPair());
        setDropping(true);
        return;
      }
      setTimeout(() => {
        setScore((s) => s + groups.reduce((acc, g) => acc + g.length, 0) * (chain + 1) * 10);
        tempField = eraseGroups(tempField, groups);
        tempField = dropField(tempField);
        chain++;
        processChain();
      }, 400);
    }
    processChain();
    // eslint-disable-next-line
  }, [dropping, field, nextPair, gameOver]);

  // 新しいペア出現時のゲームオーバー判定
  useEffect(() => {
    if (dropping && isGameOver(field, pair)) {
      setGameOver(true);
      setDropping(false);
    }
  }, [dropping, field, pair]);

  // キー操作
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (gameOver || !dropping) return;
      if (e.key === "ArrowLeft") {
        setPair((cur) => movePair(cur, field, 0, -1));
      } else if (e.key === "ArrowRight") {
        setPair((cur) => movePair(cur, field, 0, 1));
      } else if (e.key === "ArrowDown") {
        setPair((cur) => movePair(cur, field, 1, 0));
      } else if (e.key === "z" || e.key === "Z" || e.key === "ArrowUp") {
        setPair((cur) => rotatePair(cur, field));
      }
    },
    [field, dropping, gameOver]
  );
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // リセット
  const handleReset = () => {
    setField(createEmptyField());
    setPair(createPuyoPair());
    setNextPair(createPuyoPair());
    setDropping(true);
    setGameOver(false);
    setScore(0);
  };

  // 描画用フィールド（落下中のペアも合成）
  const drawField: Field = field.map((row) => [...row]);
  if (!gameOver && dropping) {
    pair.positions.forEach(([r, c], i) => {
      if (r >= 0 && r < FIELD_ROWS && c >= 0 && c < FIELD_COLS) {
        drawField[r][c] = pair.colors[i];
      }
    });
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-white to-pink-100">
      <h1 className="text-5xl font-bold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 drop-shadow-lg">
        ぷよぷよもどき
      </h1>
      <div className="flex gap-8 items-start">
        {/* フィールド */}
        <div className="relative shadow-2xl rounded-3xl p-8 bg-white/80 border border-indigo-200">
          <div
            className="grid"
            style={{
              gridTemplateRows: `repeat(${FIELD_ROWS}, ${PUYO_SIZE}px)`,
              gridTemplateColumns: `repeat(${FIELD_COLS}, ${PUYO_SIZE}px)`
            }}
          >
            {drawField.map((row, rowIdx) =>
              row.map((cell, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className="w-14 h-14 flex items-center justify-center transition-all"
                >
                  {cell && <PuyoSVG color={cell} />}
                </div>
              ))
            )}
          </div>
          {/* フィールド枠 */}
          <div className="absolute inset-0 pointer-events-none rounded-3xl border-8 border-indigo-300/60 shadow-inner"></div>
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-3xl z-10">
              <div className="text-3xl font-bold text-pink-500 mb-2">ゲームオーバー</div>
              <button
                className="mt-2 px-6 py-2 bg-indigo-500 text-white rounded-full shadow hover:bg-indigo-600 transition"
                onClick={handleReset}
              >
                リトライ
              </button>
            </div>
          )}
        </div>
        {/* 次ぷよ・スコア */}
        <div className="flex flex-col gap-8 items-center mt-8">
          <div className="bg-white/80 rounded-xl p-4 shadow border border-indigo-100">
            <div className="text-lg font-bold mb-2 text-indigo-500">次のぷよ</div>
            <div className="flex flex-col items-center gap-2">
              <PuyoSVG color={nextPair.colors[0]} />
              <PuyoSVG color={nextPair.colors[1]} />
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-4 shadow border border-indigo-100 text-center">
            <div className="text-lg font-bold text-indigo-500">スコア</div>
            <div className="text-2xl font-mono">{score}</div>
          </div>
        </div>
      </div>
      <p className="mt-8 text-gray-500 text-base">矢印キー：移動／Z・↑：回転／下：高速落下</p>
    </div>
  );
}