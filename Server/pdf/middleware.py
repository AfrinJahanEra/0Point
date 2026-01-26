# pdf/middleware.py
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse

class PDFCacheMiddleware(MiddlewareMixin):
    """
    Middleware to add cache control headers for PDF files
    """
    def process_response(self, request, response):
        # Check if this is a PDF file request
        if request.path.startswith('/media/pdfs/') and request.path.endswith('.pdf'):
            # Set reasonable cache control - cache for 1 hour but allow revalidation
            response['Cache-Control'] = 'public, max-age=3600, must-revalidate'
            response['ETag'] = f'"pdf-{request.path}"'
            
            # Add CORS headers for cross-origin requests
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type'
            
            # Allow embedding in iframes
            if 'X-Frame-Options' in response:
                del response['X-Frame-Options']
            
            # Add content type if not set
            if not response.get('Content-Type'):
                response['Content-Type'] = 'application/pdf'
                
        return response