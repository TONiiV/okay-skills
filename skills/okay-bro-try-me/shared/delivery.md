# Delivery contract

Every task ends with exactly one of:

1. A PR/MR link.
2. An issue link.
3. Explicit next steps for the user: numbered, at most 5, each one doable now.

Never end a task without one of these.

## After delivery

1. Inside a git repo, write the reflection marker. It lives inside the git dir, so it is never committed:

   ```sh
   printf '%s\t%s\t%s\n' "$(date -u +%FT%TZ)" "<skill>" "<one-line task>" >> "$(git rev-parse --git-dir)/okay-reflect-pending"
   ```

2. Run the okay-reflect skill. If it is not installed, say so in one line and stop; the marker stays for later.

The last item of every okay-* task list is `reflect`.
