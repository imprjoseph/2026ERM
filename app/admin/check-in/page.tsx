import { requireChatGPTUser } from "../../chatgpt-auth";import CheckInPage from "../../../components/CheckInPage";
export const dynamic="force-dynamic";
export default async function Page(){if(process.env.NODE_ENV==="production")await requireChatGPTUser("/admin/check-in");return <CheckInPage/>}
