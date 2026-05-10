import React, { useState, useEffect } from "react";

const COLORS = ["red", "green", "yellow", "blue"];
const START_POS = { red: 0, green: 13, yellow: 26, blue: 39 };
const END_POS = { red: 50, green: 11, yellow: 24, blue: 37 };
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

const getInitialTokens = () => {
  const tokens = {};
  COLORS.forEach((color) => {
    tokens[color] = [0, 1, 2, 3].map((id) => ({
      id: `${color}-${id}`,
      color,
      state: "base", // 'base', 'board', 'homerun', 'finished'
      pos: -1,
    }));
  });
  return tokens;
};

// SVG for the physical Coin look
const Coin = ({ color }) => (
  <div
    className="w-10 h-10 rounded-full border-4 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.4),_0_4px_6px_rgba(0,0,0,0.3)] flex items-center justify-center relative overflow-hidden"
    style={{ 
      backgroundColor: color, 
      borderColor: color === 'yellow' ? '#b4b400' : 
                   color === 'red' ? '#990000' : 
                   color === 'green' ? '#006600' : '#000099' 
    }}
  >
    <div className="w-6 h-6 rounded-full border-2 border-white/30 bg-white/20"></div>
  </div>
);

export default function LudoGame() {
  const [tokens, setTokens] = useState(getInitialTokens());
  const [turnIndex, setTurnIndex] = useState(0);
  const [dice, setDice] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [msg, setMsg] = useState("Roll the dice to start!");
  const [theme, setTheme] = useState("dark"); // 'light' or 'dark'

  const currentTurn = COLORS[turnIndex];

  // Theme configuration
  const themeClasses = theme === "dark" 
    ? "bg-neutral-900 text-white border-neutral-700 dashboard-bg-dark" 
    : "bg-slate-100 text-slate-900 border-slate-300 dashboard-bg-light";

  const cardClasses = theme === "dark" ? "bg-neutral-800 border-neutral-700" : "bg-white border-slate-300 shadow-xl";

  const rollDice = () => {
    if (hasRolled || isRolling) return;
    setIsRolling(true);
    setMsg("Rolling...");

    let rolls = 0;
    const rollInterval = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      rolls++;
      
      if (rolls > 12) {
        clearInterval(rollInterval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDice(finalVal);
        setIsRolling(false);
        setHasRolled(true);
        processTurn(finalVal);
      }
    }, 60);
  };

  const processTurn = (val) => {
    const playerTokens = tokens[currentTurn];
    const canMove = playerTokens.some((t) => isValidMove(t, val));

    if (!canMove) {
      setMsg(`${currentTurn.toUpperCase()} rolled ${val} but has no moves. Passing...`);
      setTimeout(() => nextTurn(false), 2000);
    } else {
      setMsg(`${currentTurn.toUpperCase()} rolled a ${val}! Select a coin to move.`);
    }
  };

  const nextTurn = (rolledSix = false) => {
    setHasRolled(false);
    setDice(null);
    if (!rolledSix) {
      setTurnIndex((prev) => (prev + 1) % 4);
      setMsg(`${COLORS[(turnIndex + 1) % 4].toUpperCase()}'s turn. Roll the dice!`);
    } else {
      setMsg(`${currentTurn.toUpperCase()} gets another turn!`);
    }
  };

  const isValidMove = (token, val) => {
    if (token.state === "finished") return false;
    if (token.state === "base") return val === 6;
    if (token.state === "homerun") return token.pos + val <= 5;
    return true;
  };

  const handleTokenClick = (color, tIndex) => {
    if (color !== currentTurn || !hasRolled || !dice || isRolling) return;

    const token = tokens[color][tIndex];
    if (!isValidMove(token, dice)) return;

    let newTokens = JSON.parse(JSON.stringify(tokens));
    let movedToken = newTokens[color][tIndex];
    let extraTurn = dice === 6;

    if (movedToken.state === "base") {
      movedToken.state = "board";
      movedToken.pos = START_POS[color];
    } else if (movedToken.state === "board") {
      let nextPos = movedToken.pos + dice;
      let distToEnd = END_POS[color] - movedToken.pos;
      if (distToEnd < 0) distToEnd += 52; 

      if (distToEnd < dice && distToEnd >= 0) {
        movedToken.state = "homerun";
        movedToken.pos = dice - distToEnd - 1;
      } else {
        movedToken.pos = nextPos % 52;
      }
    } else if (movedToken.state === "homerun") {
      movedToken.pos += dice;
    }

    if (movedToken.state === "homerun" && movedToken.pos === 5) {
      movedToken.state = "finished";
      extraTurn = true; 
      setMsg(`A ${color} coin reached Home!`);
    }

    // Capture logic
    if (movedToken.state === "board" && !SAFE_SQUARES.includes(movedToken.pos)) {
      COLORS.forEach((c) => {
        if (c !== color) {
          newTokens[c].forEach((t) => {
            if (t.state === "board" && t.pos === movedToken.pos) {
              t.state = "base";
              t.pos = -1;
              extraTurn = true; 
              setMsg(`${color.toUpperCase()} captured a ${c.toUpperCase()} coin!`);
            }
          });
        }
      });
    }

    setTokens(newTokens);
    
    if (newTokens[color].every(t => t.state === "finished")) {
      setMsg(`🎉 ${color.toUpperCase()} WINS THE GAME! 🎉`);
      return; 
    }

    setTimeout(() => nextTurn(extraTurn), 600);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 font-sans transition-colors duration-300 ${theme === 'dark' ? 'bg-neutral-900' : 'bg-slate-100'}`}>
      
      {/* Header & Controls */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 tracking-tight">
          LUDO LIVE
        </h1>
        <button 
          onClick={toggleTheme}
          className={`p-3 rounded-full shadow-lg transition-transform hover:scale-110 ${theme === 'dark' ? 'bg-white text-black' : 'bg-slate-800 text-white'}`}
        >
          {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>
      
      <p className={`text-xl font-bold h-10 mb-6 flex items-center justify-center px-6 py-2 rounded-full ${theme === 'dark' ? 'bg-neutral-800 text-neutral-200' : 'bg-white shadow-md text-slate-800'}`}>
        {msg}
      </p>

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full max-w-5xl">
        
        {/* Dice & Turn Dashboard */}
        <div className={`w-full lg:w-72 p-6 rounded-3xl border flex flex-col items-center ${cardClasses}`}>
          <div className="w-full flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-400">Current Turn</h2>
            <div className={`w-6 h-6 rounded-full bg-${currentTurn}-500 shadow-[0_0_15px_currentColor]`} style={{ color: currentTurn, backgroundColor: currentTurn }}></div>
          </div>
          
          <button
            onClick={rollDice}
            disabled={hasRolled || isRolling}
            className={`relative w-32 h-32 rounded-3xl flex items-center justify-center text-6xl font-black transition-all transform ${
              hasRolled || isRolling
                ? "cursor-not-allowed opacity-80 scale-95" 
                : "hover:scale-105 hover:shadow-2xl hover:-translate-y-2 cursor-pointer active:scale-95"
            }`}
            style={{
              backgroundColor: theme === 'dark' ? '#fff' : '#fff',
              color: '#000',
              boxShadow: isRolling ? '0 0 30px rgba(255,255,255,0.5)' : theme === 'dark' ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.1)'
            }}
          >
            <span className={isRolling ? 'animate-bounce' : ''}>
              {dice === 1 ? "⚀" : dice === 2 ? "⚁" : dice === 3 ? "⚂" : dice === 4 ? "⚃" : dice === 5 ? "⚄" : dice === 6 ? "⚅" : "🎲"}
            </span>
          </button>
          
          <div className="mt-10 w-full grid grid-cols-2 gap-4 text-sm font-bold">
            {COLORS.map(c => (
              <div key={c} className={`flex flex-col items-center p-3 rounded-xl ${theme === 'dark' ? 'bg-neutral-700/50' : 'bg-slate-100'} border-b-4`} style={{ borderBottomColor: c }}>
                <span className="capitalize mb-1 opacity-80">{c}</span>
                <span>{tokens[c].filter(t => t.state === 'finished').length} / 4 Home</span>
              </div>
            ))}
          </div>
        </div>

        {/* Board Display */}
        <div className={`flex-1 grid grid-cols-2 gap-4 p-6 rounded-3xl border ${cardClasses}`}>
          {COLORS.map((color) => (
            <div key={color} className={`p-4 rounded-2xl border-4 relative overflow-hidden`} style={{ borderColor: color, backgroundColor: `${color}15` }}>
              <h3 className="text-center font-black uppercase tracking-widest mb-4 opacity-80" style={{ color }}>{color} Yard</h3>
              
              <div className="grid grid-cols-2 gap-3 justify-items-center">
                {tokens[color].map((t, idx) => {
                  const isMovable = color === currentTurn && hasRolled && isValidMove(t, dice) && !isRolling;
                  
                  return (
                    <div 
                      key={t.id} 
                      onClick={() => handleTokenClick(color, idx)}
                      className={`flex flex-col items-center gap-2 transition-all ${
                        isMovable 
                        ? "cursor-pointer scale-110 hover:scale-125 hover:-translate-y-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10" 
                        : "opacity-70 cursor-not-allowed scale-90 grayscale-[30%]"
                      }`}
                    >
                      <Coin color={color} />
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-neutral-800/80 text-white' : 'bg-white/80 text-black'}`}>
                        {t.state === "base" ? "BASE" : 
                         t.state === "board" ? `Pos: ${t.pos}` : 
                         t.state === "homerun" ? `Home: ${t.pos}` : "🌟 WON"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}