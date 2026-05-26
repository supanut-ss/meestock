"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getPool, getDemoMerchantId } from "./db";
import mssql from "mssql";

// -------------------------------------------------------
// AUTH TYPES
// -------------------------------------------------------
export type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: "owner" | "staff" | string;
  merchantId: string;
};

const SESSION_COOKIE = "meestock_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

// Simple JWT-like session using base64 (ไม่ต้องติดตั้ง library เพิ่ม)
function encodeSession(user: SessionUser): string {
  const payload = JSON.stringify({ ...user, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  return Buffer.from(payload).toString("base64");
}

function decodeSession(token: string): SessionUser | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload as SessionUser;
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// LOGIN
// -------------------------------------------------------
export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: SessionUser }> {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("username", mssql.NVarChar, username.trim().toLowerCase())
      .query(`
        SELECT u.id, u.username, u.password_hash, u.display_name, u.merchant_id, u.is_active,
               r.name as role
        FROM dbo.users u
        LEFT JOIN dbo.user_roles ur ON ur.user_id = u.id
        LEFT JOIN dbo.roles r ON r.id = ur.role_id
        WHERE LOWER(u.username) = @username
      `);

    if (result.recordset.length === 0) {
      return { success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    }

    const row = result.recordset[0];
    if (!row.is_active) {
      return { success: false, error: "บัญชีนี้ถูกปิดใช้งานแล้ว กรุณาติดต่อ Admin" };
    }

    const passwordMatch = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatch) {
      return { success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    }

    const user: SessionUser = {
      id: row.id.toString(),
      username: row.username,
      displayName: row.display_name,
      role: row.role || "staff",
      merchantId: row.merchant_id.toString(),
    };

    const token = encodeSession(user);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });

    return { success: true, user };
  } catch (err) {
    console.error("loginUser failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง" };
  }
}

// -------------------------------------------------------
// GET CURRENT USER (อ่านจาก cookie)
// -------------------------------------------------------
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    return decodeSession(token);
  } catch {
    return null;
  }
}

// -------------------------------------------------------
// LOGOUT
// -------------------------------------------------------
export async function logoutUser(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// -------------------------------------------------------
// CHECK IF ADMIN
// -------------------------------------------------------
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "owner" || user?.role === "admin";
}

// -------------------------------------------------------
// GET USERS LIST (Admin only)
// -------------------------------------------------------
export async function getUsers() {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool
      .request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT u.id, u.username, u.display_name, u.is_active, u.created_at,
               r.name as role
        FROM dbo.users u
        LEFT JOIN dbo.user_roles ur ON ur.user_id = u.id
        LEFT JOIN dbo.roles r ON r.id = ur.role_id
        WHERE u.merchant_id = @merchantId
        ORDER BY u.created_at DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id.toString(),
      username: row.username,
      displayName: row.display_name,
      isActive: row.is_active,
      role: row.role || "staff",
      createdAt: new Date(row.created_at).toLocaleString("th-TH"),
    }));
  } catch (err) {
    console.error("getUsers failed:", err);
    return [];
  }
}

// -------------------------------------------------------
// CREATE USER (Admin only)
// -------------------------------------------------------
export async function createUser(data: {
  username: string;
  password: string;
  displayName: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    const passwordHash = await bcrypt.hash(data.password, 11);

    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      // Check username ซ้ำ
      const existing = await transaction
        .request()
        .input("username", mssql.NVarChar, data.username.trim().toLowerCase())
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .query("SELECT id FROM dbo.users WHERE LOWER(username) = @username AND merchant_id = @merchantId");

      if (existing.recordset.length > 0) {
        await transaction.rollback();
        return { success: false, error: "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว" };
      }

      // สร้าง user
      const userResult = await transaction
        .request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("username", mssql.NVarChar, data.username.trim().toLowerCase())
        .input("passwordHash", mssql.NVarChar, passwordHash)
        .input("displayName", mssql.NVarChar, data.displayName.trim())
        .query(`
          INSERT INTO dbo.users (merchant_id, username, password_hash, display_name, is_active)
          OUTPUT inserted.id
          VALUES (@merchantId, @username, @passwordHash, @displayName, 1)
        `);

      const newUserId = userResult.recordset[0].id.toString();

      // ผูก role
      const roleResult = await transaction
        .request()
        .input("roleName", mssql.NVarChar, data.role)
        .query("SELECT id FROM dbo.roles WHERE name = @roleName");

      if (roleResult.recordset.length > 0) {
        const roleId = roleResult.recordset[0].id.toString();
        await transaction
          .request()
          .input("userId", mssql.UniqueIdentifier, newUserId)
          .input("roleId", mssql.UniqueIdentifier, roleId)
          .query("INSERT INTO dbo.user_roles (user_id, role_id) VALUES (@userId, @roleId)");
      }

      await transaction.commit();
      return { success: true };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("createUser failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาดในการสร้างบัญชี" };
  }
}

// -------------------------------------------------------
// TOGGLE USER ACTIVE STATUS
// -------------------------------------------------------
export async function toggleUserActive(userId: string, isActive: boolean): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    await pool
      .request()
      .input("id", mssql.UniqueIdentifier, userId)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("isActive", mssql.Bit, isActive ? 1 : 0)
      .query("UPDATE dbo.users SET is_active = @isActive WHERE id = @id AND merchant_id = @merchantId");
    return true;
  } catch (err) {
    console.error("toggleUserActive failed:", err);
    return false;
  }
}
