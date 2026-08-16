import { DialogueDetail } from "../../../components/EventDetailPages";
export default async function Page({params}:{params:Promise<{year:string}>}){const{year}=await params;return <DialogueDetail year={year}/>}
