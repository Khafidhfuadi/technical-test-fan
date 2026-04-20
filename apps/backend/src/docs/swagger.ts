export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Technical Test API",
    version: "1.0.0",
    description: "API documentation for the Fullstack Technical Test project"
  },
  servers: [
    { url: "/", description: "Base URL" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    responses: {
      UnauthorizedError: {
        description: "Access token is missing or invalid",
        content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "number", example: 401 }, message: { type: "string" } } } } } } }
      },
      ForbiddenError: {
        description: "You do not have permission to access this resource",
        content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "number", example: 403 }, message: { type: "string" } } } } } } }
      },
      ValidationError: {
        description: "Invalid input data",
        content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "number", example: 400 }, message: { type: "string" } } } } } } }
      },
      NotFoundError: {
        description: "Resource not found",
        content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "number", example: 404 }, message: { type: "string" } } } } } } }
      },
      ServerError: {
        description: "Internal server error",
        content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "number", example: 500 }, message: { type: "string" } } } } } } }
      }
    }
  },
  tags: [
    { name: "Auth", description: "Authentication endpoints" },
    { name: "Users", description: "User management endpoints" },
    { name: "Books", description: "Book management & listing endpoints" }
  ],
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } }, required: ["name", "email", "password"] }
            }
          }
        },
        responses: {
          "201": { description: "Verification email sent" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "User login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { email: { type: "string" }, password: { type: "string" } }, required: ["email", "password"] }
            }
          }
        },
        responses: {
          "200": { description: "Login successful with token" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/auth/verify-email": {
      get: {
        tags: ["Auth"],
        summary: "Verify user email",
        parameters: [
          { name: "token", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Email verified" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request a password reset email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { email: { type: "string" } }, required: ["email"] }
            }
          }
        },
        responses: {
          "200": { description: "Reset email sent" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset user password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { token: { type: "string" }, newPassword: { type: "string" } }, required: ["token", "newPassword"] }
            }
          }
        },
        responses: {
          "200": { description: "Password reset successful" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Logged out" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "Get list of users",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "isEmailVerified", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } }
        ],
        responses: {
          "200": { description: "List of users" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/users/profile": {
      put: {
        tags: ["Users"],
        summary: "Update user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", properties: { name: { type: "string", minLength: 2, maxLength: 100 } }, required: ["name"] }
            }
          }
        },
        responses: {
          "200": { description: "Profile updated successfully" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/users/change-password": {
      put: {
        tags: ["Users"],
        summary: "Change user password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { 
                type: "object", 
                properties: { 
                  currentPassword: { type: "string" }, 
                  newPassword: { type: "string", minLength: 8 }, 
                  confirmNewPassword: { type: "string", minLength: 8 } 
                }, 
                required: ["currentPassword", "newPassword", "confirmNewPassword"] 
              }
            }
          }
        },
        responses: {
          "200": { description: "Password changed successfully" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/books": {
      get: {
        tags: ["Books"],
        summary: "Public listing of books",
        parameters: [
          { name: "author", in: "query", schema: { type: "string" } },
          { name: "rating", in: "query", schema: { type: "integer", minimum: 1, maximum: 5 } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["date", "rating"], default: "date" } },
          { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 12 } }
        ],
        responses: {
          "200": { description: "List of books" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      },
      post: {
        tags: ["Books"],
        summary: "Create a new book",
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  description: { type: "string" },
                  rating: { type: "integer", minimum: 1, maximum: 5 },
                  thumbnail: { type: "string", format: "binary" }
                },
                required: ["title", "author", "description", "rating"]
              }
            }
          }
        },
        responses: {
          "201": { description: "Book created" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    },
    "/api/books/{id}": {
      get: {
        tags: ["Books"],
        summary: "Get single book details",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Book data retrieved" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      },
      put: {
        tags: ["Books"],
        summary: "Update existing book",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  description: { type: "string" },
                  rating: { type: "integer" },
                  thumbnail: { type: "string", format: "binary" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Book updated" },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      },
      delete: {
        tags: ["Books"],
        summary: "Delete a book",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Book deleted" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
          "404": { $ref: "#/components/responses/NotFoundError" },
          "500": { $ref: "#/components/responses/ServerError" }
        }
      }
    }
  }
};
