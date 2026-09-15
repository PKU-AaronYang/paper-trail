"use client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
export function UsageGuide({ open, onClose, onFeedback }: { open: boolean; onClose: () => void; onFeedback: () => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="share-dialog">
        <DialogTitle>稿迹使用说明</DialogTitle>
        <DialogDescription>手动记录进展，让每一轮投稿都有迹可循</DialogDescription>
        <div className="usage-guide">
          <section><h3>联系作者</h3><p>有问题或想增加功能？<button type="button" className="text-button" onClick={()=>{onClose();onFeedback();}}>反馈与建议</button> · yangzw9615@163.com</p></section>
          <section>
            <h3>1. 新建与查找</h3>
            <p>
              点击「新建投稿」，填写标题、期刊和当前状态。关键词用中文或英文逗号分隔，可在列表、看板展示，并通过搜索查找。
            </p>
          </section>
          <section>
            <h3>2. 查看分类</h3>
            <p>
              「需要处理」只包含准备中和返修；「审稿中」包含已投稿、编辑处理中、外审中和修回已提交；「已归档」包含已接收、已发表、已拒稿和已撤稿。归档记录仍可编辑、改投和分享。
            </p>
          </section>
          <section>
            <h3>3. 维护时间线</h3>
            <p>
              修改状态、期刊、轮次或填写本次说明，保存时会新增节点。「补录节点」可记录历史进展，节点保存立即生效。点击节点「编辑」可修改或删除；删除需确认，当前状态随剩余最新节点更新。若删除最后一个节点，则保留稿件当前状态。
            </p>
          </section>
          <section>
            <h3>4. 分享进度</h3>
            <p>
              点击「分享进度」生成已保存记录的只读快照，或导出 PNG /
              SVG。默认隐藏标题和期刊；作者、稿号、关键词、备注不在快照中。分享链接不会自动更新。
            </p>
          </section>
          <section>
            <h3>5. 备份与换电脑</h3>
            <p>
              「数据与备份」→
              导出迁移包，将文件传到新电脑再导入。可合并去重或替换恢复，冲突逐篇选择。误导入可使用「恢复上次导入前的数据」。
            </p>
          </section>
          <section>
            <h3>6. 网站更新与数据</h3>
            <p>
              记录保存在当前浏览器，不上传到
              GitHub。同一网站地址、同一浏览器下更新代码会继续使用原记录。清除网站数据、换浏览器或设备不会自动保留，请先导出迁移包。不要把个人迁移文件上传到公开仓库。
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
