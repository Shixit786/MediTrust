import mongoose from "mongoose";
import { config } from "./config.js";

const connectToDB = async () => {
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message || error);
    }
};
export default connectToDB;

