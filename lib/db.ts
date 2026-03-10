import BetterSQLite from "better-sqlite3";
import { mkdirSync } from "fs";

type Database = InstanceType<typeof BetterSQLite>;

mkdirSync("./data", { recursive: true });

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    _db = new BetterSQLite("./data/app.db");
    _db.exec("PRAGMA journal_mode = WAL;");
    _db.exec("PRAGMA foreign_keys = ON;");
  }
  return _db;
}

type Param = string | number | bigint | boolean | null | Uint8Array;

export function query<T>(sql: string, params: Param[] = []): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}

export function get<T>(sql: string, params: Param[] = []): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export function run(sql: string, params: Param[] = []): void {
  getDb().prepare(sql).run(...params);
}
