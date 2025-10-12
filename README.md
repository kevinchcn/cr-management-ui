## CR Management UI (cr-management-ui)

A comprehensive Change Request management system built with Vue.js frontend and Python backend, featuring LDAP authentication and metrics monitoring.

## Key Features
- 🔐 LDAP Authentication - Secure corporate login integration
- 📋 CR Management - Create, view, and manage change requests
- 📊 Metrics Dashboard - Detailed metrics and compliance checking
- ✅ Batch Operations - Approve or reject multiple CRs at once
- 👥 Role-based Access - Different permissions for admins, approvers, and requesters
- 📱 Responsive Design - Works on desktop and mobile devices

## Quick Start (local preview)
- Python 3.7+
- LDAP server (for production) or use mock authentication (for development)

### Installation
1.Clone or download the project files
- server.py - Python backend server
- index.html - Vue.js frontend application
2.Install Python dependencies
PowerShell example:
```powershell
pip install ldap3
```
3.Configure LDAP (Optional)
For production use, update LDAP settings in server.py:
```powershell
LDAP_SERVER = 'ldap://your-ldap-server.com'
LDAP_BIND_DN = 'cn=admin,dc=company,dc=com'
LDAP_BIND_PASSWORD = 'your-password'
LDAP_SEARCH_BASE = 'ou=users,dc=company,dc=com'
LDAP_SEARCH_FILTER = f'(uid={username})'
```

## Running the Application
1.Start the backend server
```powershell
python server.py
```
2.Access the application
Open your browser and navigate to:
```powershell
http://localhost:8000
```
## Test Accounts
For development and testing, use these credentials (password: admin for all):
- admin - System Administrator
- boss - Approver role
- kevin - Requester role

## API Endpoints
Authentication
- POST /api/ldap/auth - LDAP user authentication
Change Requests
- GET /api/change-requests - Get all change requests
- GET /api/change-requests/CHG123456 - Get specific CR metrics
- POST /api/change-requests/batch-approve - Batch approve CRs
- POST /api/change-requests/batch-reject - Batch reject CRs

## Contributing
If you want to improve or extend the demo, feel free to open a PR or file an issue describing your proposal.

## License
MIT License - feel free to use this project for personal or commercial purposes.