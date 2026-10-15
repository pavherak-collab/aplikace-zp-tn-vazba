import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (
    Buffer.isBuffer(req.body) &&
    req.headers["content-type"]?.includes("application/json")
  ) {
    try {
      req.body = JSON.parse(req.body.toString("utf8"));
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }

  next();
});

app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
export default app;
