class ApiResponse extends Error {
  constructor(statusCode, data, message) {
    super(message);
    this.success = true;
    this.statusCode = statusCode || 500;
    this.message = message || "done successfully";
    this.data = data;
  }
}

export { ApiResponse };
