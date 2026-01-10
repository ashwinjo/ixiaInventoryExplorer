import requests
import json
import sys
import urllib3
import os
import time
import click


class IxNRestSessions(object):
    """
    class for handling HTTP requests/response for IxOS REST APIs
    Constructor arguments:
    chassis_address:    addrress of the chassis
    Optional arguments:
        api_key:        API key or you can use authenticate method \
                        later to get it by providing user/pass.
        verbose:        If True, will print every HTTP request or \
                        response header and body.
        timeout:        Time to wait (in seconds) while polling \
                        for async operation.
        poll_interval:  Polling inteval in seconds.
    """

    def __init__(self, chassis_address, 
                 username=None, 
                 password=None, 
                 ixnetwork_server_type=None,
                 api_key=None,timeout=600, 
                 poll_interval=2, 
                 verbose=False, 
                 insecure_request_warning=False, 
                 ):

        self.chassis_ip = chassis_address
        self.api_key = api_key
        self.timeout = timeout
        self.poll_interval = poll_interval
        self.verbose = verbose

        
        # Depending upon where you are working with ixNetworkWeb aut URI will change
        if ixnetwork_server_type == "standalone":
            self._authUri = '/ixnetworkweb/api/v1/auth/session'
        elif ixnetwork_server_type == "onchassis":
            self._authUri = '/platform/api/v2/auth/session'
       

        self.username = username
        self.password = password
        
        # ignore self sign certificate warning(s) if insecure_request_warning=False
        if not insecure_request_warning:
            try:
                if sys.version_info[0] == 2 and ((sys.version_info[1] == 7 and sys.version_info[2] < 9) or sys.version_info[1] < 7):
                    requests.packages.urllib3.disable_warnings()
                else:
                    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            except AttributeError:
                print('WARING:You are using an old urllib3 version which does not support handling the certificate validation warnings. Please upgrade urllib3 using: pip install urllib3 --upgrade')

    # try to authenticate with default user/password if no api_key was provided
        if not api_key:
            self.authenticate(username=self.username, password=self.password)

    def get_headers(self, content_type= "application/json"):
        # headers should at least contain these two
        return {
            "Content-Type": content_type,
            'x-api-key': self.api_key
        }

    def authenticate(self, username="admin", password="admin"):
        """
        we need to obtain API key to be able to perform any REST
        calls on IxNetwork platfrom and IxNetwork API;s
        """
        
        payload = {"password": password, 
                   "rememberMe": False, 
                   "username": username} 
        
        """
        Note:

        If you are not using strong passoword then update payload as

        payload = {
            'username': username,
            'password': password,
            'rememberMe': False,
            'resetWeakPassword': False
        }
        """

        response = self.http_request(
            'POST',
            'https://{address}{uri}'.format(address=self.chassis_ip,
                                            uri=self._authUri),
            payload=payload
        )
        self.api_key = response.data['apiKey']

    def http_request(self, method, uri, payload=None, params=None, files=None):
        """
        wrapper over requests.requests to pretty-print debug info
        and invoke async operation polling depending on HTTP status code (e.g. 202)
        """
        try:
            # lines with 'debug_string' can be removed without affecting the code
            if not uri.startswith('http'):
                uri = self.get_ixos_uri() + uri

            if payload is not None:
                payload = json.dumps(payload, indent=2, sort_keys=True)

            if "upload" in uri:
               headers = {
                'x-api-key': self.api_key,
                'accept': 'text/html'
                }
            else:
                headers = self.get_headers()
            response = requests.request(
                method, uri, data=payload, params=params, files=files,
                headers=headers, verify=False, timeout=600
            )

            # debug_string = 'Response => Status %d\n' % response.status_code
            data = None
            try:
                data = response.content.decode()
                data = json.loads(data) if data else None
            except:
                print('Invalid/Non-JSON payload received: %s' % data)
                data = None
        
            if str(response.status_code)[0] == '4':
                print(response.text)
                raise Exception("{code} {reason}: {data}.{extraInfo}".format(
                    code=response.status_code,
                    reason=response.reason,
                    data=data,
                    extraInfo="{sep}{msg}".format(
                        sep=os.linesep,
                        msg="Please check that your API key is correct or call IxRestSession.authenticate(username, password) in order to obtain a new API key."
                    ) if str(response.status_code) == '401' and uri[-len(self._authUri):] != self._authUri else ''
                )
                )

            if response.status_code == 202:
                result_url = self.wait_for_async_operation(data)
                return result_url
            else:
                response.data = data
                return response
        except:
            raise

    def wait_for_async_operation(self, response_body):
        """
        method for handeling intermediate async operation results
        """
        try:
            print(response_body)
            print('Polling for async operation ...')
            operation_status = response_body['state']
            start_time = int(time.time())
            while operation_status == 'IN_PROGRESS':
                response = self.http_request('GET', response_body['url'])
                response_body = response.data
                operation_status = response_body['state']
                if int(time.time() - start_time) > self.timeout:
                    raise Exception(
                        'timeout occured while polling for async operation')
                time.sleep(self.poll_interval)

            if operation_status == 'SUCCESS':
                return response.data.get('resultUrl', 'NA')
            elif operation_status == 'COMPLETED':
                return response.data['resultUrl']
            elif operation_status == 'ERROR':
                return response.data['message']
            else:
                raise Exception("async failed")
        except:
            raise
        finally:
            print('Completed async operation')

    def get_sessions(self):
        """
        Get all sessions from the IxNetwork API server
        Returns list of sessions with their state information
        """
        try:
            response = self.http_request('GET', '/api/v1/sessions')
            return response.data if response.data else []
        except Exception as e:
            print(f"Error fetching sessions: {e}")
            return []

    def get_server_info(self):
        """
        Get IxNetwork API server information
        Returns server type and version info
        """
        try:
            # Try to get server info from different endpoints
            try:
                response = self.http_request('GET', '/api/v1/sessions')
                # If we can reach sessions endpoint, server is reachable
                return {"reachable": True}
            except:
                return {"reachable": False}
        except Exception as e:
            print(f"Error fetching server info: {e}")
            return {"reachable": False}


