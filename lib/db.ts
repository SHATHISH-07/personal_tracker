import mongoose from "mongoose";
import { cookies } from "next/headers";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  uri: string | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null, uri: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  let targetUri = process.env.MONGODB_URI_SK;
  if (token === "vinish_logged_in") {
    targetUri = process.env.MONGODB_URI_VS;
  }

  if (!targetUri) {
    throw new Error("Please define the MONGODB_URI environment variables inside .env");
  }

  // If already connected to the requested URI, return the connection
  if (cached.conn && cached.uri === targetUri) {
    return cached.conn;
  }

  // If connected to a different URI, disconnect to swap databases
  if (cached.conn && cached.uri !== targetUri) {
    await mongoose.disconnect();
    cached.promise = null;
    cached.conn = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.uri = targetUri;
    cached.promise = mongoose.connect(targetUri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
