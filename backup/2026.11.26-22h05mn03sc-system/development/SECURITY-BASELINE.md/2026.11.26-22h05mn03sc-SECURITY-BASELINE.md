# Development Environment Security Baseline

## Purpose

This document establishes the minimum security baseline for the AstroCrown Web development environment.

Security status must be based on evidence. If evidence is unavailable, the result shall be recorded as BLOCKED rather than PASS.

## Security Verification Matrix

| ID | Area | Result |
|------|------|------|
| SEC-001 | Repository Visibility | UNVERIFIED |
| SEC-002 | Repository Write Permissions | UNVERIFIED |
| SEC-003 | Branch Protection / Rules | UNVERIFIED |
| SEC-004 | Authentication / MFA | UNVERIFIED |
| SEC-005 | Secret Exposure | UNVERIFIED |
| SEC-006 | GitHub Actions Exposure | UNVERIFIED |
| SEC-007 | Dependency Exposure | UNVERIFIED |
| SEC-008 | Backup Exposure | UNVERIFIED |
| SEC-009 | Development / Public Boundary | UNVERIFIED |
| SEC-010 | Unauthorized Modification | UNVERIFIED |
| SEC-011 | Supply-Chain Risk | UNVERIFIED |
| SEC-012 | Developer Machine Boundary | UNVERIFIED |
| SEC-013 | Future Web Application Attack Surface | UNVERIFIED |
| SEC-014 | Logging / Evidence | UNVERIFIED |
| SEC-015 | Recovery After Compromise | UNVERIFIED |

## Security Review Rule

Unknown status = BLOCKED.

Evidence takes precedence over assumptions.

## Reassessment Trigger

Re-run this baseline when repository permissions, visibility, dependencies, workflows, deployment mechanisms, authentication methods, architecture, or security posture changes.
