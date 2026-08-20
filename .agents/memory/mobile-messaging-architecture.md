---
name: Mobile-first messaging architecture
description: Durable decisions for the Northstar workplace messaging product.
---

The first release is a native Expo/React Native experience, not a web wrapper. It uses local mock data behind typed domain interfaces so the UI can be validated before adding backend services.

**Why:** The product owner is new to mobile development and explicitly wants to approve the complete mobile experience before connecting Supabase.

**How to apply:** Preserve the screen/data contracts when moving to Supabase; replace the context/service implementation and enforce approval, membership, and role permissions in the backend/database.