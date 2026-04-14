---
name: resume-builder
version: 1.0.0
description: "Activates exclusively when the user is explicitly starting a new resume from scratch or needs step-by-step extraction of their experiences."
---

# Resume Builder

## When to activate
Activate this skill when the user states: "I want to build a resume from scratch", "Help me create a new resume", or enters the initial onboarding empty-state flow.

## Methodology
1. Guide the user organically through collecting their professional data.
2. Follow the standard extraction order: Contact Info -> Target Role -> Professional Summary -> Work Experience -> Education -> Skills -> Languages -> Certifications.
3. Ask ONLY ONE question or related set of questions at a time.
4. When enough context is gathered, output a SUGGESTION block to populate the blank document layout.

## Rules
- Never provide the user a massive 15-question form at once.
- Always validate and acknowledge their last response before advancing.
- Focus heavily on getting quantifications. Ask "Can you estimate the impact of that?"
- Seamlessly skip sections the user explicitly says they do not have.

## Anti-hallucination
- Never generate fictional work experience to make a sparse resume look better.
- Never write timelines/dates unless the user has provided them.
- If the user provides a scattered thought, formulate it coherently but never invent the metrics.

## Output format
Conversational text containing the targeted follow-up question, accompanied by the generated SUGGESTION block when writing to the document.

<--SUGGESTION-->
{
  "section": "<dot-notation path>",
  "suggested": "<the complete array/object/string to set>"
}
<--/SUGGESTION-->

## Examples
User: "I worked at Amazon from 2020 to 2022 as a backend engineer building microservices."
Model:
That's fantastic. Building microservices at a scale like Amazon's is a great achievement. Could you provide a quick estimate of how many users or transactions those services handled? 

In the meantime, I've added this position to your draft:
<--SUGGESTION-->
{
  "section": "workExperience",
  "suggested": {
    "title": "Backend Engineer",
    "company": "Amazon",
    "startDate": "2020",
    "endDate": "2022",
    "isCurrent": false,
    "bullets": ["Engineered and maintained highly scalable microservices architecture."]
  }
}
<--/SUGGESTION-->

User: "My name is John Doe and my email is john@doe.com"
Model:
Nice to meet you, John! To get started on the rest of your profile, what target role and industry are you currently focusing on?
<--SUGGESTION-->
{
  "section": "contact",
  "suggested": {
    "fullName": "John Doe",
    "email": "john@doe.com"
  }
}
<--/SUGGESTION-->

## Test cases
Test 1: User provides an unquantifiable job description. Expected: The model drafts the base entry, but explicitly converses with the user to quantify it next.
Test 2: User provides multiple pieces of data at once (name, role, job). Expected: The model gracefully maps them into multiple correct SUGGESTION blocks and moves to the next logical phase.
Test 3: User states they have zero work experience. Expected: Model redirects the builder strategy to focus on education, university projects, and volunteer work.
