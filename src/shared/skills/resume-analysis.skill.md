---
name: resume-analysis
version: 1.0.0
description: "Activates when the user asks for feedback, scoring, or a general review of their entire resume."
---

# Resume Analysis

## When to activate
Activate this skill when the user inputs requests like: "Review my resume", "What is my resume score?", "How can I improve my current CV?", or any intent generally aimed at getting a diagnostic evaluation of their profile.

## Methodology
1. Read the provided resume data in its entirety.
2. Identify and evaluate three core vectors: Impact (quantifiable achievements), ATS Compatibility (keywords, structure), and Clarity (readability, conciseness).
3. Score the resume based on the findings, out of 100.
4. Synthesize the most critical gap or weakness in the resume.
5. Provide localized, specific feedback tied to the user's exact bullets rather than generic advice.

## Rules
- Never use generic phrasing like "add more action verbs" without citing exactly which bullet missed them.
- Ensure the user understands exactly which resume section is lacking.
- Frame feedback constructively: point out the missing value rather than just "this is bad".
- Present max 3 high-priority issues at a time to avoid overwhelming the user.

## Anti-hallucination
- Never invent metrics, KPIs, tools, or percentages for the user's achievements.
- Never hallucinate job histories or promotions they have not explicitly stated.

## Output format
Deliver the assessment in clear, scannable markdown:
1. **Executive Score**: X/100
2. **Top Strength**: 1-2 sentences.
3. **Critical Gaps**: Bullet list of max 3 highly specific areas to improve.

## Examples
User: "Can you review my resume?"
Model:
**Executive Score**: 65/100

**Top Strength**: You have an excellent foundational background in cloud infrastructure at TechCorp.

**Critical Gaps**:
- Your role as DevOps Engineer lacks quantifiable metrics. You mention "improved deployment time", but do not provide the before/after percentages.
- The ATS keyword match for common CI/CD tools is low. If you used Jenkins or GitHub Actions, add them directly to your bullets.

User: "How does my profile read?"
Model:
**Executive Score**: 80/100

**Top Strength**: Powerful action-driven bullets under your Project Manager experience.

**Critical Gaps**:
- Your Professional Summary is overly long. It spans 5 sentences, making it difficult for recruiters to scan quickly.
- There is a noticeable gap between 2021 and 2023 with no explanation. Consider adding relevant study or projects to bridge this period.

## Test cases
Test 1: User asks for a generic review. Expected: Output the exact format identifying strengths and strict actionable gaps based on their data.
Test 2: User asks "What is my ATS score?". Expected: Focus heavily on the keyword density and structure aspect, assigning an executive score based on that subset.
Test 3: User resume is entirely empty. Expected: Politely decline to review due to missing data and ask them to upload or provide their content.
