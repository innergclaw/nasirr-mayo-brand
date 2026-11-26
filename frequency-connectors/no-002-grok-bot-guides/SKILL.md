---
name: innerg-frequency-connector-002-grok-bot-guides
description: Use when working on anything about setting up, writing, scheduling, connecting, securing or sharing Grok Bots for INNERG INTEL or Mr G (Nasirr "G" Mayo), or when a person asks how to build a bot, a routine, a skill or a team of bots. Applies the official Grok Bot guides at https://x.ai/bot/guides.
---

# Frequency Connector No. 002 ~ Grok Bot Guides

Learn the system. Recode the mind. Build the future.

Status: v1.0, FREE, published 2026-11-26 (approved by Mr G). Source: the 15 official guides at https://x.ai/bot/guides, read in full on 2026-11-26. Nothing here goes beyond those pages.

## What this is

A working reference for helping a person (or for guiding yourself as a fleet bot) build and run Grok Bots well. The guides' core claim: "Grok Bot is an agent with a computer", with a persistent cloud desktop, filesystem, terminal and apps, that keeps working when the laptop is closed.

## How to apply it

1. Define the job. One bot, one job. Write the description like a job description: what it owns, the KPI it answers for, what work it refuses, and where it must stop and ask the human. The last item matters most.
2. Connect only what the job needs. Use connectors and plugins first. Use the bot's own computer for anything with no connector. If a tool is not connected, ask the human before working around it.
3. Teach once. Take a recorded demo or a written walkthrough and turn it into a skill. When the same correction is given twice, turn it into a saved rule or skill.
4. Schedule it. A routine has a trigger (clock or event). Create new routines Disabled until the human enables them. Stay silent when nothing changed. Report only what needs a person.
5. Give it a voice. Before drafting for a person, read their sent messages and build a style guide, then re-read it before each draft.
6. Scale by specialists, not by one giant bot. Reuse existing bots first. Add a front-door bot only when handoffs hurt. Create a new bot only after the human says yes. Keep memory scoped per bot.
7. Keep humans on the important parts. Draft, then human send. Never auto-send, post, publish, spend or delete without the human's own approval. Separate read paths from write paths for systems of record, and preview before any write.
8. Review and improve. Keep a short status note per bot, run a periodic self-review of which routines fired and were ignored, and write mistakes back into the playbook.

## Safety facts from the guides

– Rules are written in plain language in Settings > General > Agent. A separate review agent can allow, block or escalate. "You are trusting the model to follow what you wrote."
– Shared computer: a login made by one bot is reachable by every other bot. Secrets go through secure forms only, never chat.
– Templates (Settings > Share as Template) are recipes: instructions, relevant memories and skills, plugins. They exclude custom code, secrets and personal or internal memories by default. Choose Team or a public link, then Publish. Check View Details before installing anyone's template. Non-standard MCP servers and scripts do not travel, so write setup steps.
– Token cost: transcript-watching "P0" routines "can burn tokens much faster than you think". Use only for true urgency.

## Patterns worth knowing

– Outer loop and inner loop: a coordinating bot gathers context and writes a clear prompt, a coding agent does the build. Give coding agents a complete feedback loop (screenshots, driving the stack).
– Nightly audits: a scheduled routine that returns a fresh set of reviewable changes each morning.
– Attention list: a rolling list of what the person is actually working on, used as a filter for what is worth a ping.
– Support jobs: release tracking, bug reproduction with video, churn analysis, refunds with approval, custom reporting.
– Sales jobs: research, draft, stage, never auto-send; KEEP, HOLD and DQ sorting; warm paths over cold templates.
– Handoffs: bots pass work to each other directly, and the human sees results and decisions.

## Do

– Quote the official pages for product facts and link them.
– Say what is the guide authors' own claim (for example PR counts, ROI figures) and do not restate it as verified.
– Keep new routines paused until approved. Keep drafts as drafts.
– Point the person back to the official hub: https://x.ai/bot/guides

## Don't

– Don't state limits, plans or prices. The guides give none.
– Don't copy a guide's auto-merge or auto-routine behavior into a fleet that requires human approval.
– Don't install a template or a "Try my ..." bot without reading what it includes.
– Don't claim a bot, routine or connector is live because a guide describes one.

## House style

– Never use the two-letter abbreviation for artificial intelligence. Say SI or superintelligence. Exact product names and direct quotes keep their spelling.
– No em dashes. Use ~ instead.
– No emoji, no arrows, no decorative icons.
– Point lists use "– " lines.

## Unverified

– Embedded walkthrough videos on the 101 and Templates pages were not watched.
– Result numbers in the guides (PR counts, CPI, retention, downloads) are the authors' own claims.
– Template and "Add ... to Grok Bot" links were not opened.
