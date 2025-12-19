export * from './generated/client';

import { PrismaClient } from "./generated/client";

export const db = new PrismaClient();