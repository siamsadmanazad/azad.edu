# Azad.Edu — Backend Developer Task Submission

## Overview

**Azad.Edu** is an interactive teaching platform designed to enable teachers to create structured, multimedia-rich learning content while allowing students to consume it through a clean and interactive experience.

The system focuses on **content interactivity, scalability, and clean backend architecture**.

---

## Key Features

### 1. Role-Based System

* Two roles: **Teacher** and **Student**
* Teachers can create, edit, and manage content
* Students can only access **published materials**
* All permissions are enforced at the API level

---

### 2. Multimedia Learning Content

Teachers can attach multiple types of study materials:

* Images
* Audio files
* Videos
* YouTube links
* Instructional text

Media is handled via cloud storage with proper metadata management for scalability.

---

### 3. Interactive Article System (Core Feature)

The platform supports structured article-based learning content with:

* Highlighted words/phrases
* Clickable interactions
* Popup explanations linked to each highlight
* Optional media attached to explanations

This feature is designed to remain **stable even when article content is updated**, avoiding fragile text-position issues.

---

### 4. Expandable Content Sections

Each learning module includes structured expandable sections such as:

* Introduction
* Detailed Explanation
* Additional Resources

Teachers have full control over:

* Visibility
* Ordering
* Content structure

---

## Architecture Approach

The backend follows a clean and scalable structure:

```
Router → Service → Model → Schema
```

* **Routers** handle request/response logic
* **Services** contain business logic
* **Models** define database structure
* **Schemas** handle validation and serialization

This ensures separation of concerns and maintainability.

---

## Tech Stack

* **Backend**: FastAPI
* **Database**: PostgreSQL (Neon)
* **ORM**: SQLAlchemy
* **Validation**: Pydantic
* **Authentication**: JWT-based
* **Storage**: Cloudflare R2
* **Deployment**: Render

---

## Key Design Decisions

* Chose **FastAPI** to demonstrate deeper control over API architecture and async handling
* Designed a **robust highlight system** to avoid breaking on content edits
* Used **role-based access control at API level** for security
* Structured the system to be **modular and production-ready**

---

## Deployment

* Live project: [Your Link Here]
* GitHub repository: [Your Repo Here]

---

## Final Note

This project was built with a focus on **clean architecture, scalability, and real-world usability**, rather than just feature completion.

The highlight interaction system is the core innovation, designed to enhance learning through contextual, interactive explanations.

---

---

# Azad.Edu — Backend Execution Roadmap (Hiring-Ready)

This is your **build + delivery playbook**.

Goal:

> Ship a **clean, secure, deployed backend** that demonstrates strong engineering judgment.

---

## PHASE 0 — Strategy Lock (DO THIS FIRST)

### Objective

Define *what you will build* and *what you will NOT build*

### Steps

1. Lock core features:

   * Auth (teacher/student)
   * Content creation (teacher)
   * Content consumption (student)
   * Multimedia attachments
   * Highlight + popup system (core feature)
   * Expandable sections

2. Define **non-goals** (VERY important):

   * No complex UI logic
   * No real-time features
   * No unnecessary analytics
   * No overengineering

3. Define success criteria:

   * API works end-to-end
   * Deployed live
   * No permission leaks
   * Highlight system stable

---

### Claude Prompt

```
Act as a senior backend architect.

Help me define a strict MVP scope for Azad.Edu with:
- teacher/student roles
- multimedia content
- article with highlights
- expandable sections

Also define what should NOT be included to avoid overengineering.
```

---

## PHASE 1 — Architecture Foundation

### Objective

Design a clean backend structure

### Steps

1. Define modules:

   * auth
   * users
   * content
   * media
   * highlights
   * expandable sections

2. Define flow:

   ```
   Router → Service → Model → Schema
   ```

3. Decide:

   * sync vs async usage
   * dependency injection strategy
   * error handling structure

---

### Mistakes to Avoid

* business logic inside routers
* mixing DB logic everywhere
* no folder structure
* skipping service layer

---

### Claude Prompt

```
Design a modular FastAPI backend architecture for Azad.Edu.

Include:
- folder structure
- module responsibilities
- how routers, services, models, schemas interact
- error handling strategy
- scalability considerations

No code.
```

---

## PHASE 2 — Database Design (MOST CRITICAL)

### Objective

Design a **stable and scalable schema**

---

### Steps

1. Define core entities:

   * users
   * roles
   * content/materials
   * media
   * articles
   * highlights
   * popups
   * expandable sections

2. Define relationships:

   * teacher → content
   * content → media
   * article → highlights
   * highlight → popup

3. Decide highlight strategy:

   * avoid fragile text offsets
   * use structured anchoring or versioning

4. Add:

   * timestamps
   * publish state
   * soft deletes

---

### Mistakes to Avoid

* storing highlights as raw character positions only
* no publish state
* mixing media inside text
* no indexing
* weak relationships

---

### Claude Prompt

