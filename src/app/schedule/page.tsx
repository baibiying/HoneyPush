import { redirect } from "next/navigation";

/** 兼容旧链接：/schedule 重定向到首页 */
export default function ScheduleRedirectPage() {
  redirect("/");
}
