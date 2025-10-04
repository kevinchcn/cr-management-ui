## CR Management UI (cr-management-ui)

A simple Change Request (CR) management interface implemented as a single `index.html` file using Vue 3. This repository hosts a lightweight front-end demo that showcases a CR list, multi-select batch approve/reject actions, and role-based UI behavior.

## Key Features
- Responsive UI with zero build setup (open directly in a browser)
- CR list with multi-select batch approve/reject
- Role-based behavior: admin / approver / requester
- Built-in demo login and mocked data for quick local demos
- Clear inline comments to help swap in real API or LDAP authentication

## Files
- `index.html` — the full demo app (styles, template, and Vue 3 setup script).

## Quick Start (local preview)
The easiest way is to open `index.html` directly in your browser.

If you prefer a local static server (recommended to avoid local-file restrictions), run one in the project root.

PowerShell example:
```powershell
# Start a simple static server using Python (requires Python in PATH)
python -m http.server 8000
# Then open http://localhost:8000/index.html in your browser

# Using Node.js
npx serve .
# Or using Docker
docker build -t cr-management-ui .
docker run -d -p 3000:3000 --name cr-management-app cr-management-ui
# Then open http://localhost:3000 in your browser
```

Or use VS Code Live Server extension and open `index.html`.

## Demo accounts (built-in)
Listed at the bottom of the login page. All demo passwords are `admin`:
- admin — System Administrator (role: `admin`)
- kevin — CR Requester (role: `requester`)
- boss — Approver (role: `approver`)

When you log in, example CRs are loaded with a simulated 1s delay. Role behaviors:
- requester: can view only CRs they submitted, cannot select or approve/reject
- approver / admin: can view all CRs, select items and perform batch approve/reject

## Where to integrate your backend
`index.html` contains commented examples for replacing the demo logic with real services:

- LDAP authentication (see the `ldapService` example and comments)
- REST API examples (the `apiService` object) for login, fetching CRs, and batch actions

Suggested integration steps:
1. Remove or disable the front-end mock authentication and mock data paths.
2. Implement `ldapService.authenticate` or `apiService.login` to call your auth endpoint; store token / user info in localStorage.
3. Replace the mocked `loadCRs` logic with `apiService.fetchCRs(token)`.
4. Replace the simulated logic in `batchApprove` / `batchReject` with API calls and refresh the list after success.

## Data shape (CR object)
The demo CR objects in `index.html` follow this structure:

```js
{
	id: 1001,                    // unique ID (number)
	title: '...',                // title (string)
	description: '...',          // description (string)
	requester: 'Kevin',          // requester's display name (string)
	createdAt: new Date(...),    // Date or ISO string
	status: 'pending'            // 'pending' | 'approved' | 'rejected'
}
```

Make sure your backend returns compatible fields or map them in the frontend.

## Permissions and behavior
- Only users with roles other than `requester` will see checkboxes and batch action buttons.
- `selectAll` / `deselectAll` operate on the currently filtered list (requesters see only their CRs).

## Development & extension suggestions
- For production: split the UI into components, introduce a build tool (Vite / webpack), and move logic into modular JS/TS files.
- After adding a real API, add robust error handling (toasts/notifications), better loading states, and form validation.
- To add export/filter features, extend the `crList` with filters and an export (CSV/Excel) utility.

## Notes
- This demo uses front-end mocked authentication and data. Do not use this implementation as-is in production.
- When integrating a real backend, store tokens securely and use HTTPS endpoints.

## Contributing
If you want to improve or extend the demo, feel free to open a PR or file an issue describing your proposal.

## License
MIT License - feel free to use this project for personal or commercial purposes.