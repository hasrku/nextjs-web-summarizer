"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
    content: string;
}

export default function MarkdownViewer({ content }: MarkdownViewerProps) {
    if (!content?.trim()) {
        return <p className="text-sm text-slate-500 dark:text-[#b4b4b4]">No Markdown content available.</p>;
    }

    return (
        <article className="max-w-none break-words text-sm leading-7 text-slate-700 dark:text-[#d1d1d1]">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="mb-5 mt-2 border-b border-slate-200 pb-3 text-3xl font-bold tracking-tight text-slate-950 dark:border-white/10 dark:text-white">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="mb-4 mt-8 border-b border-slate-200 pb-2 text-2xl font-semibold text-slate-900 dark:border-white/10 dark:text-[#ececec]">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="mb-3 mt-6 text-xl font-semibold text-slate-900 dark:text-[#ececec]">
                            {children}
                        </h3>
                    ),
                    h4: ({ children }) => (
                        <h4 className="mb-2 mt-5 text-lg font-semibold text-slate-900 dark:text-[#ececec]">
                            {children}
                        </h4>
                    ),
                    p: ({ children }) => (
                        <p className="mb-4 leading-7 text-slate-700 dark:text-[#d1d1d1]">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="mb-5 list-disc space-y-1 pl-6 marker:text-slate-400 dark:marker:text-[#8e8e8e]">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="mb-5 list-decimal space-y-1 pl-6 marker:text-slate-400 dark:marker:text-[#8e8e8e]">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
                    a: ({ href, children }) => {
                        const safeHref = href && /^(https?:|mailto:|\/|#)/i.test(href) ? href : undefined;

                        return (
                            <a
                                href={safeHref}
                                target={safeHref?.startsWith("http") ? "_blank" : undefined}
                                rel={safeHref?.startsWith("http") ? "noopener noreferrer" : undefined}
                                className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                                {children}
                            </a>
                        );
                    },
                    blockquote: ({ children }) => (
                        <blockquote className="my-5 border-l-4 border-blue-500 bg-slate-50 py-2 pl-4 text-slate-600 dark:border-white/25 dark:bg-white/5 dark:text-[#b4b4b4]">
                            {children}
                        </blockquote>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>
                    ),
                    hr: () => <hr className="my-8 border-slate-200 dark:border-white/10" />,
                    table: ({ children }) => (
                        <div className="my-6 overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">{children}</table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-[#ececec]">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-slate-200 px-3 py-2 dark:border-white/10">{children}</td>
                    ),
                    pre: ({ children }) => (
                        <pre className="my-5 overflow-x-auto rounded-xl border border-transparent bg-slate-950 p-4 text-sm text-slate-100 dark:border-white/10 dark:bg-[#171717] dark:text-[#ececec] [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">
                            {children}
                        </pre>
                    ),
                    code: ({ children, className }) => (
                        <code
                            className={
                                className ??
                                "rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-800 dark:bg-[#3a3a3a] dark:text-[#ececec]"
                            }
                        >
                            {children}
                        </code>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </article>
    );
}
