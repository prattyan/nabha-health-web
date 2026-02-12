export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message: string, code?: string): HttpError {
  return new HttpError(400, message, code);
}

export function unauthorized(message = 'Unauthorized'): HttpError {
  return new HttpError(401, message);
}

export function forbidden(message = 'Forbidden'): HttpError {
  return new HttpError(403, message);
}

export function notFound(message = 'Not found'): HttpError {
  return new HttpError(404, message);
}
