# Public Layer - Auth Failure States

**Version**: 1.0
**Date**: 2026-02-14
**Status**: LOCKED

---

## Purpose

Comprehensive catalog of all authentication failure scenarios and how they're handled.

---

## Signin Failures

### 1. Invalid Email
**Trigger**: Email doesn't exist in auth.users
**Message**: "Invalid email or password"
**Action**: Show inline error, allow retry

---

### 2. Invalid Password
**Trigger**: Password is incorrect
**Message**: "Invalid email or password" (same as invalid email)
**Action**: Show inline error, allow retry

---

### 3. Orphaned Account
**Trigger**: User exists in auth.users but NOT in user_roles
**Message**: "Your account is incomplete. Please contact support."
**Action**: Redirect to `/error?code=no_role`

---

### 4. Rate Limited
**Trigger**: 5+ failed attempts in short period (Supabase automatic)
**Message**: "Too many attempts. Please try again in 5 minutes."
**Action**: Temporary lockout, allow retry after cooldown

---

## Signup Failures

### 5. Email Already Exists
**Trigger**: Email already in auth.users
**Message**: "Email already in use. Please sign in instead."
**Action**: Show inline error + link to /signin

---

### 6. Weak Password
**Trigger**: Password <8 characters
**Message**: "Password must be at least 8 characters"
**Action**: Show inline error, allow retry

---

### 7. Invalid Invitation Token
**Trigger**: Token not found, expired, or already used
**Message**: "This invitation is invalid or has expired."
**Action**: Show full-page error, prevent signup

---

### 8. Database Insert Failure
**Trigger**: Insert into chefs/clients/user_roles fails
**Message**: "Unable to create account. Please try again."
**Action**: Show inline error, allow retry

---

## Network Failures

### 9. Supabase Unavailable
**Trigger**: Network error, Supabase outage
**Message**: "Unable to connect. Please check your connection and try again."
**Action**: Show inline error, allow retry

---

### 10. Timeout
**Trigger**: Request takes >10s
**Message**: "Request timed out. Please try again."
**Action**: Show inline error, allow retry

---

**Status**: Auth failure states are LOCKED for V1.
