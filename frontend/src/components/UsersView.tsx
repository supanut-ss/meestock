"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getUsers, createUser, toggleUserActive } from "@/lib/authActions";
import MeeDataGrid from "@/components/ui/MeeDataGrid";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useNotification } from "@/components/ui/NotificationProvider";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Tooltip, IconButton } from "@mui/material";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

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
  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null);
  const { notifySuccess, notifyError } = useNotification();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      notifyError("ไม่สามารถดึงข้อมูลผู้ใช้งานได้");
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const confirmToggleActive = async () => {
    if (!toggleTarget) return;
    const newStatus = !toggleTarget.isActive;
    const success = await toggleUserActive(toggleTarget.id, newStatus);
    if (success) {
      notifySuccess(
        `${newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน"} บัญชี ${toggleTarget.displayName} เรียบร้อยแล้ว`
      );
      setToggleTarget(null);
      void loadUsers();
    } else {
      notifyError("ไม่สามารถปรับสถานะผู้ใช้งานได้");
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password || !newUser.displayName) return;
    setError("");

    startTransition(async () => {
      const result = await createUser(newUser);
      if (result.success) {
        notifySuccess(`สร้างบัญชี ${newUser.displayName} สำเร็จ`);
        setNewUser({ ...BLANK_USER });
        setShowAddForm(false);
        void loadUsers();
      } else {
        setError(result.error || "เกิดข้อผิดพลาดในการบันทึกบัญชี");
      }
    });
  };

  const columns = useMemo<GridColDef<UserRow>[]>(
    () => [
      {
        field: "displayName",
        headerName: "ชื่อแสดงตน / ชื่อผู้ใช้",
        minWidth: 200,
        flex: 1.5,
        renderCell: (params: GridRenderCellParams<UserRow, string>) => (
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", py: 0.5 }}>
            <span className="font-bold text-slate-800 text-xs">
              {params.value}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              @{params.row.username}
            </span>
          </Box>
        ),
      },
      {
        field: "role",
        headerName: "สิทธิ์การใช้งาน (Role)",
        minWidth: 150,
        flex: 1,
        renderCell: (params: GridRenderCellParams<UserRow, string>) => {
          const isAdmin = params.value === "owner" || params.value === "admin";
          return (
            <StatusBadge
              label={isAdmin ? "Admin / Owner" : "Staff"}
              variant={isAdmin ? "indigo" : "success"}
            />
          );
        },
      },
      {
        field: "createdAt",
        headerName: "สร้างเมื่อวันที่",
        minWidth: 150,
        flex: 1,
        renderCell: (params: GridRenderCellParams<UserRow, string>) => (
          <span className="text-xs font-mono text-slate-500">
            {params.value}
          </span>
        ),
      },
      {
        field: "isActive",
        headerName: "สถานะใช้งาน",
        minWidth: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<UserRow, boolean>) => (
          <StatusBadge
            label={params.value ? "เปิดใช้งาน" : "ปิดการใช้งาน"}
            variant={params.value ? "success" : "default"}
          />
        ),
      },
      {
        field: "actions",
        headerName: "จัดการสถานะ",
        sortable: false,
        filterable: false,
        minWidth: 160,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<UserRow>) => {
          const u = params.row;
          return (
            <button
              onClick={() => setToggleTarget(u)}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1 ${
                u.isActive
                  ? "border-rose-200 bg-white hover:bg-rose-50 text-rose-600"
                  : "border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-600"
              }`}
            >
              {u.isActive ? (
                <>
                  <BlockOutlinedIcon sx={{ fontSize: 14 }} />
                  ปิดบัญชีชั่วคราว
                </>
              ) : (
                <>
                  <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 14 }} />
                  เปิดใช้งานบัญชี
                </>
              )}
            </button>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            การจัดการผู้ใช้งานในระบบ
          </h1>
          <p className="text-slate-500 text-sm">
            จัดการบัญชีผู้ใช้ สลับเปิด/ปิดสถานะ และมอบหมายสิทธิ์ Admin หรือ Staff
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError("");
              setNewUser({ ...BLANK_USER });
              setShowAddForm(!showAddForm);
            }}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <PersonAddOutlinedIcon sx={{ fontSize: 16 }} />
            {showAddForm ? "ปิดฟอร์ม" : "เพิ่มผู้ใช้งานใหม่"}
          </button>

          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton
              onClick={loadUsers}
              sx={{
                p: 1.2,
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                "&:hover": { backgroundColor: "#f8fafc" },
              }}
            >
              <RefreshIcon
                sx={{
                  fontSize: 18,
                  color: loading ? "#6366f1" : "#64748b",
                  animation: loading ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateUser}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md animate-in slide-in-from-top-4 duration-300 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">สร้างบัญชีผู้ใช้งานใหม่</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕ ยกเลิก
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">ชื่อผู้ใช้งาน (Username) *</label>
              <input
                required
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="เช่น somchai_123"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">รหัสผ่าน (Password) *</label>
              <input
                required
                type="password"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="ระบุรหัสผ่าน..."
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">ชื่อแสดงตัวตน (Display Name) *</label>
              <input
                required
                type="text"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="เช่น สมชาย ใจดี"
                value={newUser.displayName}
                onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500">สิทธิ์ในระบบ (Role) *</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-semibold"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="staff">Staff (ดูสต็อก, จัดส่ง, และสั่งขายทั่วไป)</option>
                <option value="owner">Admin/Owner (เข้าถึงได้หมดและดูต้นทุนสินค้าได้)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-3.5">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
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

      {/* Users DataGrid */}
      <MeeDataGrid
        rows={users}
        columns={columns}
        loading={loading}
        quickFilterPlaceholder="ค้นหาชื่อแสดงตน, Username, สิทธิ์..."
        autoHeight
      />

      {/* Confirm Toggle User Status Dialog */}
      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.isActive ? "ยืนยันการปิดบัญชีผู้ใช้" : "ยืนยันการเปิดใช้งานบัญชี"}
        message={`คุณต้องการ ${
          toggleTarget?.isActive ? "ปิดการใช้งาน" : "เปิดใช้งาน"
        } บัญชีของ "${toggleTarget?.displayName}" (@${toggleTarget?.username}) หรือไม่?`}
        confirmText={toggleTarget?.isActive ? "ปิดบัญชี" : "เปิดใช้งาน"}
        cancelText="ยกเลิก"
        isDestructive={toggleTarget?.isActive}
        onConfirm={confirmToggleActive}
        onClose={() => setToggleTarget(null)}
      />
    </div>
  );
}
