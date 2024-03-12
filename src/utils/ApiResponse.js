class ApiResponse {
  constructor(statusCode, data, message) {
    this.success = statusCode < 400;
    this.statusCode = statusCode || 500;
    this.message = message || "done successfully";
    this.data = data;
  }
}

export { ApiResponse };