def get_ixnetwork_session_summary(session: IxNRestSessions, server_ip: str) -> dict:
    """
    Get IxNetwork API server session summary
    
    Args:
        session: IxNRestSessions instance
        server_ip: IP address of the API server
        
    Returns:
        Dictionary with session statistics
    """
    try:
        sessions = session.get_sessions()
        
        if not sessions:
            return {
                "ixnetwork_api_server_ip": server_ip,
                "ixnetwork_api_server_type": "Unknown",
                "ixnetwork_api_server_sessions": "0",
                "ixnetwork_api_server_running_sessions": "0",
                "ixnetwork_api_server_idle_sessions": "0"
            }
        
        total_sessions = len(sessions)
        running_sessions = 0
        idle_sessions = 0
        server_type = "Linux"  # Default to Linux API Server
        
        for sess in sessions:
            # Check session state - common states are "ACTIVE", "STOPPED", etc.
            state = sess.get("state", "").upper()
            if state in ["ACTIVE", "RUNNING", "IN_PROGRESS"]:
                running_sessions += 1
            elif state in ["STOPPED", "IDLE", "INITIAL"]:
                idle_sessions += 1
            else:
                # Count unknown states as idle
                idle_sessions += 1
            
            # Try to determine server type from session info
            if sess.get("applicationType"):
                app_type = sess.get("applicationType", "")
                if "linux" in app_type.lower():
                    server_type = "Linux"
                elif "windows" in app_type.lower():
                    server_type = "Windows"
        
        return {
            "ixnetwork_api_server_ip": server_ip,
            "ixnetwork_api_server_type": server_type,
            "ixnetwork_api_server_sessions": str(total_sessions),
            "ixnetwork_api_server_running_sessions": str(running_sessions),
            "ixnetwork_api_server_idle_sessions": str(idle_sessions)
        }
        
    except Exception as e:
        print(f"Error getting session summary for {server_ip}: {e}")
        return {
            "ixnetwork_api_server_ip": server_ip,
            "ixnetwork_api_server_type": "Unknown",
            "ixnetwork_api_server_sessions": "0",
            "ixnetwork_api_server_running_sessions": "0",
            "ixnetwork_api_server_idle_sessions": "0"
        }