### 2. Homepage Rebrand & Redesign (`components/pugolfers-app.tsx`)

Redesign the current homepage into a modern, polished landing page for **ePawatech**.

The homepage should clearly communicate the platform's core journey:

**Learn → Practice → Build → Showcase**

The redesign should feel modern, youthful, technology-focused, and approachable while still looking professional. It should feel like a complete brand refresh rather than simply rearranging the existing sections.

---

#### Hero Section

- **New Headline:** "Empowering the Next Generation of Tech Innovators"
- **New Subtext:** "ePawatech is your comprehensive learning platform to master coding, build real-world projects, and tackle interactive challenges."
- **Primary Action:** "Start Learning"
  - Navigate to the main Learning Track experience.
- **Secondary Action:** "Explore Challenges"
  - Navigate to the existing Challenges experience.

The hero should have a modern technology/education visual treatment that communicates learning, coding, creativity, and building.

Use subtle gradients, modern cards, clean geometric elements, and light motion where appropriate. Avoid excessive animation or a generic corporate/SaaS appearance.

Do not add stock imagery unless an appropriate existing asset is already available.

---

#### New "Platform Modules" Section

Replace the current **"How it works"** section with a clean, 3-column layout highlighting the core pillars of the platform.

### 1. Interactive Learning Modules

**Description:**  
"Step-by-step curriculum to take you from beginner to advanced."

**Icon:** `BookOpen`

The card should communicate that students learn through structured lessons and interactive activities rather than static content.

---

### 2. Hands-on Projects

**Description:**  
"Build and showcase real-world applications in your personal portfolio."

**Icon:** `LayoutDashboard`

This should connect visually and conceptually to the platform's project and showcase experience.

---

### 3. Coding Challenges

**Description:**  
"Sharpen your skills with bite-sized coding challenges and practical problem-solving exercises."

**Icon:** `Trophy` or an appropriate coding/challenge icon.

Do **not** mention leaderboards, XP, badges, streaks, or other gamification features that are not currently implemented.

---

#### New "How ePawatech Works" Section

Add a simple four-step section explaining the student's journey through the platform:

1. **Learn**
   - Explore structured technology lessons and learning tracks.

2. **Practice**
   - Test your knowledge through interactive activities and coding challenges.

3. **Build**
   - Apply your skills by creating practical projects.

4. **Showcase**
   - Present completed work and build a technology portfolio.

Visually communicate the journey as:

**Learn → Practice → Build → Showcase**

Use a clean timeline, connected cards, or another layout that fits the redesigned visual style.

---

#### Learning Tracks Preview

Add a section that gives visitors a preview of the available learning areas.

Use the **actual Learning Tracks already defined in the application** rather than creating fictional tracks.

Each track can display:

- Track title
- Short description
- Appropriate icon
- CTA such as "Explore Track"

If progress information is already available and appropriate for the homepage, it may be displayed for authenticated users.

---

#### Projects / Showcase Preview

Add a section introducing the project's showcase experience.

**Section Heading:**  
"Build Something Real"

**Supporting Text:**  
"Learning becomes more powerful when you turn it into something you can show."

Where approved showcase projects are available, display a small selection of project cards.

Each card may include:

- Project image
- Project title
- Short description
- Technology/category
- "View Project" CTA

If there are no showcase projects yet, use a polished empty state rather than fabricated projects.

---

#### Final Call-to-Action

Add a strong CTA near the bottom of the homepage.

**Heading:**  
"Your Tech Journey Starts Here"

**Supporting Text:**  
"Learn new skills, solve challenges, build projects, and start creating the future."

**Button:**  
"Start Learning"

---

#### Navigation

Review the homepage navigation as part of the redesign.

The primary navigation should make the main platform areas easy to access, such as:

- Home
- Learning
- Challenges
- Projects / Showcase

Use the actual routes already available in the application.

Do not create links to features that have not been implemented.

Ensure the navigation remains responsive on desktop and mobile.

---

#### Visual & UX Direction

The redesign should feel like a genuine **ePawatech brand refresh**.

Use:

- Strong typography hierarchy
- Generous spacing
- Modern rounded cards
- Subtle shadows and borders
- Consistent iconography
- Responsive layouts
- Subtle hover states
- Light, purposeful animations
- Accessible contrast
- Mobile-friendly layouts

Avoid:

- Excessive animations
- Excessive gradients
- Cluttered cards
- Generic stock imagery
- Fake statistics
- Fake testimonials
- Fake student achievements
- Promising features that have not been implemented

The homepage should feel credible and authentic.

---

#### Branding

Use **ePawatech** consistently throughout the visible homepage branding.

Do not display internal naming such as `Pugolfers` as the product name.

The existing component filename can remain:

`components/pugolfers-app.tsx`

unless there is a technical reason to rename it, but all visible branding should use **ePawatech**.

---

#### Implementation Constraints

Before implementing the redesign:

1. Inspect the current `components/pugolfers-app.tsx`.
2. Identify existing routes and reusable UI components.
3. Reuse the existing design system and components where appropriate.
4. Reuse existing icons and assets where possible.
5. Do not break existing authentication or navigation.
6. Do not create fake data to populate homepage sections.
7. Ensure all CTAs point to real functionality.
8. Keep the homepage fully responsive.
9. Ensure the redesign remains compatible with the current Weeks 1–8 curriculum architecture.
10. Do not implement the full gamification system as part of this redesign.

---

#### Homepage Structure

The final homepage should generally follow this hierarchy:

**Hero → Platform Modules → Learn/Practice/Build/Showcase → Learning Tracks → Project Showcase → Final CTA**

The overall message should be clear:

> **ePawatech helps young people learn technology, practice their skills, build real things, and showcase what they create.**