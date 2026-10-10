import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import TurndownService from "turndown";

export const maxDuration = 60;

const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
});

interface ScrapeRequest {
    url: string;
}

export async function POST(request: Request) {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

    try {
        const body = (await request.json()) as ScrapeRequest;
        const { url } = body;

        if (typeof url !== "string" || !url.trim()) {
            return NextResponse.json({ success: false, error: "Please provide a URL." }, { status: 400 });
        }

        let parsedUrl: URL;

        try {
            // Accept URLs with or without https://
            const input = url.trim();
            parsedUrl = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
        } catch {
            return NextResponse.json({ success: false, error: "Invalid URL." }, { status: 400 });
        }

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Only HTTP and HTTPS URLs are allowed.",
                },
                { status: 400 },
            );
        }

        if (!parsedUrl.hostname || !parsedUrl.hostname.includes(".")) {
            return NextResponse.json({ success: false, error: "Please provide a valid website URL." }, { status: 400 });
        }

        browser = await puppeteer.launch({
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        await page.setViewport({
            width: 1280,
            height: 800,
            deviceScaleFactor: 1,
        });

        await page.goto(parsedUrl.href, {
            waitUntil: "networkidle2",
            timeout: 45000,
        });

        await page.waitForFunction(() => document.readyState === "complete", { timeout: 10000 }).catch(() => {});

        const result = await page.evaluate(() => {
            const clone = document.body.cloneNode(true) as HTMLElement;

            clone
                .querySelectorAll("script, style, noscript, iframe, svg, canvas, nav, footer, header")
                .forEach((element) => element.remove());

            return {
                title: document.title,
                finalUrl: location.href,
                html: clone.innerHTML,
                text: clone.innerText,
            };
        });

        const markdown = turndown
            .turndown(result.html)
            .replace(/&nbsp;/gi, " ")
            .replace(/&#x20;/gi, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        const screenshot = await page.screenshot({
            type: "jpeg",
            quality: 65,
            encoding: "base64",
        });

        return NextResponse.json({
            success: true,
            title: result.title,
            url: result.finalUrl,
            markdown,
            text: result.text,
            screenshot: `data:image/jpeg;base64,${screenshot}`,
        });
    } catch (error: unknown) {
        console.error("Scraping error:", error);

        const isTimeout =
            error instanceof Error &&
            (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout"));

        return NextResponse.json(
            {
                success: false,
                error: isTimeout ? "The website took too long to load." : "Failed to scrape this website.",
            },
            { status: 500 },
        );
    } finally {
        if (browser) {
            await browser.close().catch((error) => {
                console.error("Failed to close browser:", error);
            });
        }
    }
}
