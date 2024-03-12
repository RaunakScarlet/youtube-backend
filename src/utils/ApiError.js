class ApiError extends Error {
  message;
  constructor(statusCode, message) {
    super(message);
    this.success = false;
    this.statusCode = statusCode || 500;
    this.message = message || "something went wrong";
    this.data = null;
  }
}

export { ApiError };

// export const ApiError = (statusCode, message) => {
//   const error = new Error();
//   error.statusCode = statusCode || 500;
//   error.message = message
//   (error.success = false), (error.data = null);
//   return error;
// };
