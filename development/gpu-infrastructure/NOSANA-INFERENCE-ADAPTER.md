# Nosana Inference Adapter — Candidate

## Status

Status: **candidate / externally verified interface**

This document records the current provider interface used by the NOVA RSI proposer implementation. It does not approve Nosana as the permanent GPU provider for AstroCrown.

## Verified provider interface

The current Nosana LLM inference documentation states that its inference API is OpenAI-compatible and uses:

- Base URL: `https://inference.nosana.com/v1`
- Authentication: `Authorization: Bearer nos_...`
- Model discovery: `GET /v1/models`
- Chat generation: `POST /v1/chat/completions`
- Billing: per token against provider credits

The set of served models is dynamic. The implementation therefore supports explicit model selection and a discovery mode rather than hardcoding a model identity.

Source:

https://learn.nosana.com/api/llm.html

## Repository integration

The RSI provider adapter is:

`development/nova-recursive-self-improvement/provider_client.py`

Protected configuration names are defined by:

`development/nova-recursive-self-improvement/rsi_policy.json`

The provider key is intentionally represented only by its environment-variable name:

`RSI_AI_API_KEY`

The actual value must remain outside tracked files.

## Credential boundary

No provider credential is stored in this repository.

The workflow is designed to receive the provider credential only at the final external-access boundary, after implementation-readiness and non-secret configuration gates have passed.

The RSI engine removes the provider key from its own process environment immediately after the proposer call and starts candidate evaluation with a separate sanitized environment.

## Free/zero-cost interpretation

Nosana's documented inference interface is credit-metered. This repository does not treat the provider as an unlimited free-GPU resource. Any free credits, promotional allocation, or other zero-cost access must be verified at the time of use and recorded separately from the technical API integration.

## Provider independence

The adapter is deliberately OpenAI-compatible rather than hardwired to provider-specific request code beyond the configured endpoint. A different verified provider can be substituted through the protected provider configuration when requirements and evidence justify it.
