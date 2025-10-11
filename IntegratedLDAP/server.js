#!/usr/bin/env python3
"""
CR Management System Backend Server - Updated Metrics API
"""

import http.server
import socketserver
import json
import urllib.parse
import ldap3
from datetime import datetime
import os
import re

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
        elif self.path.startswith('/api/change-requests/'):
            # 检查是否是新的详情API格式
            if re.match(r'^/api/change-requests/CHG\d+$', self.path):
                self.handle_get_cr_metrics()
            else:
                self.send_error(404, "API endpoint not found")
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
        print(f"POST request: {self.path}")
        
        content_length = int(self.headers.get('Content-Length', 0))
        print(f"Content-Length: {content_length}")
        
        if content_length == 0:
            self.send_error(400, "No data received")
            return
            
        post_data = self.rfile.read(content_length)
        
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
        """Handle LDAP authentication - REAL LDAP ONLY"""
        try:
            print(f"LDAP auth data: {data}")
            
            # 直接从请求数据中获取用户名和密码
            username = data.get('username', '')
            password = data.get('password', '')
            
            print(f"LDAP Auth attempt for user: {username}")
            
            if not username or not password:
                self.send_json_response(400, {
                    'authenticated': False, 
                    'message': 'Username and password are required'
                })
                return
            
            # LDAP configuration - UPDATE THESE FOR YOUR ENVIRONMENT
            LDAP_SERVER = 'ldap://your-ldap-server.com'  # Replace with your LDAP server
            LDAP_BIND_DN = 'cn=admin,dc=company,dc=com'  # Replace with your bind DN
            LDAP_BIND_PASSWORD = 'password'  # Replace with your bind password
            LDAP_SEARCH_BASE = 'ou=users,dc=company,dc=com'  # Replace with your search base
            LDAP_SEARCH_FILTER = f'(uid={username})'  # Adjust filter for your LDAP
            
            print(f"Connecting to LDAP server: {LDAP_SERVER}")
            print(f"Search base: {LDAP_SEARCH_BASE}")
            print(f"Search filter: {LDAP_SEARCH_FILTER}")
            
            try:
                # Connect to LDAP server
                server = ldap3.Server(LDAP_SERVER)
                connection = ldap3.Connection(
                    server,
                    user=LDAP_BIND_DN,
                    password=LDAP_BIND_PASSWORD,
                    auto_bind=True
                )
                
                print("LDAP bind connection established")
                
                # Search for user
                connection.search(
                    search_base=LDAP_SEARCH_BASE,
                    search_filter=LDAP_SEARCH_FILTER,
                    attributes=['cn', 'mail', 'givenName', 'sn', 'memberOf', 'displayName']
                )
                
                print(f"LDAP search found {len(connection.entries)} entries")
                
                if connection.entries:
                    user_dn = connection.entries[0].entry_dn
                    print(f"Found user DN: {user_dn}")
                    
                    # Try to bind with user credentials
                    user_connection = ldap3.Connection(
                        server,
                        user=user_dn,
                        password=password,
                        auto_bind=True
                    )
                    
                    if user_connection.bound:
                        print(f"LDAP user bind successful for: {username}")
                        
                        # Authentication successful - get user attributes
                        user_attrs = connection.entries[0]
                        
                        # Extract user information
                        user_name = (
                            user_attrs.displayName.value 
                            if hasattr(user_attrs, 'displayName') and user_attrs.displayName.value 
                            else user_attrs.cn.value 
                            if hasattr(user_attrs, 'cn') and user_attrs.cn.value
                            else username
                        )
                        
                        user_email = (
                            user_attrs.mail.value 
                            if hasattr(user_attrs, 'mail') and user_attrs.mail.value 
                            else f'{username}@company.com'
                        )
                        
                        member_of = (
                            user_attrs.memberOf.value 
                            if hasattr(user_attrs, 'memberOf') and user_attrs.memberOf.value 
                            else []
                        )
                        
                        user_role = self.map_ldap_role(member_of)
                        
                        response = {
                            'authenticated': True,
                            'token': f'ldap-token-{username}-{datetime.now().timestamp()}',
                            'user': {
                                'name': user_name,
                                'email': user_email,
                                'role': user_role,
                                'username': username
                            }
                        }
                        
                        self.send_json_response(200, response)
                        print(f"LDAP Auth SUCCESS for user: {username}, role: {user_role}")
                        
                    else:
                        print(f"LDAP user bind FAILED for: {username}")
                        self.send_json_response(401, {
                            'authenticated': False, 
                            'message': 'Invalid LDAP credentials'
                        })
                    
                    user_connection.unbind()
                else:
                    print(f"LDAP user NOT FOUND: {username}")
                    self.send_json_response(401, {
                        'authenticated': False, 
                        'message': 'User not found in LDAP'
                    })
                
                connection.unbind()
                
            except Exception as ldap_error:
                print(f"LDAP connection error: {str(ldap_error)}")
                self.send_json_response(500, {
                    'authenticated': False, 
                    'message': f'LDAP server error: {str(ldap_error)}'
                })
            
        except Exception as e:
            print(f"Auth processing error: {str(e)}")
            self.send_json_response(500, {
                'authenticated': False, 
                'message': f'Internal server error: {str(e)}'
            })
    
    def handle_get_crs(self):
        """Handle GET change requests"""
        try:
            print("Fetching CR data...")
            
            # Mock CR data with CHG123456 format
            cr_data = [
                {
                    'id': 'CHG100001',
                    'title': 'User Login Function Optimization',
                    'description': 'Improve user login process to enhance user experience',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-15T00:00:00Z',
                    'status': 'pending',
                    'priority': 'High',
                    'category': 'Infrastructure'
                },
                {
                    'id': 'CHG100002',
                    'title': 'Database Index Optimization',
                    'description': 'Optimize database indexes related to user queries',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-18T00:00:00Z',
                    'status': 'approved',
                    'priority': 'Medium',
                    'category': 'Database'
                },
                {
                    'id': 'CHG100003',
                    'title': 'Payment Interface Upgrade',
                    'description': 'Upgrade payment interface from V1 to V2 version',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-20T00:00:00Z',
                    'status': 'pending',
                    'priority': 'High',
                    'category': 'Integration'
                },
                {
                    'id': 'CHG100004',
                    'title': 'Frontend Framework Migration',
                    'description': 'Migrate frontend framework from Vue2 to Vue3',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-22T00:00:00Z',
                    'status': 'rejected',
                    'priority': 'Medium',
                    'category': 'Frontend'
                },
                {
                    'id': 'CHG100005',
                    'title': 'Add Data Export Function',
                    'description': 'Add Excel data export function for users',
                    'requester': 'Kevin',
                    'createdAt': '2023-06-25T00:00:00Z',
                    'status': 'pending',
                    'priority': 'Low',
                    'category': 'Feature'
                }
            ]
            
            self.send_json_response(200, cr_data)
            print("CR data sent successfully")
            
        except Exception as e:
            print(f"Error getting CRs: {str(e)}")
            self.send_json_response(500, {'message': 'Internal server error'})
    
    def handle_get_cr_metrics(self):
        """Handle GET change request metrics - UPDATED API STRUCTURE"""
        try:
            # Extract CR ID from path like /api/change-requests/CHG100001
            cr_id = self.path.split('/')[-1]
            print(f"Fetching metrics for CR: {cr_id}")
            
            # Mock metrics data based on CR ID with new structure
            metrics_data = {
                'CHG100001': {
                    'status': 200,
                    'results': [
                        {
                            'group': 'Performance',
                            'status': '1',
                            'title': 'CPU Utilization < 80%',
                            'description': 'Monitor CPU usage during peak load',
                            'result': 'Passed',
                            'suggestion': 'No action required',
                            'remediateLink': 'N/A'
                        },
                        {
                            'group': 'Performance',
                            'status': '0',
                            'title': 'Memory Usage < 85%',
                            'description': 'Check memory consumption patterns',
                            'result': 'Failed',
                            'suggestion': 'Optimize memory allocation and garbage collection',
                            'remediateLink': 'ansible/playbooks/memory-optimization.yml'
                        },
                        {
                            'group': 'Security',
                            'status': '1',
                            'title': 'SSL Certificate Valid',
                            'description': 'Verify SSL certificate expiration',
                            'result': 'Passed',
                            'suggestion': 'Continue monitoring certificate expiration',
                            'remediateLink': 'N/A'
                        },
                        {
                            'group': 'Network',
                            'status': '2',
                            'title': 'Network Latency < 100ms',
                            'description': 'Measure network response times',
                            'result': 'Warning',
                            'suggestion': 'Investigate network congestion',
                            'remediateLink': 'manual/network-optimization-guide.md'
                        }
                    ]
                },
                'CHG100002': {
                    'status': 200,
                    'results': [
                        {
                            'group': 'Database',
                            'status': '1',
                            'title': 'Query Performance < 2s',
                            'description': 'Monitor slow queries',
                            'result': 'Passed',
                            'suggestion': 'Query performance meets requirements',
                            'remediateLink': 'N/A'
                        },
                        {
                            'group': 'Database',
                            'status': '0',
                            'title': 'Index Fragmentation < 30%',
                            'description': 'Check index maintenance status',
                            'result': 'Failed',
                            'suggestion': 'Rebuild fragmented indexes during maintenance window',
                            'remediateLink': 'sql/scripts/rebuild-indexes.sql'
                        }
                    ]
                },
                'CHG100003': {
                    'status': 200,
                    'results': [
                        {
                            'group': 'API',
                            'status': '1',
                            'title': 'Response Time < 500ms',
                            'description': 'Monitor API endpoint performance',
                            'result': 'Passed',
                            'suggestion': 'API performance is optimal',
                            'remediateLink': 'N/A'
                        },
                        {
                            'group': 'API',
                            'status': '0',
                            'title': 'Error Rate < 1%',
                            'description': 'Track API error rates',
                            'result': 'Failed',
                            'suggestion': 'Fix authentication endpoint issues',
                            'remediateLink': 'deployment/api-fix-v2.1.zip'
                        }
                    ]
                },
                'CHG100004': {
                    'status': 200,
                    'results': [
                        {
                            'group': 'Frontend',
                            'status': '0',
                            'title': 'Bundle Size < 2MB',
                            'description': 'Check JavaScript bundle size',
                            'result': 'Failed',
                            'suggestion': 'Implement code splitting and tree shaking',
                            'remediateLink': 'webpack/config/optimization.config.js'
                        }
                    ]
                },
                'CHG100005': {
                    'status': 200,
                    'results': [
                        {
                            'group': 'Performance',
                            'status': '1',
                            'title': 'Export Time < 30s',
                            'description': 'Measure data export performance',
                            'result': 'Passed',
                            'suggestion': 'Export performance meets requirements',
                            'remediateLink': 'N/A'
                        }
                    ]
                }
            }
            
            # Get metrics for the specific CR or return empty if not found
            if cr_id in metrics_data:
                response = metrics_data[cr_id]
                print(f"Metrics sent for CR: {cr_id}, {len(response['results'])} results")
            else:
                response = {
                    'status': 200,
                    'results': []
                }
                print(f"No metrics found for CR: {cr_id}")
            
            self.send_json_response(200, response)
            
        except Exception as e:
            print(f"Error getting CR metrics: {str(e)}")
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
    
    def map_ldap_role(self, member_of):
        """Map LDAP groups to application roles"""
        if not member_of:
            return 'requester'
        
        groups = member_of if isinstance(member_of, list) else [member_of]
        
        print(f"LDAP groups for role mapping: {groups}")
        
        # Adjust these conditions based on your LDAP group structure
        if any('CN=CR_Admins' in group or 'CN=Administrators' in group for group in groups):
            return 'admin'
        if any('CN=CR_Approvers' in group or 'CN=Approvers' in group for group in groups):
            return 'approver'
        if any('CN=CR_Requesters' in group or 'CN=Users' in group for group in groups):
            return 'requester'
        
        return 'requester'
    
    def send_json_response(self, status_code, data):
        """Send JSON response with CORS headers - FIXED VERSION"""
        try:
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_cors_headers()
            self.end_headers()
            
            # 确保使用 ensure_ascii=False 来保留非ASCII字符
            json_data = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
            self.wfile.write(json_data)
            
            print(f"Response sent: {status_code}")
            
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
        print(f"CR Management System Server - Updated Metrics API")
        print(f"Running at http://localhost:{PORT}")
        print("=" * 60)
        print("Available endpoints:")
        print("  GET  /api/change-requests - Get all CRs")
        print("  GET  /api/change-requests/CHG123456 - Get CR metrics (UPDATED)")
        print("  POST /api/ldap/auth - LDAP authentication")
        print("  POST /api/change-requests/batch-approve - Batch approve CRs")
        print("  POST /api/change-requests/batch-reject - Batch reject CRs")
        print("\nPress Ctrl+C to stop the server")
        print("=" * 60)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    main()