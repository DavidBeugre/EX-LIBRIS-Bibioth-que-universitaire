export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Authentification requise") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Accès refusé") {
    return new ApiError(403, message);
  }
  static notFound(message = "Ressource introuvable") {
    return new ApiError(404, message);
  }
  static conflict(message) {
    return new ApiError(409, message);
  }
}
