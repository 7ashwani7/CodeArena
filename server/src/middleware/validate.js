import { AppError } from '../utils/apiResponse.js';

/**
 * Higher-order middleware factory for request validation.
 * @param {Function} validatorFn - Function receiving req returning { isValid, errors }
 */
export function validate(validatorFn) {
  return (req, res, next) => {
    const { isValid, errors } = validatorFn(req);
    if (!isValid) {
      return next(new AppError('Invalid request parameters or payload', 400, 'VALIDATION_ERROR', errors));
    }
    next();
  };
}
