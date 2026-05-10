# AI / Prompt / Agent Workflows

## Current State

**No AI integrations exist in this repository.** There are no:
- LLM API calls
- Embeddings
- Vector databases
- RAG pipelines
- Prompt engineering
- Agent orchestration
- MCP servers/tools

## Opportunities for AI Integration

### 1. Smart Lead Scoring (Instead of Heuristic)
Current scoring is rule-based (30 points max). Could be replaced with:
- **Intent scoring:** Predict likelihood to purchase web development services (e.g., based on website age, tech stack, mobile responsiveness)
- **Behavioral scoring:** Cluster businesses by digital maturity stage (no website → social only → basic site → needs upgrade)

### 2. Automated Outreach (Email Generation)
- Generate personalized outreach emails using business name, subgroup, city, website status
- Template: "Hi {name}, I noticed {business} in {city} doesn't have a website / has an outdated site..."
- Could use an LLM to vary tone and structure for A/B testing

### 3. Website Quality Analysis
- Scrape discovered websites and use an LLM to assess:
  - Mobile responsiveness
  - Load speed (rough estimate)
  - Missing features (online ordering, booking, contact form)
  - Design quality
- Store assessment in `notes` field for personalized sales pitch

### 4. Classification Enhancement
Current business classification is tag + regex-based (85 exact tag matches + 2 name patterns). Could use:
- LLM-based classification from business name + OSM context
- Better home baker / freelancer detection from name patterns
- Multi-language support (German, Italian, Ladin names)

### 5. Automated Follow-up Sequences
- No current outreach system at all
- Could build: scrape → enrich → score → auto-email → track opens/replies → flag hot leads

## Future Prompt Patterns (Not Yet Implemented)

```
System: You are a sales assistant for a web development agency in South Tyrol.
Classify this business as "high_intent", "medium_intent", or "low_intent" for
web development services.

Business: {name}
Category: {subgroup}
City: {city}
Has website: {has_website}
Website status: {website_status}
Social media: {instagram}, {facebook}

Respond with JSON: {"intent": "...", "reasoning": "..."}
```

```
System: Generate a personalized 3-sentence cold outreach email for a web
development agency. Tone: friendly, professional, value-first.
Target: local Italian business owner.

Business: {name}
Category: {subgroup} (in {city})
Website: {website_url or "no website"}
Pain point: {inferred_pain_point}

Email:
```
