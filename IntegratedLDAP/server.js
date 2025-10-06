#!/usr/bin/env python3
"""
CR Management System Backend Server
Provides LDAP authentication and CR management API
"""

import http.server
import socketserver
import json
import urllib.parse
import ldap3
from datetime import datetime
import os
import sys

class CRManagementHandler(http.server.SimpleHTTPRequestHandler):
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Credentials', 'true')
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/change-requests':
            self.handle_get_crs()
        elif self.path == '/':
            # Serve the main HTML file
            self.path = '/index.html'
            return super().do_GET()
        elif self.path.startswith('/api/'):
            self.send_error(404, "API endpoint not found")
        else:
            # Serve static files
            return super().do_GET()
    
    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return
        
        if self.path == '/api/ldap/auth':
            self.handle_ldap_auth(data)
        elif self.path == '/api/change-requests/batch-approve':
            self.handle_batch_approve(data)
        elif self.path == '/api/change-requests/batch-reject':
            self.handle_batch_reject(data)
        else:
            self.send_error(404, "API endpoint not found")
    
    def handle_ldap_auth(self, data):
        """Handle LDAP authentication"""
        try:
            username = data.get('username', '')
            password = data.get('password', '')
            
            print(f"LDAP Auth attempt for user: {username}")
            
            # LDAP configuration - UPDATE THESE FOR YOUR ENVIRONMENT
            LDAP_SERVER = 'ldap://your-ldap-server.com'  # Replace with your LDAP server
            LDAP_BIND_DN = 'cn=admin,dc=company,dc=com'  # Replace with your bind DN
            LDAP_BIND_PASSWORD = 'password'  # Replace with your bind password
            LDAP_SEARCH_BASE = 'ou=users,dc=company,dc=com'  # Replace with your search base
            LDAP_SEARCH_FILTER = f'(uid={username})'  # Adjust filter for your LDAP
            
            # For testing/demo purposes - simple username/password check
            # Remove this in production and use real LDAP authentication
            test_users = {
                'admin': {'password': 'admin', 'name': 'System Administrator', 'role': 'admin', 'email': 'admin@company.com'},
                'boss': {'password': 'admin', 'name': 'Boss', 'role': 'approver', 'email': 'boss@company.com'},
                'kevin': {'password': 'admin', 'name': 'Kevin', 'role': 'requester', 'email': 'kevin@company.com'}
            }
            
            if username in test_users and test_users[username]['password'] == password:
                user_info = test_users[username]
                response = {
                    'authenticated': True,
                    'token': f'ldap-token-{username}-{datetime.now().timestamp()}',
                    'user': {
                        'name': user_info['name'],
                        'email': user_info['email'],
                        'role': user_info['role'],
                        'username': username
                    }
                }
                self.send_json_response(200, response)
                print(f"LDAP Auth successful for user: {username}")
                return
            
            # Real LDAP authentication (commented out for now)
            """
            try:
                # Connect to LDAP server
                server = ldap3.Server(LDAP_SERVER)
                connection = ldap3.Connection(
                    server,
                    user=LDAP_BIND_DN,
                    password=LDAP_BIND_PASSWORD,
                    auto_bind=True
                )
                
                # Search for user
                connection.search(
                    search_base=LDAP_SEARCH_BASE,
                    search_filter=LDAP_SEARCH_FILTER,
                    attributes=['cn', 'mail', 'givenName', 'sn', 'memberOf']
                )
                
                if connection.entries:
                    user_dn = connection.entries[0].entry_dn
                    
                    # Try to bind with user credentials
                    user_connection = ldap3.Connection(
                        server,
                        user=user_dn,
                        password=password,
                        auto_bind=True
                    )
                    
                    if user_connection.bound:
                        # Authentication successful
                        user_attrs = connection.entries[0]
                        response = {
                            'authenticated': True,
                            'token': f'ldap-token-{username}-{datetime.now().timestamp()}',
                            'user': {
                                'name': user_attrs.cn.value if hasattr(user_attrs, 'cn') else username,
                                'email': user_attrs.mail.value if hasattr(user_attrs, 'mail') else f'{username}@company.com',
                                'role': self.map_ldap_role(user_attrs.memberOf.value if hasattr(user_attrs, 'memberOf') else []),
                                'username': username
                            }
                        }
                        self.send_json_response(200, response)
                    else:
                        self.send_json_response(401, {'authenticated': False, 'message': 'Invalid credentials'})
                    
                    user_connection.unbind()
                else:
                    self.send_json_response(401, {'authenticated': False, 'message': 'User not found'})
                
                connection.unbind()
                
            except Exception as e:
                print(f"LDAP error: {str(e)}")
                self.send_json_response(500, {'authenticated': False, 'message': f'LDAP error: {str(e)}'})
            """
            
            # If we reach here, authentication failed
            self.send_json_response(401, {'authenticated': False, 'message': 'Invalid credentials'})
            
        except Exception as e:
            print(f"Auth error: {str(e)}")
            self.send_json_response(500, {'authenticated': False, 'message': 'Internal server error'})
    
    def handle_get_crs(self):
        """Handle GET change requests"""
        try:
            # Mock CR data - replace with database in production
            cr_data = [
                {
                    'id': 1001,
                    'title': 'User Login Function Optimization',
                    'description': 'Improve user login process to enhance user experience',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-15T00:00:00Z',
                    'status': 'pending'
                },
                {
                    'id': 1002,
                    'title': 'Database Index Optimization',
                    'description': 'Optimize database indexes related to user queries',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-18T00:00:00Z',
                    'status': 'approved'
                },
                {
                    'id': 1003,
                    'title': 'Payment Interface Upgrade',
                    'description': 'Upgrade payment interface from V1 to V2 version',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-20T00:00:00Z',
                    'status': 'pending'
                },
                {
                    'id': 1004,
                    'title': 'Frontend Framework Migration',
                    'description': 'Migrate frontend framework from Vue2 to Vue3',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-22T00:00:00Z',
                    'status': 'rejected'
                },
                {
                    'id': 1005,
                    'title': 'Add Data Export Function',
                    'description': 'Add Excel data export function for users',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-25T00:00:00Z',
                    'status': 'pending'
                }
            ]
            
            self.send_json_response(200, cr_data)
            
        except Exception as e:
            print(f"Error getting CRs: {str(e)}")
            self.send_json_response(500, {'message': 'Internal server error'})
    
    def handle_batch_approve(self, data):
        """Handle batch approval of CRs"""
        try:
            ids = data.get('ids', [])
            approved_by = data.get('approvedBy', 'Unknown')
            
            print(f"Batch approving CRs: {ids} by {approved_by}")
            
            # In a real application, update these in the database
            # For now, just return success
            response = {
                'success': True,
                'message': f'Successfully approved {len(ids)} change requests',
                'approvedBy': approved_by,
                'approvedAt': datetime.now().isoformat()
            }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            print(f"Batch approve error: {str(e)}")
            self.send_json_response(500, {'success': False, 'message': 'Internal server error'})
    
    def handle_batch_reject(self, data):
        """Handle batch rejection of CRs"""
        try:
            ids = data.get('ids', [])
            rejected_by = data.get('rejectedBy', 'Unknown')
            
            print(f"Batch rejecting CRs: {ids} by {rejected_by}")
            
            # In a real application, update these in the database
            # For now, just return success
            response = {
                'success': True,
                'message': f'Successfully rejected {len(ids)} change requests',
                'rejectedBy': rejected_by,
                'rejectedAt': datetime.now().isoformat()
            }
            
            self.send_json_response(200, response)
            
        except Exception as e:
            print(f"Batch reject error: {str(e)}")
            self.send_json_response(500, {'success': False, 'message': 'Internal server error'})
    
    def map_ldap_role(self, member_of):
        """Map LDAP groups to application roles"""
        if not member_of:
            return 'requester'
        
        groups = member_of if isinstance(member_of, list) else [member_of]
        
        # Adjust these conditions based on your LDAP group structure
        if any('CN=CR_Admins' in group or 'CN=Administrators' in group for group in groups):
            return 'admin'
        if any('CN=CR_Approvers' in group or 'CN=Approvers' in group for group in groups):
            return 'approver'
        if any('CN=CR_Requesters' in group or 'CN=Users' in group for group in groups):
            return 'requester'
        
        return 'requester'
    
    def send_json_response(self, status_code, data):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Custom log message format"""
        print(f"{self.log_date_time_string()} - {format % args}")

def main():
    PORT = 8000
    
    # Change to the directory where the files are located
    web_dir = os.path.join(os.path.dirname(__file__))
    os.chdir(web_dir)
    
    with socketserver.TCPServer(("", PORT), CRManagementHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print("Available endpoints:")
        print("  GET  /api/change-requests - Get all change requests")
        print("  POST /api/ldap/auth - LDAP authentication")
        print("  POST /api/change-requests/batch-approve - Batch approve CRs")
        print("  POST /api/change-requests/batch-reject - Batch reject CRs")
        print("\nTest credentials:")
        print("  admin / admin (Administrator)")
        print("  boss / admin (Approver)")
        print("  kevin / admin (Requester)")
        print("\nPress Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()