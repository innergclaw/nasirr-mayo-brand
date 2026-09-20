---
name: INNERG INTEL
description: An editorial learning and ownership system built around verified access.
colors:
  paper: "#f3f2ec"
  surface: "#fbfaf5"
  ink: "#11130f"
  muted: "#656b63"
  acid: "#c7ff38"
  dark: "#090b09"
  dark-muted: "#acb2aa"
  member-ivory: "#f3eee3"
  focus: "#5675d1"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(55px, 8.4vw, 106px)"
    lineHeight: 0.86
    letterSpacing: "-0.06em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "clamp(37px, 5vw, 66px)"
    lineHeight: 0.92
    letterSpacing: "-0.045em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "0.12em"
rounded:
  media: "10px"
  control: "12px"
  panel: "24px"
  pill: "999px"
spacing:
  control-x: "18px"
  control-y: "14px"
  section-sm: "36px"
  section-lg: "100px"
components:
  button-primary:
    backgroundColor: "{colors.acid}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 18px"
    height: "50px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "14px 18px"
    height: "50px"
---

# Design System: INNERG INTEL

## Overview

INNERG uses a restrained editorial system. Warm cream pages carry the public explanation. Near-black panels mark paid access, protected media, and verified member state. Acid green signals the action or state that matters now.

The system should feel direct and owned. Use large compact headlines, plain evidence, visible terms, and clear routes between public education and paid access. The INNERG member badge anchors identity without becoming decoration.

## Colors

Use Paper and Surface for public reading areas. Use Ink for type, dividers, and quiet secondary actions. Use Dark with Member Ivory for member and protected-access panels. Reserve Acid for primary actions, selected controls, savings, and active access signals.

**The Acid Signal Rule.** Acid marks the current decision or active state. Do not use it as a general page fill.

## Typography

Inter is the only interface family. Large headings use tight line height and negative tracking. Body copy stays readable and compact. Labels use uppercase text, heavy weight, and wide tracking.

Use tabular numerals for prices and member numbers. Keep supporting copy between 44 and 62 characters per line when the layout permits.

## Layout

Use a centered container with a maximum width of 1120px. Public sales pages can use an asymmetric two-column grid when one choice needs clear visual priority. Collapse the grid to one column at 760px.

Use generous section spacing, then use hairline borders to separate related ideas. Do not surround every section with a card. Full-width editorial strips are the preferred secondary-offer pattern.

## Elevation & Depth

The system is flat by default. Create depth with strong light-to-dark contrast, borders, and nested media frames. Use a soft shadow only on the dominant access panel when it needs separation from the paper background.

## Shapes

Use broad rounded panels for paid access and protected media. Use smaller rounded corners for media frames and selection controls. Actions and compact navigation use pill shapes. Circular treatment is reserved for the member badge and small status marks.

## Components

### Offer hierarchy

**The One Primary Offer Rule.** When membership and a one-time product appear together, the page context chooses one primary offer. Do not present both as equal cards.

On the membership page, place membership in the dominant dark panel. Present the one-time product below it as a full-width editorial strip with border separators and one direct action.

On a one-time product page, let the product, price, and protected watch surface lead. Present membership later as a separate editorial strip. This keeps both payment paths visible without weakening the primary decision.

### Buttons

Primary actions use Acid on Ink with a pill silhouette and a minimum height of 50px. Secondary actions use a transparent fill and an Ink border on light backgrounds. On dark panels, switch the secondary border and text to Member Ivory.

Use a restrained press scale for pointer feedback. Remove that transform when the visitor prefers reduced motion. Keep a visible blue focus outline for keyboard use.

### Pricing controls

Show price, renewal terms, and access duration together. Use radio controls when the buyer must choose between equivalent membership terms. The selected choice gets a clear border, a quiet Acid tint, and an explicit savings statement when one exists.

### Protected watch surface

Use a Dark rounded container, a contained 16:9 player, and compact chapter pills. Acid marks the current chapter. Keep access status and risk language visible outside the player.

### Editorial offer strip

Use one text block and one action. Separate the strip with top and bottom hairlines. Stack the action below the copy on small screens and make it full width.

## Do's and Don'ts

### Do

- Do keep public education useful before the purchase prompt.
- Do state the price, renewal behavior, access duration, and membership relationship in plain language.
- Do use the badge, Dark panels, and Acid state signals to connect access pages to the INNERG ID.
- Do preserve the chosen offer order when the layout collapses on mobile.

### Don't

- Don't use a generic grid of equal pricing cards when the offers have different value and access models.
- Don't let Acid compete across several sections at once.
- Don't hide the one-time path when membership is primary, or hide membership when a premium briefing is primary.
- Don't use market imagery or sales copy to imply guaranteed results.