```
Design a PostgreSQL schema for Azad.Edu.

Focus on:
- strong relationships
- highlight system stability
- publish workflow
- media separation
- future scalability

Explain reasoning. No code.
```

---

## PHASE 3 — Authentication & Authorization

### Objective

Secure the system properly

---

### Steps

1. Define auth flow:

   * login
   * token generation
   * token validation

2. Define roles:

   * teacher → full control
   * student → read-only (published only)

3. Protect endpoints:

   * create/edit/delete → teacher only
   * view → filtered by publish state

---

### Mistakes to Avoid

* trusting frontend for permissions
* exposing unpublished data
* weak password handling
* no token expiration

---

### Claude Prompt

```
Design JWT authentication and role-based access control for Azad.Edu.

Include:
- login flow
- permission rules
- endpoint protection strategy
- common security risks

No code.
```

---

## PHASE 4 — API Design

### Objective

Design clean, professional APIs

---

### Steps

1. Group endpoints:

   * auth
   * content
   * media
   * highlights
   * expandable sections

2. Define:

   * request structure
   * response structure
   * pagination

3. Standardize:

   * status codes
   * error responses

---

### Mistakes to Avoid

* inconsistent naming
* messy responses
* no pagination
* mixing responsibilities in endpoints

---

### Claude Prompt

```
Design REST APIs for Azad.Edu.

Include:
- endpoint list
- request/response structure
- auth requirements
- pagination and filtering

No code.
```

---

## PHASE 5 — Media System (Cloudflare R2)

### Objective

Handle file uploads correctly

---

### Steps

1. Design upload flow:

   * presigned URLs
   * direct upload from frontend

2. Store:

   * file metadata in DB
   * files in R2

3. Define:

   * file validation rules
   * naming strategy
   * access control

---

### Mistakes to Avoid

* uploading through backend directly (slow)
* no file validation
* storing files in DB
* public access to private files

---

### Claude Prompt

```
Design a media upload system using Cloudflare R2.

Focus on:
- presigned upload flow
- metadata storage
- secure access
- validation rules

No code.
```

---

## PHASE 6 — Highlight System (CORE FEATURE)

### Objective

Build a **robust, interview-winning feature**

---

### Steps

1. Decide storage:

   * structured references (not fragile text positions)

2. Link:

   * highlight → popup
   * popup → optional media

3. Handle:

   * overlapping highlights
   * text edits
   * version safety

---

### Mistakes to Avoid

* raw text offsets only
* breaking highlights on edit
* no linking structure
* no fallback handling

---

### Claude Prompt

```
Design a robust highlight + popup system.

Requirements:
- stable after text edits
- supports media
- handles edge cases

Explain tradeoffs and best approach.
```

---

## PHASE 7 — Expandable Content

### Objective

Support structured learning sections

---

### Steps

1. Design sections:

   * title
   * content
   * order
   * visibility

2. Link to:

   * article or material

---

### Mistakes to Avoid

* hardcoding sections
* no ordering system
* no visibility control

---

### Claude Prompt

```
Design expandable content sections for Azad.Edu.

Focus on:
- ordering
- visibility
- flexibility

No code.
```

---

## PHASE 8 — Deployment (DO EARLY)

### Objective

Make it live ASAP

---

### Steps

1. Setup:

   * Render
   * Neon DB
   * R2 storage

2. Configure:

   * environment variables
   * CORS
   * logging

3. Deploy early:

   * test continuously

---

### Mistakes to Avoid

* deploying at the end only
* hardcoding secrets
* no logging

---

### Claude Prompt

```
Create a deployment plan for FastAPI on Render with Neon DB and R2.

Include:
- env variables
- setup steps
- production best practices

No code.
```

---

## PHASE 9 — Testing & Validation

### Objective

Ensure system reliability

---

### Steps

Test:

* auth flows
* permissions
* content visibility
* highlight behavior
* media upload

---

### Mistakes to Avoid

* skipping manual testing
* ignoring edge cases
* not testing permissions

---

### Claude Prompt

```
Design a testing strategy for Azad.Edu.

Focus on:
- high-risk areas
- edge cases
- testing order

No code.
```

---

## Security Audit Order

Follow this EXACT order before submission:

### 1. Git History Check

* remove exposed keys
* rotate secrets immediately

### 2. Fix .gitignore

* block:

  * .env
  * secrets
  * logs

### 3. Database Security (RLS mindset)

* enforce data isolation
* ensure users access only allowed data

### 4. Move Secrets Server-Side

* no API keys in frontend
* no hardcoded credentials

### 5. Add Rate Limiting

* protect:

  * login
  * signup

### 6. Lock Down CORS

* restrict origins
* avoid wildcard in production

---

## Final Submission Checklist

Before submitting:

* [ ] clean folder structure
* [ ] no permission leaks
* [ ] highlight system works
* [ ] deployed API
* [ ] GitHub repo clean
* [ ] README clear
* [ ] no exposed secrets

---

## Final Advice

* Don't try to impress with quantity
* Impress with **clarity + stability + structure**

If done right:

> This project alone can carry your hiring decision.
