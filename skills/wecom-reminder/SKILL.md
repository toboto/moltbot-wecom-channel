---
name: wecom-reminder
description: Create scheduled reminder tasks for WeCom (Enterprise WeChat) users with proper message delivery configuration. Use when a user in WeCom asks to create a reminder, schedule a notification, or set up a recurring alert. Automatically handles isolated session setup, deliver parameters, and channel routing to ensure messages are successfully sent.
---

# WeCom Reminder Skill

Create scheduled reminder tasks that reliably deliver messages to WeCom (Enterprise WeChat).

## Problem Context

When creating cron tasks through natural language in WeCom, tasks may execute (status: ok) but fail to deliver messages because of missing delivery configuration parameters.

## Solution

Always use the complete `openclaw cron add` command with all delivery parameters.

## Command Template

```bash
openclaw cron add \
  --name '<task-name>' \
  --cron '<cron-expression>' \
  --tz 'Asia/Shanghai' \
  --session isolated \
  --agent default \
  --message '<reminder-message>' \
  --deliver \
  --channel wecom \
  --to wangrui
```

## Required Parameters

- `--name`: Descriptive task name (e.g., "每日报告提醒")
- `--cron`: Cron expression (e.g., "50 8 * * *" for daily 8:50 AM)
- `--tz`: Timezone, always use 'Asia/Shanghai' for Beijing time
- `--session isolated`: Use isolated session to avoid interfering with main session
- `--agent default`: Use default agent (NOT main)
- `--message`: The reminder message text
- `--deliver`: **Critical** - Enables message delivery
- `--channel wecom`: Specifies WeCom as the delivery channel
- `--to wangrui`: Recipient username

## Cron Expression Guide

Common patterns:
- Daily at specific time: `M H * * *` (e.g., `50 8 * * *` = 8:50 AM daily)
- Weekdays only: `M H * * 1-5` (e.g., `0 9 * * 1-5` = 9:00 AM Mon-Fri)
- Specific days: `M H * * 1,3,5` (e.g., `30 14 * * 1,3,5` = 2:30 PM Mon/Wed/Fri)
- Multiple times: `0 9,14,18 * * *` (9 AM, 2 PM, 6 PM daily)

Format: `minute hour day month weekday`
- minute: 0-59
- hour: 0-23 (24-hour format)
- day: 1-31
- month: 1-12
- weekday: 0-7 (0 and 7 are Sunday)

## Usage Workflow

When a user requests a reminder:

1. **Parse the request** to extract:
   - What to remind about (message)
   - When to remind (cron schedule)

2. **Construct the command** using the template above with extracted values

3. **Execute the command** via the Bash tool

4. **Confirm** with the user that the task was created and when it will run

## Examples

**User request:** "每天早上9点提醒我开会"

Extract:
- Message: "⏰ 开会时间到了！"
- Schedule: "0 9 * * *"

Command:
```bash
openclaw cron add \
  --name '每日开会提醒' \
  --cron '0 9 * * *' \
  --tz 'Asia/Shanghai' \
  --session isolated \
  --agent default \
  --message '⏰ 开会时间到了！' \
  --deliver \
  --channel wecom \
  --to wangrui
```

**User request:** "工作日下午5点半提醒我下班"

Extract:
- Message: "⏰ 该下班了！"
- Schedule: "30 17 * * 1-5"

Command:
```bash
openclaw cron add \
  --name '下班提醒' \
  --cron '30 17 * * 1-5' \
  --tz 'Asia/Shanghai' \
  --session isolated \
  --agent default \
  --message '⏰ 该下班了！' \
  --deliver \
  --channel wecom \
  --to wangrui
```

## What NOT to Do

❌ **Never** create tasks without `--deliver --channel wecom --to wangrui`
❌ **Never** use `--agent main` (use `--agent default` instead)
❌ **Never** use `--session main` (use `--session isolated` instead)

## Verification

After creating a task, verify it was created correctly:

```bash
openclaw cron list --json | grep -A20 '<task-id>'
```

Check that the JSON includes:
```json
"payload": {
  "deliver": true,
  "channel": "wecom",
  "to": "wangrui"
}
```

## Troubleshooting

If messages aren't being delivered:
1. Check task status: `openclaw cron list`
2. Verify deliver config: `openclaw cron list --json | grep -A20 '<task-id>'`
3. Check gateway logs: `tail -100 /tmp/openclaw/openclaw-$(date +%Y-%m-%d).log`
