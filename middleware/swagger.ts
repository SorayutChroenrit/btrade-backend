import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { Express } from "express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "B-Trade API Documentation",
      version: "1.0.0",
      description: "API documentation for the application",
    },
    servers: [
      {
        url: "http://localhost:20000/api/v1",
      },
    ],
  },
  apis: [path.resolve(__dirname, "../src/**/*.ts")],
};

const swaggerSpec = swaggerJsdoc(options);

// Custom CSS options
const customCss = `
  .swagger-ui .response-col_links {
    min-width: 6em;
    display: none;
  }
`;

export function useSwagger(app: Express): void {
  app.use(
    "/document",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss,
    })
  );
}
