"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogIn, LogOut, Upload, UserCog } from "lucide-react";
import { logoutAction } from "./auth-actions";
import styles from "./AppNav.module.css";

export type NavUser = {
  name: string;
  initial: string;
  hcode: string | null;
  canManage: boolean;
};

export default function AppNav({ user }: { user?: NavUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (pathname === "/login") return null;

  const isSummary = pathname.startsWith("/sum");

  return (
    <div className={styles.bar}>
      <nav aria-label="เมนูหลัก" className={styles.nav}>
        <Link
          aria-current={!isSummary ? "page" : undefined}
          className={!isSummary ? styles.active : undefined}
          href="/amp"
        >
          หน้าแรก
        </Link>
        <span aria-hidden="true">|</span>
        <Link
          aria-current={isSummary ? "page" : undefined}
          className={isSummary ? styles.active : undefined}
          href="/sum"
        >
          สรุป
        </Link>
      </nav>
      <div className={styles.right}>
        {user ? (
          <div className={styles.userMenu} ref={menuRef}>
            <button
              type="button"
              className={styles.profileButton}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span className={styles.avatar} aria-hidden="true">{user.initial}</span>
              <span className={styles.userName}>{user.name}</span>
              {user.hcode ? <span className={styles.userHcode}>{user.hcode}</span> : null}
              <ChevronDown aria-hidden="true" className={open ? styles.chevronOpen : undefined} />
            </button>
            {open ? (
              <div className={styles.dropdown} role="menu">
                {user.canManage ? (
                  <>
                    <Link href="/upload" role="menuitem" className={styles.dropdownItem}>
                      <Upload aria-hidden="true" />
                      อัปโหลดข้อมูล
                    </Link>
                    <Link href="/manage-user" role="menuitem" className={styles.dropdownItem}>
                      <UserCog aria-hidden="true" />
                      จัดการผู้ใช้
                    </Link>
                  </>
                ) : null}
                <form action={logoutAction}>
                  <button type="submit" role="menuitem" className={`${styles.dropdownItem} ${styles.logoutItem}`}>
                    <LogOut aria-hidden="true" />
                    ออกจากระบบ
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className={styles.login}>
            <LogIn aria-hidden="true" />
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </div>
  );
}
