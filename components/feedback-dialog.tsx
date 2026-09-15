"use client";
import { useState } from "react";
import { Mail, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const feedbackEmail = "yangzw9615@163.com";
const template = "你好，我想反馈稿迹的使用问题或功能建议。\n\n反馈类型：使用问题 / 功能建议\n问题或建议：\n操作步骤：\n期望的效果：\n实际出现的情况：\n设备与浏览器（可选）：\n\n如需截图，我会自行附上并遮盖私人信息。";
const mailto = `mailto:${feedbackEmail}?subject=${encodeURIComponent("稿迹 Paper Trail｜问题反馈与功能建议")}&body=${encodeURIComponent(template)}`;

export function FeedbackDialog({open,onClose}:{open:boolean;onClose:()=>void}) {
  const [message,setMessage] = useState("");
  return <Dialog open={open} onOpenChange={value=>{if(!value){setMessage("");onClose();}}}><DialogContent className="share-dialog">
    <DialogTitle>反馈与建议</DialogTitle>
    <DialogDescription>遇到使用问题，或希望增加新功能？欢迎发邮件联系作者。</DialogDescription>
    <label className="form-field">联系邮箱<Input readOnly value={feedbackEmail} onFocus={e=>e.target.select()}/></label>
    <div className="share-actions"><a className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" href={mailto}><Mail size={16}/>写邮件反馈</a><Button variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(feedbackEmail);setMessage("邮箱已复制");}catch{setMessage("无法自动复制，请选中上方邮箱后手动复制");}}}><Copy/>复制邮箱</Button></div>
    <div className="usage-guide"><section><h3>反馈时可以告诉我</h3><p>你想实现什么、进行了哪些操作、实际出现什么情况。功能建议也可以直接描述使用场景。</p></section><section><h3>点击后没有打开邮箱？</h3><p>「写邮件反馈」会调用设备上的邮件应用，并预填主题和模板；邮件仍需你检查后手动发送。也可以复制邮箱，在网页版邮箱中新建邮件。</p></section><p>不会自动发送你的论文记录或迁移包。截图请自行添加，并遮盖不希望公开的内容。</p></div>
    <output aria-live="polite" className="subtle">{message}</output>
  </DialogContent></Dialog>;
}
