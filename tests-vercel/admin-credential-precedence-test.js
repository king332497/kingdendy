"use strict";
const assert=require("node:assert");
const crypto=require("node:crypto");

process.env.ADMIN_PASSWORD="PlainAdmin#Test2026";
const salt=crypto.randomBytes(16).toString("hex");
const wrongHash=crypto.scryptSync("DifferentPassword",Buffer.from(salt,"hex"),64).toString("hex");
process.env.ADMIN_PASSWORD_HASH=`scrypt$${salt}$${wrongHash}`;

const backend=require("../lib/realtime-backend");
assert.strictEqual(backend._internal.adminCredentialConfig().mode,"password","ADMIN_PASSWORD harus diprioritaskan saat keduanya tersedia");
assert.strictEqual(backend._internal.verifyPassword("PlainAdmin#Test2026"),true,"ADMIN_PASSWORD yang aktif harus diterima");
assert.strictEqual(backend._internal.verifyPassword("DifferentPassword"),false,"hash fallback tidak boleh mengalahkan ADMIN_PASSWORD yang aktif");

delete process.env.ADMIN_PASSWORD;
assert.strictEqual(backend._internal.adminCredentialConfig().mode,"hash","hash harus menjadi fallback jika ADMIN_PASSWORD tidak tersedia");
assert.strictEqual(backend._internal.verifyPassword("DifferentPassword"),true,"hash fallback harus tetap berfungsi");
console.log("admin-credential-precedence-test: PASS");
