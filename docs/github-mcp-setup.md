# GitHub MCP Setup

The GitHub MCP server is configured in `.claude/mcp.json` but requires a personal access token to activate.

## One-time setup

1. Go to: `https://github.com/settings/tokens`
2. Click **Generate new token (classic)**
3. Name it: `Claude Code - CFv1`
4. Scopes needed: `repo`, `read:org`, `read:user`
5. Generate and copy the token

6. Open Windows Environment Variables:
   - Press `Win + R` → type `sysdm.cpl` → Enter
   - Click **Advanced** tab → **Environment Variables**
   - Under **User variables**, click **New**
   - Variable name: `GITHUB_PERSONAL_ACCESS_TOKEN`
   - Variable value: (paste your token)
   - Click OK

7. Restart Claude Code completely (close and reopen)

## Verify it works

After restart, run `/mcp` in Claude Code. You should see `github` listed as a connected server.

## What you can do with it

- Create GitHub issues directly from bugs found mid-session
- Check PR status without leaving Claude Code
- Read files from other branches
- List open PRs, issues, and reviews

## Commands

The GitHub MCP exposes tools automatically. You'll see them in Claude's tool list after connection. No slash commands needed - just ask Claude to "create an issue for this bug" or "check what PRs are open."
