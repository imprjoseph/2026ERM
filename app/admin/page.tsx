import { requireChatGPTUser } from "../chatgpt-auth";import AdminDashboard from "../../components/AdminDashboard";
export const dynamic="force-dynamic";
export default async function Page(){const user=process.env.NODE_ENV!=="production"?{displayName:"本機預覽管理者",email:"local-preview@example.invalid"}:await requireChatGPTUser("/admin");return <AdminDashboard adminName={user.displayName||user.email}/>}
