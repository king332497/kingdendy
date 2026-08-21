"use strict";
const crypto=require("node:crypto");
const password=process.env.PASSWORD_TO_HASH;
if(!password||password.length<12){console.error("Set PASSWORD_TO_HASH with at least 12 characters.");process.exit(1);}
const salt=crypto.randomBytes(16).toString("hex");
const hash=crypto.scryptSync(password,Buffer.from(salt,"hex"),64).toString("hex");
console.log(`scrypt$${salt}$${hash}`);
