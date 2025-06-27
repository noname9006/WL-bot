# WL-bot

WL-bot is a Discord bot designed to distribute invite codes with fine-grained, role-based access control—perfect for whitelisting campaigns like Bitcoin City 2100. It provides both user-friendly slash commands and powerful admin commands to manage access, limits, and reporting.

---

## Table of Contents

- [Features](#features)
- [Commands](#commands)
  - [User Command](#user-command)
  - [Admin Commands](#admin-commands)
- [Typical Scenarios](#typical-scenarios)
- [Setup & Configuration](#setup--configuration)
- [Environment Variables](#environment-variables)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Claim unique invite codes via a Discord slash command.
- Whitelist management: restrict code claiming to specific roles.
- Admin command suite for whitelist, claim limits, and export.
- CSV export of all claimed invites for reporting or analysis.
- Permission checks to ensure only authorized users run admin commands.

---

## Commands

### User Command

- **`/2100`**
  - Start your Bitcoin City 2100 journey.
  - If eligible (i.e., you have a whitelisted role), you’ll receive your invite code.
  - If you’ve already claimed a code, the bot will remind you of your code.
  - If you are not eligible, you’ll receive a friendly notice.

### Admin Commands

_All admin commands require Administrator permissions on the Discord server and use the `>` prefix._

- **`>wl`**
  - Display the current whitelist of roles allowed to claim codes.

- **`>wl [role]`**
  - Add a Discord role to the whitelist (mention or ID).

- **`>wl rm [role]`**
  - Remove a role from the whitelist.

- **`>wl set [number]`**
  - Set claim limits for roles.

- **`>wl check`**
  - Show current whitelist and claim limits.

- **`>export`**
  - Export all claimed invite codes to a CSV file.

---

## Typical Scenarios

- **Onboarding:**  
  New users run `/2100` to instantly claim their invite code (if eligible). Returning users can re-run the command to receive their code again.

- **Whitelist Management:**  
  Server admins use `>wl` commands to add or remove roles from the whitelist, or set per-role claim limits.

- **Exporting Data:**  
  Admins run `>export` to generate a CSV file of all claimed invite codes—useful for reporting, analytics, or sharing with partners.

---

## Setup & Configuration

1. **Clone the repository:**
   ```bash
   git clone https://github.com/noname9006/WL-bot.git
   cd WL-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**  
   Copy `.env.example` (if available) to `.env` and set your values, or set them directly in your environment.

4. **Run the bot:**
   ```bash
   node .
   ```

---

## Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token.
- `INVITE_CHANNEL`: (Optional) Comma-separated list of channel IDs where `/2100` can be used.

Refer to comments in `config.js` for further configuration options.

---

## File Structure

- `2100.js` — Main bot logic and event handlers
- `config.js` — Central configuration (commands, paths, etc.)
- `messages.js` — User-facing messages for all scenarios
- `whitelist.js` — Whitelist/role management module
- `codes.csv` — (Runtime) Stores claimed invite codes
- `whitelist.json` — (Runtime) Stores whitelisted roles
- `botstate.json` — (Runtime) Stores claim limits and state

---

## Contributing

Pull requests are welcome! For major changes, open an issue first to discuss what you would like to change or improve.

1. Fork the repo.
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request.

---

## License

MIT

---