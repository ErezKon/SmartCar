import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An unexpected error occurred';

      if (error.status === 0) {
        message = 'Cannot connect to server. Is the backend running?';
      } else if (error.status === 401) {
        message = 'Authentication required. Please check your credentials.';
      } else if (error.status === 403) {
        message = 'Access denied.';
      } else if (error.status === 404) {
        message = 'Resource not found.';
      } else if (error.status === 429) {
        message = 'Rate limit exceeded. Please wait and try again.';
      } else if (error.status >= 500) {
        message = 'Server error. Please try again later.';
      } else if (error.error?.error) {
        message = error.error.error;
      } else if (error.error?.message) {
        message = error.error.message;
      }

      console.error(`[API Error] ${error.status}: ${message}`, error);
      return throwError(() => ({ status: error.status, message, originalError: error }));
    })
  );
};
