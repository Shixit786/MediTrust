import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import connectToDB from "./src/db/connectToDB.js";
import { config } from "./src/db/config.js";

const PORT = config.PORT || process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    await connectToDB();
});
