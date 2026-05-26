"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  DBCategory
} from "@/lib/dbActions";

const PRESET_COLORS = [
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#f43f5e", label: "Rose" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#10b981", label: "Emerald" },
  { hex: "#14b8a6", label: "Teal" },
  { hex: "#0ea5e9", label: "Sky" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#64748b", label: "Slate" },
];

export default function CategoryManager() {
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal control
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openAddModal = (pId: string = "") => {
    setEditingId(null);
    setName("");
    setParentId(pId);
    setCode("");
    setColor("#6366f1");
    setError("");
    setSuccessMsg("");
    setIsOpen(true);
  };

  const openEditModal = (cat: DBCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setParentId(cat.parentId || "");
    setCode(cat.code || "");
    setColor(cat.color);
    setError("");
    setSuccessMsg("");
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("กรุณากรอกชื่อหมวดหมู่");
      return;
    }
    setError("");
    setSuccessMsg("");

    startTransition(async () => {
      let success = false;
      if (editingId) {
        success = await updateCategory(editingId, { name, code, color });
      } else {
        success = await createCategory({
          name,
          parentId: parentId || null,
          code,
          color,
        });
      }

      if (success) {
        setSuccessMsg(editingId ? "แก้ไขหมวดหมู่สำเร็จ!" : "เพิ่มหมวดหมู่สำเร็จ!");
        setTimeout(() => {
          setIsOpen(false);
          void loadData();
        }, 800);
      } else {
        setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    });
  };

  const handleDelete = async (cat: DBCategory) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const hasProducts = cat.productCount > 0;

    if (hasChildren) {
      alert(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้ เนื่องจากยังมีหมวดหมู่ย่อยอยู่ภายใน`);
      return;
    }
    if (hasProducts) {
      alert(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้ เนื่องจากยังมีสินค้าในหมวดหมู่นี้จำนวน ${cat.productCount} ชิ้น`);
      return;
    }

    if (!confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`)) return;

    try {
      const res = await deleteCategory(cat.id);
      if (res.success) {
        void loadData();
      } else {
        alert(res.error || "เกิดข้อผิดพลาดในการลบหมวดหมู่");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            จัดการหมวดหมู่สินค้า
          </h1>
          <p className="text-slate-500 text-sm mt-1">จัดการหมวดหมู่สินค้าแบบ 2 ระดับเพื่อจัดระเบียบและค้นหาได้ง่ายขึ้น</p>
        </div>

        <button
          onClick={() => openAddModal("")}
          className="py-2.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มหมวดหมู่หลัก
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-16 flex flex-col items-center gap-3 text-slate-400">
          <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm font-medium">ยังไม่มีหมวดหมู่สินค้า</p>
          <p className="text-xs">กดปุ่มด้านบนเพื่อเพิ่มหมวดหมู่สินค้าชิ้นแรก</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {categories.map((parent) => (
            <div
              key={parent.id}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col gap-4"
            >
              {/* Parent Category Row */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: parent.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{parent.name}</h3>
                      {parent.code && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {parent.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      สินค้าทั้งหมดในหมวดหมู่นี้: <strong className="text-slate-600">{parent.productCount}</strong> ชิ้น
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAddModal(parent.id)}
                    className="py-1.5 px-3 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    เพิ่มหมวดหมู่ย่อย
                  </button>
                  <button
                    onClick={() => openEditModal(parent)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                    title="แก้ไข"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(parent)}
                    disabled={parent.productCount > 0 || (parent.children && parent.children.length > 0)}
                    className={`p-2 rounded-xl transition-all ${
                      parent.productCount > 0 || (parent.children && parent.children.length > 0)
                        ? "text-slate-200 cursor-not-allowed"
                        : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    }`}
                    title={
                      parent.productCount > 0 || (parent.children && parent.children.length > 0)
                        ? "ไม่สามารถลบได้เนื่องจากมีสินค้าหรือหมวดหมู่ย่อย"
                        : "ลบหมวดหมู่"
                    }
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Child Categories */}
              {parent.children && parent.children.length > 0 && (
                <div className="border-t border-slate-100/80 pt-4 pl-4 sm:pl-6 flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">หมวดหมู่ย่อย</span>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {parent.children.map((child) => (
                      <div
                        key={child.id}
                        className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: child.color }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-700 text-sm truncate">{child.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {child.code ? `${child.code} • ` : ""}{child.productCount} สินค้า
                            </p>
                          </div>
                        </div>

                        {/* Child Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => openEditModal(child)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                            title="แก้ไข"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(child)}
                            disabled={child.productCount > 0}
                            className={`p-1.5 rounded-lg transition-all ${
                              child.productCount > 0
                                ? "text-slate-200 cursor-not-allowed"
                                : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            }`}
                            title={child.productCount > 0 ? "ไม่สามารถลบได้เนื่องจากมีสินค้า" : "ลบ"}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="font-bold text-slate-800 text-lg">
                {editingId ? "แก้ไขหมวดหมู่" : parentId ? "เพิ่มหมวดหมู่ย่อย" : "เพิ่มหมวดหมู่หลัก"}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Parent display if child */}
              {parentId && !editingId && (
                <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-3 text-xs flex items-center gap-2 text-indigo-700">
                  <span className="font-bold">หมวดหมู่หลัก:</span>
                  <span>{categories.find((c) => c.id === parentId)?.name}</span>
                </div>
              )}

              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">ชื่อหมวดหมู่ <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="เช่น เสื้อผ้าแฟชั่น, เครื่องดื่ม"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50 focus:bg-white"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Code field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">รหัสหมวดหมู่ (ถ้ามี)</label>
                <input
                  type="text"
                  placeholder="เช่น CAT01"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50 focus:bg-white font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              {/* Color field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600">สีหมวดหมู่</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent flex-shrink-0"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-slate-50/50 focus:bg-white font-mono text-center"
                    placeholder="#ffffff"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>

                {/* Preset Colors */}
                <div className="grid grid-cols-6 gap-2 pt-2">
                  {PRESET_COLORS.map((pc) => (
                    <button
                      key={pc.hex}
                      type="button"
                      onClick={() => setColor(pc.hex)}
                      className={`h-7 rounded-xl border relative transition-all ${
                        color.toLowerCase() === pc.hex.toLowerCase()
                          ? "border-slate-800 scale-105 shadow-sm"
                          : "border-slate-100 hover:scale-105"
                      }`}
                      style={{ backgroundColor: pc.hex }}
                      title={pc.label}
                    >
                      {color.toLowerCase() === pc.hex.toLowerCase() && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-2 text-rose-600 text-xs">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-2 text-emerald-600 text-xs">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {successMsg}
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-all active:scale-[0.98]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                      กำลังบันทึก...
                    </>
                  ) : (
                    "บันทึก"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
