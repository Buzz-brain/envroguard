import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { ApiError, logger } from '../utils/index.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message, errors, stack } = err;

  if (!(err instanceof ApiError)) {
    statusCode = 500;
    message = 'Internal server error';
    errors = [];

    if (err instanceof mongoose.Error.ValidationError) {
      statusCode = 400;
      message = 'Validation error';
      errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
    }

    if (err.code === 11000) {
      statusCode = 409;
      const field = Object.keys(err.keyValue)[0];
      message = `${field} already exists`;
      errors = [{ field, message: `A record with this ${field} already exists` }];
    }

    if (err.name === 'CastError') {
      statusCode = 400;
      message = `Invalid ${err.path}: ${err.value}`;
      errors = [{ field: err.path, message: `Invalid ID format` }];
    }

    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token has expired';
    }

    if (err.type === 'entity.parse.failed') {
      statusCode = 400;
      message = 'Invalid JSON in request body';
    }
  }

  if (config.env === 'development' && stack) {
    logger.error(`[Error] ${message}`, {
      statusCode,
      path: req.originalUrl,
      method: req.method,
      stack: stack.split('\n'),
    });
  } else {
    logger.error(`[Error] ${message}`, {
      statusCode,
      path: req.originalUrl,
      method: req.method,
    });
  }

  const response = {
    success: false,
    message,
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  if (config.env === 'development' && stack) {
    response.stack = stack;
  }

  return res.status(statusCode).json(response);
};

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
};
