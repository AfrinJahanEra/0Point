# pdf/middleware.py
class MediaCORSHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Add CORS headers to /media/ responses
        if request.path.startswith('/media/'):
            response["Access-Control-Allow-Origin"] = "http://localhost:5173"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type"
            
            # Allow iframes to display PDFs
            if "X-Frame-Options" in response:
                del response["X-Frame-Options"]
        
        return response