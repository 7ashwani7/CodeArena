import { AppError } from '../utils/apiResponse.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}
