/**
 * AI GitHub Issue Resolver Script
 * Triggered by GitHub Actions on issue label 'ai-fix' or issue comment '/fix'.
 * Analyzes the issue with Google Gemini and posts an actionable diagnosis and code fix.
 */

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const repo = process.env.GITHUB_REPOSITORY;
  const issueNum = process.env.ISSUE_NUMBER;
  const issueTitle = process.env.ISSUE_TITLE || "Untitled Issue";
  const issueBody = process.env.ISSUE_BODY || "(No description provided)";

  if (!token || !repo || !issueNum) {
    console.error("[AI Issue Resolver] Missing required GitHub environment variables.");
    process.exit(1);
  }

  if (!geminiKey) {
    await postGitHubComment(
      repo,
      issueNum,
      token,
      "⚠️ **AI Fix Notice**: `GEMINI_API_KEY` secret is not configured in this repository settings. Please add `GEMINI_API_KEY` to **GitHub Repo Settings → Secrets and variables → Actions** to enable automated AI fixes."
    );
    console.error("[AI Issue Resolver] GEMINI_API_KEY is not set.");
    process.exit(0);
  }

  console.log(`[AI Issue Resolver] Processing Issue #${issueNum}: "${issueTitle}" in ${repo}...`);

  // 1. Post initial thinking comment
  await postGitHubComment(
    repo,
    issueNum,
    token,
    `🤖 **TicketHelper AI Agent** is analyzing this issue...\n\n_Reviewing codebase architecture and generating root cause analysis + solution._`
  );

  // 2. Query Gemini Model
  const systemPrompt = `You are the lead software engineer and architect for Ticket Helper (a modern student support ticketing platform built with Express, Bun, React, TypeScript, Prisma, PostgreSQL, and Better Auth).
A developer has reported an issue. Your job is to analyze the issue thoroughly, identify the root cause, and produce an exact, production-ready code solution with file paths and line-by-line diffs.

Provide your response in this clean markdown structure:
### 1. 🔍 Problem Summary
Briefly summarize what is happening.

### 2. 🧩 Root Cause Analysis
Explain why this issue occurs based on the architecture (database, routes, auth, or frontend).

### 3. 🛠️ Proposed Solution & Code Changes
Provide the exact code changes, specifying the file path (e.g. \`server/src/...\` or \`client/src/...\`), what to change, and why.

### 4. 🧪 How to Verify / Test
Command or steps to verify that the fix works properly.`;

  const userPrompt = `Issue Title: ${issueTitle}

Issue Description:
${issueBody}`;

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash",
  ].filter(Boolean) as string[];

  let aiResponse = "";
  let lastError = "";

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (aiResponse) {
          console.log(`[AI Issue Resolver] Successfully generated solution using ${model}`);
          break;
        }
      } else {
        const errorText = await res.text();
        lastError = errorText;
        console.warn(`[AI Issue Resolver] Model ${model} returned ${res.status}, trying next...`);
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
      console.warn(`[AI Issue Resolver] Exception calling ${model}:`, err);
    }
  }

  if (!aiResponse) {
    console.error("[AI Issue Resolver] All models failed. Last error:", lastError);
    await postGitHubComment(
      repo,
      issueNum,
      token,
      `❌ **AI Issue Resolver Error**: Unable to complete AI analysis across candidate models.\n\`\`\`\n${lastError}\n\`\`\``
    );
    process.exit(1);
  }

  // 3. Post full solution back to the GitHub Issue
  const finalComment = `## 🤖 TicketHelper AI Solution Proposal

${aiResponse}

---
*Generated automatically by TicketHelper CI/CD AI Assistant.*`;

  await postGitHubComment(repo, issueNum, token, finalComment);
  console.log(`[AI Issue Resolver] Successfully posted AI solution to Issue #${issueNum}!`);
}

async function postGitHubComment(repo: string, issueNum: string, token: string, body: string) {
  const url = `https://api.github.com/repos/${repo}/issues/${issueNum}/comments`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "TicketHelper-AI-Bot",
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[AI Issue Resolver] Failed to post comment (${response.status}):`, errorText);
  }
}

main().catch((err) => {
  console.error("[AI Issue Resolver] Uncaught error:", err);
  process.exit(1);
});

