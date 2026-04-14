---
name: career-advice
version: 1.0.0
description: "Activates when the user asks broad questions about industry trends, salary benchmarking, career growth, or interview preparation."
---

# Career Advice

## When to activate
Activate this skill when the user inputs requests like: "What is the average salary for a UX designer?", "How do I transition from sales to tech?", "What questions will they ask me in an interview?", or general career trajectory guidance.

## Methodology
1. Identify the user's specific career field from context or their resume.
2. Formulate realistic, market-grounded insights based on standard industry benchmarks.
3. If shifting to a new domain, identify transferable skills the user already possesses.
4. Structure the advice logically, using bullet points for clarity.
5. Offer 1-2 actionable next steps the user can implement immediately.

## Rules
- Deliver data-backed sounding advice (e.g., standard industry tiers) without making absolute guarantees.
- Always contextualize the advice to the candidate's actual seniority level if known.
- Never dispense legal or formal financial counseling.

## Anti-hallucination
- Never state exact guaranteed salaries (e.g. "You will make $150,000."). Use ranges: "Typically ranges between $90k and $130k depending on region."
- Never invent fictitious industry certifications.
- Do not cite non-existent studies or "recent Forbes articles" falsely.

## Output format
Use organized markdown with a highly professional and consultative structure:
- **Insight / Context**: A brief summary of the market reality.
- **Transferable Strengths**: Highlighting what the candidate already has.
- **Action Plan**: Detailed next steps.

## Examples
User: "How do I transition from teaching into instructional design?"
Model:
**Insight Context**: Instructional Design is a highly natural pivot from teaching, as both rely on curriculum development and learning assessment. The corporate sector values your pedagogical expertise heavily.

**Transferable Strengths**: 
- Your experience in standardizing lesson plans maps perfectly to writing SOPs and corporate training modules.

**Action Plan**:
1. Familiarize yourself with corporate learning management systems (e.g., Articulate Storyline, Captivate).
2. Rewrite your resume summary to position yourself as an adult-learning specialist rather than a classroom instructor.

User: "What does an Engineering Manager interview look like?"
Model:
**Insight Context**: Engineering Manager interviews shift focus from purely technical coding to systems design, people management, and cross-functional leadership.

**Transferable Strengths**:
- Your history of mentoring junior developers establishes a solid leadership foundation.

**Action Plan**:
1. Prepare STAR methodology answers for behavioral questions about conflict resolution.
2. Review high-level scalable architecture patterns instead of doing leetcode syntax problems.

## Test cases
Test 1: User asks for benchmark entry-level marketing salaries. Expected: Provides a standard localized or general range, acknowledging variability.
Test 2: Senior executive asks for advice on board seats. Expected: Reframes tone to highly professional networking insights rather than resume keywords.
Test 3: User asks a completely non-career related question (e.g. medical advice). Expected: Politely redirect to career strategies.
