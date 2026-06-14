# Redactions

| Item                             | Location                             | Redaction action                         | Reason                                                      |
| -------------------------------- | ------------------------------------ | ---------------------------------------- | ----------------------------------------------------------- |
| Test account passwords           | Browser actions and local auth files | Not repeated in report or final response | Credentials are not needed for the completion note.         |
| Local `.env.local` secret values | Shell preflight output               | Not repeated in report or final response | Secrets are unrelated to the requested portal-opening task. |
