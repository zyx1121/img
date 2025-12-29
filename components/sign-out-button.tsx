"use client";

import { LogOut } from "lucide-react";

export function SignOutButton() {
  const handleClick = () => {
    // 觸發登出事件，讓 UploadProvider 立即清除用戶狀態
    window.dispatchEvent(new CustomEvent("signOut"));
  };

  return (
    <button
      type="submit"
      className="w-full cursor-pointer"
      onClick={handleClick}
    >
      <LogOut className="mr-2 h-4 w-4" />
      登出
    </button>
  );
}

