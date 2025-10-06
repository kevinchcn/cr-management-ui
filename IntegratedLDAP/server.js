#!/usr/bin/env python3
"""
CR Management System Backend Server - Fixed Version
"""

import http.server
import socketserver
import json
import urllib.parse
from datetime import datetime
import os

class CRManagementHandler(http.server.SimpleHTTPRequestHandler):
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Access-Control-Allow-Credentials', 'true')
        self.send_header('Access-Control-Max-Age', '86400')
    
    def do_GET(self):
        """Handle GET requests"""
        print(f"GET request: {self.path}")
        
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
        """Handle POST requests - FIXED VERSION"""
        print(f"POST request: {self.path}")
        
        # Handle CORS
        self.send_cors_headers()
        
        content_length = int(self.headers.get('Content-Length', 0))
        print(f"Content-Length: {content_length}")
        
        if content_length == 0:
            self.send_error(400, "No data received")
            return
            
        post_data = self.rfile.read(content_length)
        print(f"Raw data: {post_data}")
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            print(f"Parsed data: {data}")
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            self.send_error(400, f"Invalid JSON: {e}")
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
        """Handle LDAP authentication - FIXED VERSION"""
        try:
            print(f"LDAP auth data: {data}")
            
            # 直接从请求数据中获取用户名和密码
            username = data.get('username', '')
            password = data.get('password', '')
            
            print(f"Auth attempt - Username: {username}, Password: {'*' * len(password)}")
            
            if not username or not password:
                self.send_json_response(400, {
                    'authenticated': False, 
                    'message': 'Username and password are required'
                })
                return
            
            # 测试用户数据
            test_users = {
                'admin': {
                    'password': 'admin', 
                    'name': 'System Administrator', 
                    'role': 'admin', 
                    'email': 'admin@company.com'
                },
                'boss': {
                    'password': 'admin', 
                    'name': 'Boss', 
                    'role': 'approver', 
                    'email': 'boss@company.com'
                },
                'kevin': {
                    'password': 'admin', 
                    'name': 'Kevin', 
                    'role': 'requester', 
                    'email': 'kevin@company.com'
                }
            }
            
            # 检查用户是否存在且密码正确
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
                print(f"Authentication SUCCESS for user: {username}")
                self.send_json_response(200, response)
            else:
                print(f"Authentication FAILED for user: {username}")
                self.send_json_response(401, {
                    'authenticated': False, 
                    'message': 'Invalid username or password'
                })
            
        except Exception as e:
            print(f"Auth error: {str(e)}")
            self.send_json_response(500, {
                'authenticated': False, 
                'message': f'Internal server error: {str(e)}'
            })
    
    def handle_get_crs(self):
        """Handle GET change requests"""
        try:
            print("Fetching CR data...")
            
            # Mock CR data
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
            print("CR data sent successfully")
            
        except Exception as e:
            print(f"Error getting CRs: {str(e)}")
            self.send_json_response(500, {'message': 'Internal server error'})
    
    def handle_batch_approve(self, data):
        """Handle batch approval of CRs"""
        try:
            print(f"Batch approve data: {data}")
            
            ids = data.get('ids', [])
            approved_by = data.get('approvedBy', 'Unknown')
            
            print(f"Batch approving CRs: {ids} by {approved_by}")
            
            response = {
                'success': True,
                'message': f'Successfully approved {len(ids)} change requests',
                'approvedBy': approved_by,
                'approvedAt': datetime.now().isoformat()
            }
            
            self.send_json_response(200, response)
            print("Batch approve successful")
            
        except Exception as e:
            print(f"Batch approve error: {str(e)}")
            self.send_json_response(500, {'success': False, 'message': 'Internal server error'})
    
    def handle_batch_reject(self, data):
        """Handle batch rejection of CRs"""
        try:
            print(f"Batch reject data: {data}")
            
            ids = data.get('ids', [])
            rejected_by = data.get('rejectedBy', 'Unknown')
            
            print(f"Batch rejecting CRs: {ids} by {rejected_by}")
            
            response = {
                'success': True,
                'message': f'Successfully rejected {len(ids)} change requests',
                'rejectedBy': rejected_by,
                'rejectedAt': datetime.now().isoformat()
            }
            
            self.send_json_response(200, response)
            print("Batch reject successful")
            
        except Exception as e:
            print(f"Batch reject error: {str(e)}")
            self.send_json_response(500, {'success': False, 'message': 'Internal server error'})
    
    def send_json_response(self, status_code, data):
        """Send JSON response with CORS headers"""
        try:
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_cors_headers()
            self.end_headers()
            
            json_data = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.wfile.write(json_data)
            
            print(f"Response sent: {status_code} - {data.get('authenticated', 'N/A')}")
            
        except Exception as e:
            print(f"Error sending response: {str(e)}")
    
    def log_message(self, format, *args):
        """Custom log message format"""
        print(f"{self.log_date_time_string()} - {format % args}")

def main():
    PORT = 8000
    
    # Change to the directory where the files are located
    web_dir = os.path.join(os.path.dirname(__file__))
    os.chdir(web_dir)
    
    # Check if index.html exists
    if not os.path.exists('index.html'):
        print("ERROR: index.html not found in current directory!")
        print("Please make sure index.html is in the same directory as server.py")
        return
    
    with socketserver.TCPServer(("", PORT), CRManagementHandler) as httpd:
        print("=" * 60)
        print(f"CR Management System Server")
        print(f"Running at http://localhost:{PORT}")
        print("=" * 60)
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
        print("=" * 60)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()