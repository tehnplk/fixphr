"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toggleUserActive, updateUserRole } from "./actions";
import styles from "./page.module.css";

export type ManageUserRow = {
  id: number;
  fullname: string;
  providerId: string;
  organizations: { hcode: string; hname: string }[];
  role: string;
  loginCount: number;
  lastActivity: string;
  isActive: boolean;
};

type RoleOption = { value: string; label: string };

const EMPTY_FILTERS = { name: "", hcode: "", hname: "", role: "" };

function includesText(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export default function ManageUserTable({
  roleFilterOptions,
  roleOptions,
  rows,
}: {
  roleFilterOptions: RoleOption[];
  roleOptions: RoleOption[];
  rows: ManageUserRow[];
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const hasFilter = Object.values(filters).some((value) => value.trim() !== "");

  /* กรองในหน่วยความจำทันทีที่พิมพ์ ข้อมูลชุดนี้ไม่กี่สิบแถวจึงไม่ต้องยิงกลับ server */
  const visibleRows = useMemo(() => {
    const name = filters.name.trim();
    const hcode = filters.hcode.trim();
    const hname = filters.hname.trim();

    return rows.filter((row) => {
      if (filters.role && row.role !== filters.role) return false;
      if (name && !includesText(row.fullname, name)) return false;
      if (hcode && !row.organizations.some((org) => includesText(org.hcode, hcode))) return false;
      if (hname && !row.organizations.some((org) => includesText(org.hname, hname))) return false;
      return true;
    });
  }, [filters, rows]);

  const update = (key: keyof typeof EMPTY_FILTERS) => (
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((previous) => ({ ...previous, [key]: event.target.value }));
    }
  );

  return (
    <>
      <div className={styles.filterBar}>
        <label className={styles.filterField}>
          <span>ชื่อ-สกุล</span>
          <input
            onChange={update("name")}
            placeholder="พิมพ์บางส่วนได้"
            type="search"
            value={filters.name}
          />
        </label>
        <label className={styles.filterField}>
          <span>รหัสหน่วยบริการ</span>
          <input
            onChange={update("hcode")}
            placeholder="เช่น 07602"
            type="search"
            value={filters.hcode}
          />
        </label>
        <label className={styles.filterField}>
          <span>ชื่อหน่วยบริการ</span>
          <input
            onChange={update("hname")}
            placeholder="พิมพ์บางส่วนได้"
            type="search"
            value={filters.hname}
          />
        </label>
        <label className={styles.filterField}>
          <span>สิทธิ์</span>
          <select onChange={update("role")} value={filters.role}>
            <option value="">ทุกสิทธิ์</option>
            {roleFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.filterActions}>
          <span className={styles.filterResult}>
            <Search aria-hidden="true" />
            พบ {visibleRows.length} รายการ
          </span>
          {hasFilter ? (
            <button
              className={styles.filterReset}
              onClick={() => setFilters(EMPTY_FILTERS)}
              type="button"
            >
              ล้างตัวกรอง
            </button>
          ) : null}
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <p className={styles.empty}>ไม่พบผู้ใช้ที่ตรงกับตัวกรอง</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>ชื่อ-สกุล</th>
                <th>ProviderID</th>
                <th>หน่วยบริการ</th>
                <th>สิทธิ์</th>
                <th>เข้าระบบ</th>
                <th>ล่าสุด</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id} className={row.isActive ? undefined : styles.inactive}>
                  <td>{index + 1}</td>
                  <td className={styles.name}>{row.fullname || "-"}</td>
                  <td className={styles.mono}>{row.providerId}</td>
                  <td>
                    {row.organizations.length === 0 ? (
                      "-"
                    ) : (
                      <ul className={styles.orgList}>
                        {row.organizations.map((organization, orgIndex) => (
                          <li key={`${organization.hcode}-${orgIndex}`}>
                            <span className={styles.mono}>{organization.hcode || "-"}</span>
                            {organization.hname ? (
                              <span className={styles.hname}> {organization.hname}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <form action={updateUserRole} className={styles.roleForm}>
                      <input type="hidden" name="id" value={row.id} />
                      <select name="role" defaultValue={row.role}>
                        {roleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button type="submit">บันทึก</button>
                    </form>
                  </td>
                  <td className={styles.center}>{row.loginCount}</td>
                  <td>{row.lastActivity}</td>
                  <td>
                    <form action={toggleUserActive}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className={row.isActive ? styles.activeBtn : styles.inactiveBtn}
                      >
                        {row.isActive ? "ใช้งานได้" : "ถูกระงับ"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
