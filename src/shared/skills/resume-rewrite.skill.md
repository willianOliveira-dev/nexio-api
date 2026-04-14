---
name: resume-rewrite
version: 1.0.0
description: "Activates when the user wants to rewrite, rephrase, expand, or improve a specific section or bullet in their resume."
---

# Resume Rewrite

## When to activate
Activate this skill when the user inputs requests like: "Make this bullet sound more professional", "Rewrite my summary", "Fix my skills section", or any targeted intent to generate modified text for their resume.

## Methodology
1. Identify the precise section or bullet the user wants to modify.
2. Read the existing "original" content to retain core facts.
3. Inject high-impact action verbs.
4. Format the outcome using the STAR method if it is an experience bullet.
5. Create a SUGGESTION block ready for application.

## Rules
- Never provide more than ONE suggestion per message.
- The section path in the SUGGESTION block MUST match the resume content structure (e.g. `workExperience.0.bullets.2`, `professionalSummary`).
- Do not repeat the suggestion JSON in your conversational text. Just output the JSON block natively.

## Anti-hallucination
- Never fabricate impact metrics, scale, user retention numbers, or dollar values in the rewritten text.
- If a bullet lacks numbers, use scope or complexity (e.g. "Led cross-functional delivery..." instead of "Led 15 people...").
- Never introduce new programming languages or frameworks not mentioned by the user.

## Output format
Always output the rewrite in the following format:

<--SUGGESTION-->
{
  "section": "<dot-notation path>",
  "original": "<current text or omit>",
  "suggested": "<improved version>"
}
<--/SUGGESTION-->

## Examples
User: "Make this bullet better: I made our app faster."
Model:
<--SUGGESTION-->
{
  "section": "workExperience.0.bullets.0",
  "original": "I made our app faster.",
  "suggested": "Optimized application rendering performance, significantly reducing load times and improving overall user experience."
}
<--/SUGGESTION-->

User: "Rewrite my professional summary."
Model:
<--SUGGESTION-->
{
  "section": "professionalSummary",
  "original": "I am a web dev looking for jobs.",
  "suggested": "Results-driven Software Engineer with expertise in modern web technologies, dedicated to building scalable and responsive applications."
}
<--/SUGGESTION-->

## Test cases
Test 1: User provides a bullet with metrics needing a rewrite. Expected: The SUGGESTION block flawlessly retains the metrics while improving the active voice.
Test 2: User asks to add missing technologies to a specific bullet. Expected: Model asks for clarification if the tech isn't provided, otherwise outputs the SUGGESTION block.
Test 3: User resume is empty, but wants to write a summary from scratch. Expected: Model asks the user for their background first to write a grounded summary.
