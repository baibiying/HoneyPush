import { redirect } from "next/navigation";

/** 表现战报已并入首页冒险地图，保留旧链接跳转 */
export default function PerformancePage() {
  redirect("/?scene=performance");
}
