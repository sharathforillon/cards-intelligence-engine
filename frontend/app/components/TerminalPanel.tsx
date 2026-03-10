"use client";

import { useState } from "react";

export default function TerminalPanel() {

  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");

  async function runQuery() {

    const res = await fetch("http://localhost:8000/query", {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({ query })

    });

    const data = await res.json();

    setResult(JSON.stringify(data, null, 2));

  }

  return (

    <div className="bg-black text-green-400 p-4 rounded-xl">

      <div className="mb-2">
        Strategy Terminal
      </div>

      <input
        className="w-full bg-black border border-green-500 p-2"
        value={query}
        onChange={(e)=>setQuery(e.target.value)}
      />

      <button
        onClick={runQuery}
        className="mt-2 bg-green-600 px-4 py-2"
      >
        Run
      </button>

      <pre className="mt-4 text-sm">
        {result}
      </pre>

    </div>

  );
}