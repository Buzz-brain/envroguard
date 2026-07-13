export const apiResponse = (res, statusCode, message, data = null, meta = {}) => {
  const body = {
    success: statusCode >= 200 && statusCode < 400,
    message,
  };

  if (data !== null) {
    body.data = data;
  }

  if (Object.keys(meta).length > 0) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
};
