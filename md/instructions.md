# Gmail Plugin: Smart Sidebar Summarizer

## Overview

Build a Gmail plugin that runs as a **sidebar extension within the Gmail web interface**. This plugin should **automatically detect and refresh its contents whenever a new email is opened** in the Gmail view. This should run as a Chrome plugin, and not require any other backends. All data should come from reading the contents of the browser window, and it should not need any OAuth or other direct connections to google.

---

## Core Requirements

### 1. Trigger Behavior
- Detect when a user opens a new message.
- Upon detection, extract the following email metadata:
  - Sender’s name/email
  - Subject line
  - Full email body text
- Pass this content to **ChatGPT-4o via API** to generate structured summaries and insights.

### 2. Plugin UI Elements (Sidebar Layout)
- **Sender:** Display the sender's name/email address.
- **Subject:** Display the subject of the email.
- **Summary:** Use ChatGPT-4o to generate **3–5 bullet points** summarizing the key content of the email in a concise, helpful way.
- **Calendar Links Section:**
  - Use ChatGPT-4o to extract any date- or time-based events mentioned in the email (e.g., meetings, deadlines, appointments).
  - For each extracted event, display:
    - **Event title/description**
    - **Date and time**
    - A **one-click Google Calendar link** that pre-fills the event details using the [Google Calendar Event Creation URL format](https://developers.google.com/calendar/api/guides/create-events).
  - Example format per event:
    - 📅 **"Call with Sarah about Q3 roadmap"**  
      🕒 **Tuesday, May 7 at 2pm**  
      [Add to Calendar]

### 3. Design Notes
- The sidebar should have a clean, minimal interface using Gmail-style fonts and spacing.
- Display sections in the following order:
  1. Sender
  2. Subject
  3. Summary bullets
  4. Calendar Links
- Refresh content dynamically without requiring manual input or refresh buttons.


