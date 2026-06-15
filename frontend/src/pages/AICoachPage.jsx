import React, { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryAICoach } from "../lib/api";
import { SparklesIcon, SendIcon, MessageSquareIcon, BrainCircuitIcon, CalendarIcon, UserIcon } from "lucide-react";
import toast from "react-hot-toast";

const formatInline = (text) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-base-content/80">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="font-mono text-sm bg-base-200 text-secondary-content px-1.5 py-0.5 rounded border border-base-300 font-semibold">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const MarkdownRenderer = ({ text }) => {
  if (!text) return null;

  const blocks = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const lines = block.split("\n");
          const firstLine = lines[0].slice(3).trim();
          const language = firstLine || "code";
          const codeContent = lines.slice(1, -1).join("\n");

          return (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-base-300 bg-neutral shadow-inner my-2">
              <div className="flex items-center justify-between px-4 py-2 bg-neutral-focus text-neutral-content text-xs font-mono border-b border-base-content/10">
                <span>{language.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(codeContent);
                    toast.success("Code copied!");
                  }}
                  className="btn btn-xs btn-ghost text-neutral-content/75 hover:text-neutral-content"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-sm font-mono text-neutral-content select-all">
                <code>{codeContent}</code>
              </pre>
            </div>
          );
        }

        const lines = block.split("\n");
        const elements = [];
        let listItems = [];
        let listType = null;

        const flushList = (key) => {
          if (listItems.length > 0) {
            if (listType === "ul") {
              elements.push(
                <ul key={key} className="list-disc pl-6 space-y-1.5 my-2 text-base-content/90">
                  {listItems.map((item, i) => (
                    <li key={i}>{formatInline(item)}</li>
                  ))}
                </ul>
              );
            } else if (listType === "ol") {
              elements.push(
                <ol key={key} className="list-decimal pl-6 space-y-1.5 my-2 text-base-content/90">
                  {listItems.map((item, i) => (
                    <li key={i}>{formatInline(item)}</li>
                  ))}
                </ol>
              );
            }
            listItems = [];
            listType = null;
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            flushList(`list-${idx}-${i}`);
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            const sizeClass =
              level === 1
                ? "text-xl font-extrabold text-primary border-b border-base-300 pb-1.5"
                : level === 2
                ? "text-lg font-bold text-secondary pb-1"
                : level === 3
                ? "text-md font-bold text-accent"
                : "text-sm font-semibold text-base-content";

            elements.push(
              React.createElement(
                `h${level}`,
                { key: `h-${idx}-${i}`, className: `${sizeClass} mt-3 mb-1.5` },
                formatInline(content)
              )
            );
            continue;
          }

          const ulMatch = line.match(/^[\*\-]\s+(.*)$/);
          if (ulMatch) {
            if (listType && listType !== "ul") {
              flushList(`list-${idx}-${i}`);
            }
            listType = "ul";
            listItems.push(ulMatch[1]);
            continue;
          }

          const olMatch = line.match(/^\d+\.\s+(.*)$/);
          if (olMatch) {
            if (listType && listType !== "ol") {
              flushList(`list-${idx}-${i}`);
            }
            listType = "ol";
            listItems.push(olMatch[1]);
            continue;
          }

          const bqMatch = line.match(/^>\s*(.*)$/);
          if (bqMatch) {
            flushList(`list-${idx}-${i}`);
            elements.push(
              <blockquote key={`bq-${idx}-${i}`} className="border-l-4 border-secondary bg-base-200/60 pl-4 py-2 my-3 rounded-r-lg italic text-base-content/80">
                {formatInline(bqMatch[1])}
              </blockquote>
            );
            continue;
          }

          if (trimmed === "") {
            flushList(`list-${idx}-${i}`);
            continue;
          }

          flushList(`list-${idx}-${i}`);
          elements.push(
            <p key={`p-${idx}-${i}`} className="leading-relaxed mb-2 text-base-content/90">
              {formatInline(line)}
            </p>
          );
        }

        flushList(`list-end-${idx}`);
        return <div key={idx}>{elements}</div>;
      })}
    </div>
  );
};

