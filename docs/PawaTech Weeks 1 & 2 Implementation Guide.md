# PawaTech Weeks 1 & 2 Implementation Guide

## Purpose

This document explains how to implement **Week 1** and **Week 2** of the PawaTech curriculum.

The goal is to build a working learning experience **without implementing the complete gamification system yet.**

Instead of building badges, XP calculations, leaderboards, achievements, streaks, and reward logic now, we will simply leave clean placeholders so these systems can be connected later with minimal changes.

---

# General Principles

## Build First

Focus on:

- Learning Tracks
- Lessons
- Interactive activities
- Lesson completion
- Student progress
- Challenges

Do NOT spend time implementing:

- Badge engine
- XP calculations
- Leaderboards
- Streak system
- Achievement unlocks

Those systems will be implemented later.

---

# Placeholder Gamification

Create a lightweight service that every lesson can call.

Example:

```ts
GamificationService.onLessonCompleted()
GamificationService.onChallengeCompleted()
```

For now these functions should only:

- log to console

or

- return success

Example:

```ts
export const GamificationService = {
    async onLessonCompleted(studentId, lessonId){
        console.log("Placeholder: lesson completed");
    },

    async onChallengeCompleted(studentId, challengeId){
        console.log("Placeholder: challenge completed");
    }
}
```

Nothing else.

Later these same functions will:

- Award XP
- Unlock badges
- Update streaks
- Update leaderboard
- Trigger achievements

This keeps the architecture clean without implementing unnecessary logic today.

---

# Progress Tracking

Progress should still be saved.

Suggested table:

```
LessonProgress

id
student_id
lesson_id
completed
score
completed_at
```

Every lesson should call

```
POST /api/progress
```

when finished.

This is independent of the future badge system.

---

# Week 1

## Learning Track

Slug

```
computer-fundamentals
```

Title

```
Computer Fundamentals
```

---

# Lessons

Create five lessons.

## Lesson 1

Introduction to Computers

Topics

- What is a computer?
- Types of computers
- Everyday uses

Activity

Simple multiple-choice quiz.

---

## Lesson 2

Parts of a Computer

Topics

- Monitor
- Keyboard
- Mouse
- CPU
- Printer
- Speakers

Activity

Interactive drag-and-drop using dnd-kit.

Students drag labels onto a computer illustration.

Correct placement immediately highlights green.

Incorrect placement returns to the original position.

When all labels are correct:

- Save lesson progress
- Call

```
GamificationService.onLessonCompleted()
```

---

## Lesson 3

Input vs Output Devices

Students classify devices.

Input

- Mouse
- Keyboard
- Scanner

Output

- Printer
- Speakers
- Monitor

Use drag-and-drop or two-column sorting.

---

## Lesson 4

Hardware vs Software

Students classify items.

Hardware

- Mouse
- Keyboard
- Monitor

Software

- Windows
- Microsoft Word
- Chrome

Immediate feedback is enough.

---

## Lesson 5

Computer Care

Topics

- Clean computer properly
- Don't spill liquids
- Shut down correctly
- Don't pull cables

Activity

Multiple-choice quiz.

---

# Week 1 Final Challenge

Challenge name

```
Computer Detective
```

Students identify all computer parts within a time limit.

Store

```
challenge_score
completion_time
```

After completion call

```
GamificationService.onChallengeCompleted()
```

No badge logic.

No XP.

Only placeholder.

---

# Week 2

Learning Track

```
digital-productivity
```

Title

```
Microsoft Word & PowerPoint
```

---

# Lesson 1

Keyboard Basics

Students learn keyboard layout.

Activity

Press highlighted keys.

Measure

- correct key presses

No scoring system required beyond pass/fail.

---

# Lesson 2

Typing Practice

Implement either

- Keybr integration

or

- Custom typing test

Measure

- WPM
- Accuracy

Save

```
WPMResult

student_id
wpm
accuracy
created_at
```

No ranking.

No leaderboard.

---

# Lesson 3

Microsoft Word Basics

Instead of integrating Microsoft Word,

build a lightweight rich-text editor.

Recommended libraries

- Tiptap

or

- Lexical

Students should practice

- Bold
- Italic
- Underline
- Alignment
- Bullets

Mission

Create a birthday invitation.

Validation

Check whether required formatting was used.

---

# Lesson 4

PowerPoint Basics

Build a very simple slide editor.

Students create

Slide 1

Title

Slide 2

Content

Slide 3

Thank You

Students should be able to

- Add text
- Add image
- Choose simple theme

No animations needed.

---

# Lesson 5

Presentation Skills

Simple quiz covering

- good slide design
- readability
- using images
- avoiding too much text

---

# Week 2 Final Challenge

Challenge

Office Skills Challenge

Student completes

- Typing exercise
- Word formatting exercise
- Three-slide presentation

Store completion.

Call

```
GamificationService.onChallengeCompleted()
```

Nothing else.

---

# Folder Structure

Suggested structure

```
app/

learn/

computer-fundamentals/

lesson-1
lesson-2
lesson-3
lesson-4
lesson-5
challenge

digital-productivity/

lesson-1
lesson-2
lesson-3
lesson-4
lesson-5
challenge
```

---

# Components

Reusable components

```
LessonLayout

ProgressBar

Quiz

DragDropExercise

TypingTest

RichTextEditor

SlideEditor

ChallengeScreen
```

---

# Future Gamification Integration

Everything should call the placeholder service.

Never directly calculate XP inside lessons.

Instead

```
Lesson

↓

GamificationService

↓

(Currently placeholder)

↓

Future

XP Engine
Badge Engine
Achievement Engine
Leaderboard
Streaks
```

This prevents refactoring later.

---

# Definition of Done

Week 1 is complete when:

- All five lessons work.
- Drag-and-drop activity works.
- Quizzes work.
- Progress saves correctly.
- Final challenge works.
- Placeholder gamification functions are called.

Week 2 is complete when:

- Keyboard lesson works.
- Typing test records WPM.
- Rich text editor works.
- Slide editor works.
- Final challenge works.
- Progress saves correctly.
- Placeholder gamification functions are called.

---

# Notes for Codex

- Keep components modular and reusable.
- Separate lesson content from UI where possible.
- Do not hard-code gamification logic inside lessons.
- Use placeholder service methods for future rewards.
- Build with future Weeks 3–8 in mind, where the same lesson and challenge patterns will be reused.