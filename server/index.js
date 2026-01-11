import express from "express";
import { configDotenv } from "dotenv";
import routes from "./routes/index.js";
import startServer from "./lib/start-server.js";

configDotenv();

const app = express();
const port = process.env.PORT || 3001;

app.get("/health", (req, res) => {
    res.json({ healthy: true });
});

app.use(express.json());
app.use("/api", routes);

app.listen(port, () => {
    startServer(port);
});
