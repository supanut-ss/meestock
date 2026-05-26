"use client";

import { useEffect, useState, useTransition } from "react";
import { getUsers, createUser, toggleUserActive } from "@/lib/authActions";

type UserRow = {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  role: string;
  createdAt: string;
};

const BLANK_USER = { username: "", password: "", displayName: "", role: "staff" };

export default function UsersView() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ ...BLANK_USER });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (!confirm(`ยืนยันที่จะ ${currentStatus ? "ปิดใช้งาน" : "เปิดใช้งาน"} บัญชีผู้ใช้นี้หรือไม่?`)) return;
    
    const success = await toggleUserActive(userId, !currentStatus);
    if (success) {
      void loadUsers();
    } else {
      alert("ไม่สามารถปรับสถานะผู้ใช้งานได้");
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.displayName) return;
    setError("");

    startTransition(async () => {
      const result = await createUser(newUser);
      if (result.success) {
        setNewUser({ ...BLANK_USER });
        setShowAddForm(false);
        void loadUsers();
      } else {
        setError(result.error || "เกิดข้อผิดพลาดในการบันทึกบัญชี");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">การจัดการผู้ใช้งานในระบบ</h1>
          <p className="text-slate-500 text-sm">จัดการบัญชีผู้ใช้ สลับเปิด/ปิดสถานะ และมอบหมายสิทธิ์ Admin หรือ Staff</p>
        </div>
        <button
          onClick={() => {
            setError("");
            setNewUser({ ...BLANK_USER });
            setShowAddForm(!showAddForm);
          }}
          className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          เพิ่มผู้ใช้งานใหม่
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <form onSubmit={handleCreateUser} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md animate-in slide-in-from-top-4 duration-300 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">สร้างบัญชีผู้ใช้งานใหม่</h3>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 text-xs">ยกเลิก</button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">ชื่อผู้ใช้งาน (Username) *</label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="เช่น somchai_123"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">รหัสผ่าน (Password) *</label>
              <input
                required
                type="password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="ระบุรหัสผ่าน..."
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">ชื่อแสดงตัวตน (Display Name) *</label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="เช่น สมชาย ใจดี"
                value={newUser.displayName}
                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">สิทธิ์ในระบบ (Role) *</label>
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="staff">Staff (ดูสต็อก, จัดส่ง, และสั่งขายทั่วไป)</option>
                <option value="owner">Admin/Owner (เข้าถึงได้หมดจดและดูต้นทุนสินค้าได้)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3.5">
            <button type="button" onClick={() => setShowAddForm(false)} className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button
              type="submit"
              disabled={isPending}
              className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending ? "กำลังบันทึก..." : "บันทึกสร้างบัญชี"}
            </button>
          </div>
        </form>
      )}

      {/* Users Grid */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">กำลังดึงรายการผู้ใช้ในระบบ...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">ชื่อแสดงตน / ชื่อล็อกอิน</th>
                  <th className="px-5 py-4">สิทธิ์การใช้งาน (Role)</th>
                  <th className="px-5 py-4">สร้างเมื่อวันที่</th>
                  <th className="px-5 py-4 text-center">สถานะใช้งาน</th>
                  <th className="px-5 py-4 text-center">จัดการสถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">ไม่พบผู้ใช้งานคนอื่นในร้านค้า</td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isAdmin = u.role === "owner" || u.role === "admin";
                    const roleBadge = isAdmin
                      ? "bg-indigo-50 text-indigo-700 ring-indigo-600/10"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-600/10";
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">{u.displayName}</p>
                          <p className="font-mono text-[10px] text-slate-400">@{u.username}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${roleBadge}`}>
                            {isAdmin ? "Admin / Owner" : "Staff"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-500">{u.createdAt}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${u.isActive ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            {u.isActive ? "เปิดใช้งาน" : "ปิดการใช้งาน"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleToggleActive(u.id, u.isActive)}
                              className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all shadow-sm cursor-pointer ${
                                u.isActive
                                  ? "border-rose-100 bg-white hover:bg-rose-50 text-rose-600"
                                  : "border-emerald-100 bg-white hover:bg-emerald-50 text-emerald-600"
                              }`}
                            >
                              {u.isActive ? "ปิดบัญชีชั่วคราว" : "เปิดใช้งานบัญชี"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
