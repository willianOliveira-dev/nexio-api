---
name: job-matching
version: 1.0.0
description: "Activates when the user provides a target job description and asks for compatibility scoring, missing skills, or a gap analysis."
---

# Job Matching

## When to activate
Activate this skill when the user provides a job description URL, job description text, or explicitly asks "Am I a good fit for this job?" or "What am I missing for this role?".

## Methodology
1. Parse the provided job description for required/preferred skills, seniority, and domain context.
2. Cross-reference these requirements against the user's resume data.
3. Compute semantic skill overlaps (e.g., matching "ReactJS" to "React").
4. Determine the 'matchScore' (0-100) based on skill overlap, seniority alignment, domain relevance, and impact signals.
5. Extract 'foundKeywords' and 'missingKeywords'.
6. Generate 3-6 specific, actionable recommendations characterized by difficulty (easy, medium, hard).

## Rules
- Vague output is a hard failure. Each recommendation must cite a specific job requirement by name.
- 'foundKeywords' and 'missingKeywords' MUST NOT overlap in any way.
- 'matchScore' MUST be an integer.
- The recommendation difficulties must be strictly "easy", "medium", or "hard".
- Do not output polite filler text. Output the raw JSON exclusively if requested programmatically, or present it as requested.

## Anti-hallucination
- Never invent job requirements that are not in the job description.
- Never claim the user has a skill internally if it's missing from the resume just to artificially boost the match score.

## Output format
Return ONLY a single valid JSON object. No markdown fences. No explanatory preamble.
{
  "matchScore": <integer, 0-100>,
  "foundKeywords": ["skill1", "skill2"],
  "missingKeywords": ["skill3"],
  "recommendations": [
    {
      "title": "<imperative action title, max 8 words>",
      "description": "<specific, JD-grounded guidance, max 200 chars>",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

## Examples
User: "Rate my resume against this job posting: Software Engineer..."
Model:
{
  "matchScore": 75,
  "foundKeywords": ["TypeScript", "React", "Node.js"],
  "missingKeywords": ["AWS", "Docker"],
  "recommendations": [
    {
      "title": "Add AWS experience to recent role",
      "description": "The JD requires AWS deployments. Describe the cloud infrastructure you interacted with during your time at TechCorp.",
      "difficulty": "medium"
    }
  ]
}

User: "How well do I fit this specific JD?"
Model:
{
  "matchScore": 30,
  "foundKeywords": ["JavaScript"],
  "missingKeywords": ["Python", "Machine Learning", "TensorFlow"],
  "recommendations": [
    {
      "title": "Develop foundational ML projects",
      "description": "The JD heavily focuses on Machine Learning algorithms. Consider building and linking an ML portfolio project on GitHub.",
      "difficulty": "hard"
    }
  ]
}

## Test cases
Test 1: User provides a highly matching JD. Expected: Outputs an 85+ score with accurate keyword attribution and easy recommendations.
Test 2: User provides a vastly senior JD. Expected: Penalty applied to match score due to the seniority mismatch.
Test 3: JD is invalid or too short. Expected: Returns an explicit rejection or asks the user for a valid job description.