const AICoachPage = () => {
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      text: "Hello! I am your Fluentify AI Coach. I can analyze your past chats and help you improve your grammar, vocabulary, and slang. Ask me anything about your previous conversations!",
      sources: []
    }
  ]);
  const [activeSources, setActiveSources] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const { mutate: askCoach, isPending } = useMutation({
    mutationFn: queryAICoach,
    onSuccess: (data) => {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response,
          sources: data.sources || []
        }
      ]);
      if (data.sources && data.sources.length > 0) {
        setActiveSources(data.sources);
      } else {
        setActiveSources([]);
      }
    },
    onError: (error) => {
      console.error("Coach Query Error:", error);
      toast.error(error.response?.data?.message || "Failed to get response from AI Coach");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userMsg = question;
    setChatHistory((prev) => [...prev, { role: "user", text: userMsg }]);
    setQuestion("");

    askCoach(userMsg);
  };

  return (
    <div className="h-[92vh] flex flex-col lg:flex-row bg-base-300 p-4 lg:p-6 gap-6">
      {/* LEFT HAND SIDE: THE CHAT CONSOLE */}
      <div className="flex-1 flex flex-col bg-base-100/60 backdrop-blur-md rounded-2xl shadow-xl border border-primary/10 overflow-hidden">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-primary/20 via-secondary/15 to-accent/10 p-4 border-b border-primary/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 text-primary rounded-xl">
              <SparklesIcon className="size-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Fluentify AI Coach</h2>
              <p className="text-xs opacity-70">Grounded in your real chat histories</p>
            </div>
          </div>
          <span className="badge badge-success badge-sm gap-1 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-success-content" />
            Connected
          </span>
        </div>

        {/* CHAT BUBBLES */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-base-200/30">
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="w-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                  {msg.role === "user" ? (
                    <UserIcon className="size-5 m-2.5" />
                  ) : (
                    <SparklesIcon className="size-5 m-2.5 text-secondary" />
                  )}
                </div>
              </div>
              <div className={`chat-header opacity-50 text-xs mb-1`}>
                {msg.role === "user" ? "You" : "AI Coach"}
              </div>
              <div
                className={`chat-bubble text-sm md:text-base leading-relaxed shadow-md ${
                  msg.role === "user"
                    ? "chat-bubble-primary max-w-lg font-medium whitespace-pre-wrap"
                    : "max-w-2xl bg-base-100 text-base-content border border-primary/10 p-5 rounded-2xl"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-primary/10 text-xs font-semibold text-primary">
                    <SparklesIcon className="size-4 animate-pulse text-secondary" />
                    <span>Language Coach Response</span>
                  </div>
                )}
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  <MarkdownRenderer text={msg.text} />
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="chat-footer mt-2">
                  <button
                    className="btn btn-xs btn-outline btn-secondary rounded-full"
                    onClick={() => setActiveSources(msg.sources)}
                  >
                    <BrainCircuitIcon className="size-3 mr-1" />
                    View Grounding Memory ({msg.sources.length})
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* LOADING SKELETON */}
          {isPending && (
            <div className="chat chat-start">
              <div className="chat-image avatar">
                <div className="w-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center animate-pulse">
                  <SparklesIcon className="size-5 m-2.5 text-secondary" />
                </div>
              </div>
              <div className="chat-bubble chat-bubble-neutral bg-base-300/40 border border-base-300/50 p-4 space-y-2 w-72">
                <div className="h-4 bg-base-content/10 rounded w-5/6 animate-pulse"></div>
                <div className="h-4 bg-base-content/10 rounded w-11/12 animate-pulse"></div>
                <div className="h-4 bg-base-content/10 rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FORM */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-primary/10 bg-base-200/50 flex gap-2">
          <input
            type="text"
            placeholder="E.g., What did we say about vacation plans or grammar mistakes?"
            className="input input-bordered flex-1 focus:outline-primary bg-base-100 rounded-xl"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isPending}
          />
          <button
            type="submit"
            className="btn btn-primary px-6 rounded-xl flex items-center gap-2"
            disabled={isPending || !question.trim()}
          >
            <SendIcon className="size-4" />
            <span className="hidden sm:inline">Ask Coach</span>
          </button>
        </form>
      </div>

      {/* RIGHT HAND SIDE: CONTEXT MEMORY VISUALIZER */}
      <div className="w-full lg:w-80 flex flex-col bg-base-100/40 backdrop-blur-md rounded-2xl shadow-xl border border-secondary/10 overflow-hidden">
        <div className="bg-gradient-to-r from-secondary/15 to-accent/10 p-4 border-b border-secondary/10 flex items-center gap-2">
          <BrainCircuitIcon className="size-5 text-secondary" />
          <h3 className="font-bold text-sm uppercase tracking-wider">Retrieval Memory (RAG)</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeSources.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 px-4">
              <MessageSquareIcon className="size-10 mb-2 text-primary/40" />
              <p className="text-xs font-semibold">No active source memories</p>
              <p className="text-[10px] opacity-75 mt-1">
                Ask a question to see the exact past messages retrieved from your vector database.
              </p>
            </div>
          ) : (
            activeSources.map((source, index) => {
              const scorePercent = Math.round(source.score * 100);
              return (
                <div
                  key={source.messageId}
                  className="card bg-base-100 border border-secondary/10 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="card-body p-3.5 space-y-2 text-xs">
                    {/* Source ID badge and relevance score */}
                    <div className="flex items-center justify-between">
                      <span className="badge badge-accent badge-sm font-semibold">Source [{index + 1}]</span>
                      <div className="tooltip" data-tip="Vector similarity score (Cosine distance)">
                        <span className="badge badge-outline badge-secondary text-[10px] font-mono">
                          {scorePercent}% match
                        </span>
                      </div>
                    </div>

                    {/* Text block */}
                    <p className="italic bg-base-200/50 p-2 rounded-lg border-l-2 border-primary text-base-content/90 leading-relaxed font-sans">
                      "{source.text}"
                    </p>

                    {/* Metadata Footer */}
                    <div className="flex flex-col gap-1 text-[10px] opacity-70 mt-1">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3 text-secondary" />
                        <span>{new Date(source.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AICoachPage;
