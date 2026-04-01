---
name: OpenCLAW VR / MR Spatial Dashboard
description: Revisit note for turning the live Pi-hosted OpenCLAW HQ surface into a VR or mixed-reality command center.
type: project
---

This note captures the far-fetched but viable idea of representing the live OpenCLAW HQ surface in VR or mixed reality so the developer can physically walk around it, inspect agents, and treat the system like a spatial command center.

## Source Surface

- Live page discussed on April 1, 2026: `http://10.0.0.177:8090/game`
- Live page title observed in browser: `OpenCLAW HQ`
- Important caveat: the live `/game` page is Pi-hosted and does **not** match the simpler `scripts/openclaw-dashboard/*` code in this repo.
- Working assumption for any future build: the VR/MR version should treat the live page and its backing API as the source of truth until the Pi-side code is reconciled into source control.

## Core Recommendation

Do **not** try to convert the webpage pixels or DOM directly into "real 3D."

The stronger approach is:

- keep the current Pi endpoint as the data source
- read the same status feed, especially `http://10.0.0.177:8090/api/status`
- rebuild the experience as a spatial scene with native 3D objects, panels, stations, and interactions

That turns the current dashboard into a room rather than a floating screenshot.

## Three Versions Of The Idea

### 1. Flat Screen In VR

Fastest path.

- Open the exact dashboard in a headset browser
- pin it as a giant floating monitor
- no spatial rebuild required

This is the closest thing to "just a few prompts."

### 2. Full 3D Virtual Command Center

The current dashboard becomes a navigable room:

- agent roster becomes physical stations or terminals
- live activity becomes moving holograms, feeds, or conveyor-style flows
- schedule becomes a wall board
- metrics become pillars, floor projections, or status sculptures
- selecting a station opens logs, health, history, and controls

This is the best balance of cool factor and feasibility.

### 3. Mixed Reality Office Overlay

Most ambitious and probably the coolest version.

- keep the developer in the real office
- pin the roster to a wall
- place live activity above a desk
- anchor metric objects around the room
- physically walk between them while wearing the headset

This is the version that matches the "walk around the office" idea most closely.

## Feasibility Reality Check

### What AI / a few prompts can probably get quickly

- a rough WebXR scene
- floating panels
- a sci-fi control-room look
- simple room-scale movement
- a basic connection to the live JSON feed

### What AI / a few prompts will not solve cleanly

- reliable headset controls
- polished room-scale interaction
- mixed-reality anchoring
- readable 3D UI at comfortable distances
- stable performance
- the overall "this feels real" level of finish

## Honest Difficulty Levels

- `Easy`: VR browser view of the existing dashboard on a giant virtual screen
- `Moderate`: a true 3D command room using the same data feed
- `Hard`: mixed reality anchored to the real office with physical walking and good spatial UX

Summary:

- a cool prototype is realistic quickly
- a good VR dashboard is a real build
- a convincing office-scale MR command center is definitely a project, not a prompt trick

## Technical Direction If Revisited

### Correct mental model

- the webpage is the control data source
- the VR/MR app is a separate frontend
- the app should render the system state, not scrape the DOM for visuals

### Good candidate inputs

- `/api/status`
- any other Pi-side status or job endpoints if needed later
- optional future event streams if real-time behavior becomes important

### Good first milestone

Build a first-pass spatial dashboard that:

- connects to the Pi API
- renders agents as stations
- shows live activity as panels or 3D markers
- supports walk-around inspection
- stays read-only at first

### Only after that

- add animated agent avatars
- add voice commands
- add interactive controls
- add mixed-reality room anchoring
- add more theatrical "inside the machine" visual metaphors

## Stack Options Mentioned

Future implementation should choose one of these paths based on headset:

- browser-based `WebXR`
- standalone headset app
- `Unity`
- `Three.js` / `React Three Fiber`

The easiest path depends on the exact headset model.

## Key Constraint To Remember

The live `http://10.0.0.177:8090/game` surface appears to be served from Pi-side code that is newer or otherwise different from the dashboard files in this repo. Any real implementation work should first decide one of these:

1. sync the Pi-side `/game` source back into version control
2. build the VR/MR app directly against the Pi API and ignore the current repo dashboard HTML

## Revisit Questions

When this comes back up, answer these first:

1. What headset model is being used?
2. Is the goal full VR, mixed reality, or both?
3. Is the first milestone a giant VR screen, a true 3D room, or an office overlay?
4. Does the first prototype need read-only monitoring only, or interactive controls too?
5. Should the app be browser-based for speed, or native for better headset support?
