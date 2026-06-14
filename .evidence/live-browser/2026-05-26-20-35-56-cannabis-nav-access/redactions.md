# Redactions

Record anything omitted, blurred, cropped, summarized, or intentionally not shared.

| Item                              | Location                                     | Redaction action                                                                                                | Reason                                                                  |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Account footer details            | Client sidebar/mobile menu screenshots       | Captured only nav-link containers where possible; final answer summarizes instead of embedding raw screenshots. | Avoid exposing account/session details.                                 |
| Test auth credentials and cookies | `.auth/client.json`, scripts, console output | Not quoted or surfaced.                                                                                         | Secrets and session material are not needed for the user-facing answer. |
