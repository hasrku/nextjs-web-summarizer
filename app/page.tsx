"use client";

import { useEffect, useRef, useState } from "react";
import {
    Globe,
    ArrowUpRight,
    LoaderCircle,
    Copy,
    Check,
    FileText,
    Code2,
    ExternalLink,
    Sparkles,
    Moon,
    Sun,
    MoreVertical,
    X,
    Trash2,
    Clock3,
} from "lucide-react";

import MarkdownViewer from "@/components/MarkdownViewer";

interface ScrapeResult {
    success: boolean;
    title: string;
    url: string;
    markdown: string;
    text: string;
    screenshot: string;
}

interface ApiResponse {
    success: boolean;
    error?: string;
    summary?: string;
}

interface SavedTask {
    id: string;
    title: string;
    url: string;
    summary: string;
    markdown: string;
    screenshot: string;
    createdAt: number;
}

const TASKS_STORAGE_KEY = "web-to-markdown-saved-tasks";
const THEME_STORAGE_KEY = "web-to-markdown-theme";

export default function Home() {
    const [result, setResult] = useState<ScrapeResult | null>(null);
    const [url, setUrl] = useState("https://example.com");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [summary, setSummary] = useState("");
    const [animatedSummary, setAnimatedSummary] = useState("");
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState("");

    const [copied, setCopied] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [savedTasks, setSavedTasks] = useState<SavedTask[]>([]);
    const savedTasksRef = useRef<SavedTask[]>([]);
    const [storageReady, setStorageReady] = useState(false);
    const [selectedTask, setSelectedTask] = useState<SavedTask | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SavedTask | null>(null);

    // Load saved theme and tasks once on the client.
    useEffect(() => {
        try {
            const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
            setIsDark(storedTheme === "dark");

            const rawTasks = window.localStorage.getItem(TASKS_STORAGE_KEY);
            const parsedTasks: SavedTask[] = rawTasks ? JSON.parse(rawTasks) : [];
            const sortedTasks = [...parsedTasks].sort((a, b) => b.createdAt - a.createdAt);

            savedTasksRef.current = sortedTasks;
            setSavedTasks(sortedTasks);
        } catch (storageError) {
            console.error("Could not load saved tasks or theme:", storageError);
        } finally {
            setStorageReady(true);
        }
    }, []);

    // Persist theme preference.
    useEffect(() => {
        if (!storageReady) return;

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
        } catch (storageError) {
            console.error("Could not save theme preference:", storageError);
        }
    }, [isDark, storageReady]);

    // Apply the theme to <html> so Tailwind's `dark:` variants work everywhere
    // (page background, modals, scrollbars, form controls).
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("dark", isDark);
        root.style.colorScheme = isDark ? "dark" : "light";
    }, [isDark]);

    function normalizeUrl(input: string): string {
        const trimmed = input.trim();
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }

    function persistTasks(tasks: SavedTask[]) {
        const sortedTasks = [...tasks].sort((a, b) => b.createdAt - a.createdAt);

        savedTasksRef.current = sortedTasks;
        setSavedTasks(sortedTasks);

        try {
            window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(sortedTasks));
        } catch (storageError) {
            console.error("Could not save completed task:", storageError);
            setSummaryError(
                "The summary was generated, but this browser could not save it. Local storage may be full.",
            );
        }
    }

    async function summariseMarkdown(scrapeResult: ScrapeResult) {
        setSummary("");
        setAnimatedSummary("");
        setSummaryError("");
        setSummaryLoading(true);

        try {
            // One frontend request to the summarization endpoint.
            const response = await fetch("/api/summarise", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markdown: scrapeResult.markdown }),
            });

            const data: ApiResponse = await response.json();

            if (!response.ok || !data.success || !data.summary) {
                throw new Error(data.error || "Unable to generate the summary.");
            }

            setSummary(data.summary);

            // Persist only after both scraping and summarization have completed.
            const task: SavedTask = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                title: scrapeResult.title || "Untitled webpage",
                url: scrapeResult.url,
                summary: data.summary,
                markdown: scrapeResult.markdown,
                screenshot: scrapeResult.screenshot,
                createdAt: Date.now(),
            };

            persistTasks([task, ...savedTasksRef.current]);
        } catch (err: unknown) {
            setSummaryError(err instanceof Error ? err.message : "Something went wrong while summarizing.");
        } finally {
            setSummaryLoading(false);
        }
    }

    async function scrapeWebsite(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!url.trim()) {
            setError("Please enter a website URL.");
            return;
        }

        setLoading(true);
        setError("");
        setSummary("");
        setAnimatedSummary("");
        setSummaryError("");
        setSummaryLoading(false);
        setResult(null);
        setCopied(false);

        try {
            const response = await fetch("/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: normalizeUrl(url) }),
            });

            const data: ScrapeResult & { error?: string } = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Unable to scrape website.");
            }

            setResult(data);
            // Keep the scrape result visible while the summary is generated.
            void summariseMarkdown(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    // Animate the returned summary word by word.
    useEffect(() => {
        if (!summary) {
            setAnimatedSummary("");
            return;
        }

        const words = summary.split(/(\s+)/);
        let index = 0;
        setAnimatedSummary("");

        const timer = window.setInterval(() => {
            index += 1;
            setAnimatedSummary(words.slice(0, index).join(""));

            if (index >= words.length) {
                window.clearInterval(timer);
            }
        }, 25);

        return () => window.clearInterval(timer);
    }, [summary]);

    async function copyMarkdown(markdown = result?.markdown) {
        if (!markdown) return;

        try {
            await navigator.clipboard.writeText(markdown);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("Could not copy Markdown to clipboard.");
        }
    }

    function confirmDeleteTask() {
        if (!deleteTarget) return;

        const remaining = savedTasksRef.current.filter((task) => task.id !== deleteTarget.id);
        persistTasks(remaining);

        if (selectedTask?.id === deleteTarget.id) {
            setSelectedTask(null);
        }

        setDeleteTarget(null);
    }

    // ChatGPT-style neutral dark palette:
    //   page #212121 | sidebar #171717 | cards #2f2f2f | hover #3a3a3a
    //   text #ececec | muted #b4b4b4 | borders white/10
    const panelClass =
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#2f2f2f]";
    const mutedText = "text-slate-500 dark:text-[#b4b4b4]";
    const inputClass =
        "min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-[#ececec] dark:placeholder:text-[#8e8e8e]";

    return (
        <div className={isDark ? "dark" : ""}>
            <main className="min-h-screen bg-[#f7f8fa] text-slate-900 transition-colors dark:bg-[#212121] dark:text-[#ececec]">
                <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-[#212121]/95">
                    <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black">
                                <FileText size={21} />
                            </div>
                            <div className="min-w-0">
                                <h1 className="truncate text-lg font-semibold tracking-tight">Web to Markdown</h1>
                                <p className={`hidden text-xs sm:block ${mutedText}`}>
                                    Extract, summarise, and save webpage findings
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsDark((current) => !current)}
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-100 dark:border-white/15 dark:bg-[#2f2f2f] dark:hover:bg-[#3a3a3a]"
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                </header>

                <div className="flex min-h-[calc(100vh-65px)] flex-col lg:flex-row">
                    {/* Saved findings sidebar */}
                    <aside className="w-full shrink-0 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-[#171717] lg:w-80 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between px-4 pb-3 pt-5">
                            <div>
                                <h2 className="text-sm font-semibold">Saved findings</h2>
                                <p className={`mt-1 text-xs ${mutedText}`}>
                                    {savedTasks.length} saved {savedTasks.length === 1 ? "task" : "tasks"}
                                </p>
                            </div>
                            <FileText size={17} className={mutedText} />
                        </div>

                        <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto px-3 pb-4 lg:max-h-[calc(100vh-150px)]">
                            {!storageReady ? (
                                <p className={`px-2 py-6 text-center text-xs ${mutedText}`}>
                                    Loading saved findings...
                                </p>
                            ) : savedTasks.length === 0 ? (
                                <div
                                    className={`rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center dark:border-white/15`}
                                >
                                    <Sparkles size={20} className={`mx-auto ${mutedText}`} />
                                    <p className="mt-2 text-xs font-medium">No saved findings yet</p>
                                    <p className={`mt-1 text-xs ${mutedText}`}>
                                        Completed summaries will appear here automatically.
                                    </p>
                                </div>
                            ) : (
                                savedTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="group flex items-start gap-1 rounded-xl border border-slate-200 bg-white p-2 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-[#171717] dark:hover:border-white/15 dark:hover:bg-[#2f2f2f]"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTask(task)}
                                            className="min-w-0 flex-1 p-1 text-left"
                                        >
                                            <p className="truncate text-sm font-medium">{task.title}</p>
                                            <p className={`mt-1 truncate text-xs ${mutedText}`}>{task.url}</p>
                                            <p className={`mt-2 line-clamp-2 text-xs leading-5 ${mutedText}`}>
                                                {task.summary.replace(/[#*`>-]/g, "").slice(0, 150)}
                                            </p>
                                            <span className={`mt-2 flex items-center gap-1 text-[11px] ${mutedText}`}>
                                                <Clock3 size={11} />
                                                {new Date(task.createdAt).toLocaleString()}
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            aria-label={`Delete ${task.title}`}
                                            title="Delete saved finding"
                                            onClick={() => setDeleteTarget(task)}
                                            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-900 dark:text-[#8e8e8e] dark:hover:bg-[#3a3a3a] dark:hover:text-white"
                                        >
                                            <MoreVertical size={17} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>

                    {/* Main workspace */}
                    <section className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8">
                        <div className="mx-auto max-w-6xl">
                            <div className="mx-auto mb-8 max-w-3xl text-center">
                                <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-white/15 dark:bg-[#2f2f2f] dark:text-[#d1d1d1]">
                                    <Globe size={14} />
                                    Browser-powered extraction
                                </span>
                                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Turn any webpage into Markdown.
                                </h2>
                                <p className={`mt-3 text-sm leading-6 sm:text-base ${mutedText}`}>
                                    Extract content, capture a screenshot, and generate an AI-powered summary.
                                </p>
                            </div>

                            <form
                                onSubmit={scrapeWebsite}
                                className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#2f2f2f] sm:flex-row"
                            >
                                <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
                                    <Globe className="shrink-0 text-slate-400 dark:text-[#8e8e8e]" size={20} />
                                    <input
                                        type="text"
                                        inputMode="url"
                                        autoComplete="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="Enter a website, e.g. spit.ac.in/academics/"
                                        className={inputClass}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-[#d9d9d9]"
                                >
                                    {loading ? (
                                        <>
                                            <LoaderCircle className="animate-spin" size={17} />
                                            Extracting...
                                        </>
                                    ) : (
                                        <>
                                            Extract content
                                            <ArrowUpRight size={17} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {loading && (
                                <div
                                    className={`mx-auto mt-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#2f2f2f]`}
                                >
                                    <div className="flex items-center gap-3">
                                        <LoaderCircle
                                            className="animate-spin text-slate-500 dark:text-[#b4b4b4]"
                                            size={20}
                                        />
                                        <div>
                                            <p className="text-sm font-medium">
                                                Opening webpage and extracting content
                                            </p>
                                            <p className={`mt-1 text-xs ${mutedText}`}>
                                                Waiting for the page to load. This may take a little while.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div
                                    role="alert"
                                    className="mx-auto mt-5 max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
                                >
                                    {error}
                                </div>
                            )}

                            {result && (
                                <div className="mt-8 space-y-6">
                                    {/* Summary */}
                                    <section className={panelClass}>
                                        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-white/10">
                                            <Sparkles size={18} className="text-violet-500" />
                                            <h3 className="text-sm font-semibold">AI Summary</h3>
                                            {summaryLoading && (
                                                <span
                                                    className={`ml-auto flex items-center gap-2 text-xs ${mutedText}`}
                                                >
                                                    <LoaderCircle size={14} className="animate-spin" />
                                                    Generating...
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-5">
                                            {summaryLoading && !summary && (
                                                <div
                                                    className="animate-pulse space-y-4"
                                                    aria-label="Generating summary"
                                                >
                                                    <div className="h-5 w-1/3 rounded bg-slate-200 dark:bg-[#444444]" />
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-full rounded bg-slate-100 dark:bg-[#3a3a3a]" />
                                                        <div className="h-3 w-11/12 rounded bg-slate-100 dark:bg-[#3a3a3a]" />
                                                        <div className="h-3 w-4/5 rounded bg-slate-100 dark:bg-[#3a3a3a]" />
                                                    </div>
                                                    <div className="h-5 w-2/5 rounded bg-slate-200 dark:bg-[#444444]" />
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-full rounded bg-slate-100 dark:bg-[#3a3a3a]" />
                                                        <div className="h-3 w-10/12 rounded bg-slate-100 dark:bg-[#3a3a3a]" />
                                                        <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-[#3a3a3a]" />
                                                    </div>
                                                </div>
                                            )}
                                            {summary && <MarkdownViewer content={animatedSummary || summary} />}
                                            {summaryError && (
                                                <div
                                                    role="alert"
                                                    className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40"
                                                >
                                                    <p className="text-sm text-red-700 dark:text-red-300">
                                                        {summaryError}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => void summariseMarkdown(result)}
                                                        disabled={summaryLoading}
                                                        className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-[#2f2f2f] dark:text-red-300 dark:hover:bg-[#3a3a3a]"
                                                    >
                                                        Try summary again
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <div className="grid gap-6 xl:grid-cols-2">
                                        {/* Browser preview */}
                                        <section className={panelClass}>
                                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <Globe size={17} className={mutedText} />
                                                    <h3 className="text-sm font-semibold">Browser preview</h3>
                                                </div>
                                                <a
                                                    href={result.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex shrink-0 items-center gap-1.5 text-xs hover:text-slate-900 dark:hover:text-white ${mutedText}`}
                                                >
                                                    Open website <ExternalLink size={13} />
                                                </a>
                                            </div>
                                            <div className="border-b border-slate-200 bg-slate-100 px-3 py-2 dark:border-white/10 dark:bg-[#171717]">
                                                <div className="truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-[#2f2f2f] dark:text-[#b4b4b4]">
                                                    {result.url}
                                                </div>
                                            </div>
                                            <div className="flex min-h-64 items-center justify-center bg-slate-100 p-3 dark:bg-[#171717]">
                                                <img
                                                    src={result.screenshot}
                                                    alt={`Screenshot of ${result.title}`}
                                                    className="h-auto max-h-[560px] w-full rounded-lg border border-slate-200 bg-white object-contain object-top shadow-sm dark:border-white/15"
                                                />
                                            </div>
                                            <div className="border-t border-slate-200 p-4 dark:border-white/10">
                                                <p className="truncate text-sm font-semibold">
                                                    {result.title || "Untitled page"}
                                                </p>
                                                <p className={`mt-1 text-xs ${mutedText}`}>
                                                    Screenshot of the browser viewport after loading.
                                                </p>
                                            </div>
                                        </section>

                                        {/* Markdown output */}
                                        <section className={panelClass}>
                                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
                                                <div className="flex items-center gap-2">
                                                    <Code2 size={17} className={mutedText} />
                                                    <h3 className="text-sm font-semibold">Markdown output</h3>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => void copyMarkdown()}
                                                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:border-white/15 dark:hover:bg-[#3a3a3a]"
                                                >
                                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                                    {copied ? "Copied" : "Copy Markdown"}
                                                </button>
                                            </div>
                                            <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10">
                                                <p className="truncate text-sm font-medium">
                                                    {result.title || "Extracted content"}
                                                </p>
                                                <p className={`mt-1 text-xs ${mutedText}`}>
                                                    {result.markdown.length.toLocaleString()} characters
                                                </p>
                                            </div>
                                            <div className="max-h-[650px] overflow-auto p-5">
                                                <MarkdownViewer content={result.markdown} />
                                            </div>
                                        </section>
                                    </div>
                                </div>
                            )}

                            {!result && !loading && !error && (
                                <div className="mx-auto mt-12 max-w-xl text-center">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-[#2f2f2f] dark:text-[#b4b4b4]">
                                        <Code2 size={25} />
                                    </div>
                                    <p className="mt-4 text-sm font-medium">Your extracted content will appear here</p>
                                    <p className={`mt-1 text-sm ${mutedText}`}>
                                        Start by entering a public webpage URL above.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Saved task details modal */}
                {selectedTask && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) setSelectedTask(null);
                        }}
                    >
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="saved-task-title"
                            className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#2f2f2f]"
                        >
                            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
                                <div className="min-w-0">
                                    <h2 id="saved-task-title" className="truncate text-base font-semibold">
                                        {selectedTask.title}
                                    </h2>
                                    <a
                                        href={selectedTask.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-1 flex items-center gap-1 break-all text-xs text-blue-600 hover:underline dark:text-blue-400"
                                    >
                                        {selectedTask.url} <ExternalLink size={12} className="shrink-0" />
                                    </a>
                                    <p className={`mt-1 text-xs ${mutedText}`}>
                                        Saved {new Date(selectedTask.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    aria-label="Close saved finding"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-white/15 dark:hover:bg-[#3a3a3a]"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid min-h-0 gap-0 overflow-y-auto lg:grid-cols-2">
                                <div className="space-y-5 border-b border-slate-200 p-5 dark:border-white/10 lg:border-b-0 lg:border-r">
                                    <div>
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                            <Sparkles size={16} className="text-violet-500" />
                                            Summary
                                        </h3>
                                        <MarkdownViewer content={selectedTask.summary} />
                                    </div>
                                    <div>
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                            <Globe size={16} />
                                            Screenshot
                                        </h3>
                                        <img
                                            src={selectedTask.screenshot}
                                            alt={`Saved screenshot of ${selectedTask.title}`}
                                            className="h-auto max-h-[360px] w-full rounded-xl border border-slate-200 object-contain object-top dark:border-white/15"
                                        />
                                    </div>
                                </div>

                                <div className="min-w-0 p-5">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                                            <Code2 size={16} />
                                            Markdown
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => void copyMarkdown(selectedTask.markdown)}
                                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:border-white/15 dark:hover:bg-[#3a3a3a]"
                                        >
                                            <Copy size={13} /> Copy
                                        </button>
                                    </div>
                                    <div className="max-h-[600px] overflow-auto">
                                        <MarkdownViewer content={selectedTask.markdown} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTask(null)}
                                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-[#d9d9d9]"
                                >
                                    Close
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                {/* Custom delete confirmation modal */}
                {deleteTarget && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) setDeleteTarget(null);
                        }}
                    >
                        <section
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="delete-task-title"
                            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#2f2f2f]"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                                    <Trash2 size={19} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 id="delete-task-title" className="text-base font-semibold">
                                        Delete saved finding?
                                    </h2>
                                    <p className={`mt-2 text-sm leading-6 ${mutedText}`}>
                                        This will permanently remove{" "}
                                        <span className="font-medium text-slate-800 dark:text-[#ececec]">
                                            {deleteTarget.title}
                                        </span>{" "}
                                        and its summary, screenshot, and Markdown from this browser&apos;s local
                                        storage.
                                    </p>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(null)}
                                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-white/15 dark:hover:bg-[#3a3a3a]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDeleteTask}
                                    className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
                                >
                                    <Trash2 size={15} />
                                    Delete
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
