import "dotenv/config";

export const JWT_SECRET = process.env.JWT_SECRET;

export const JWT_EXPIRES_IN_SECONDS = Number(
  process.env.JWT_EXPIRES_IN_SECONDS
);

if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET, "utf8") < 32) {
  throw new Error("JWT_SECRET phai co it nhat 32 byte");
}

if (
  !Number.isSafeInteger(JWT_EXPIRES_IN_SECONDS) ||
  JWT_EXPIRES_IN_SECONDS <= 0
) {
  throw new Error("JWT_EXPIRES_IN_SECONDS phai la so nguyen duong");
}