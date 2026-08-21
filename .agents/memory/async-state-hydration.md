---
name: Async state hydration
description: Safe restore ordering for app-wide local persistence.
---

Keep screens that can mutate persisted state unavailable until asynchronous storage restoration has completed.

**Why:** Rendering defaults while storage is still loading creates a window where user actions can target placeholder data or be overwritten by the incoming snapshot. A save effect can also replace the snapshot with defaults before the read completes.

**How to apply:** Track hydration inside the state provider, prevent writes until it is complete, and render a lightweight loading shell in place of application routes until the restored state is ready.